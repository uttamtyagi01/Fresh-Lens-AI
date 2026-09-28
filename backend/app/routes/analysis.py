from __future__ import annotations

import io
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.services.analyzer import analyze_food
from app.database import UPLOAD_DIR, save_scan


router = APIRouter(
    prefix="/analysis",
    tags=["Food Analysis"],
)


def parse_optional_float(
    value: Optional[str],
    field_name: str,
) -> Optional[float]:
    if value is None or value.strip() == "":
        return None

    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must be a valid number.",
        ) from exc

    if field_name == "humidity" and not 0 <= number <= 100:
        raise HTTPException(
            status_code=422,
            detail="humidity must be between 0 and 100.",
        )

    return number


def parse_age_hours(
    age_hours: Optional[str],
    age_days: Optional[str],
) -> float:
    """
    Canonical backend representation is hours.

    Priority:
      1. age_hours
      2. age_days * 24
      3. 0
    """
    if age_hours is not None and age_hours.strip():
        try:
            number = float(age_hours)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail="age_hours must be a valid number.",
            ) from exc

        if number < 0:
            raise HTTPException(
                status_code=422,
                detail="age_hours cannot be negative.",
            )

        return min(number, 24.0 * 60.0)

    if age_days is not None and age_days.strip():
        try:
            number = float(age_days)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail="age_days must be a valid number.",
            ) from exc

        if number < 0:
            raise HTTPException(
                status_code=422,
                detail="age_days cannot be negative.",
            )

        return min(number * 24.0, 24.0 * 60.0)

    return 0.0


def parse_optional_json(
    value: Optional[str],
    field_name: str,
) -> Optional[Any]:
    if value is None or value.strip() == "":
        return None

    try:
        return json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} must be valid JSON.",
        ) from exc


@router.post("/analyze")
async def analyze(
    image: UploadFile = File(...),

    # --------------------------------------------------------
    # Multimodal environment inputs
    # --------------------------------------------------------
    temperature: Optional[str] = Form(None),
    humidity: Optional[str] = Form(None),
    storage_method: Optional[str] = Form(None),
    age_hours: Optional[str] = Form(None),
    age_days: Optional[str] = Form(None),

    # --------------------------------------------------------
    # Future/optional context
    # --------------------------------------------------------
    weather_data: Optional[str] = Form(None),
    iot_data: Optional[str] = Form(None),
    historical_conditions: Optional[str] = Form(None),
):
    # ========================================================
    # FILE VALIDATION
    # ========================================================

    if not image.content_type:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type.",
        )

    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed.",
        )

    contents = await image.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Empty image file.",
        )

    # ========================================================
    # IMAGE VALIDATION
    # ========================================================

    try:
        test_image = Image.open(io.BytesIO(contents))
        test_image.verify()

        food_image = Image.open(
            io.BytesIO(contents)
        ).convert("RGB")

    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file.",
        ) from exc

    # ========================================================
    # PARSE INPUTS
    # ========================================================

    parsed_temperature = parse_optional_float(
        temperature,
        "temperature",
    )

    parsed_humidity = parse_optional_float(
        humidity,
        "humidity",
    )

    parsed_age_hours = parse_age_hours(
        age_hours,
        age_days,
    )

    parsed_storage = (
        storage_method.strip()
        if storage_method and storage_method.strip()
        else "unknown"
    )

    parsed_weather_data = parse_optional_json(
        weather_data,
        "weather_data",
    )

    parsed_iot_data = parse_optional_json(
        iot_data,
        "iot_data",
    )

    parsed_historical_conditions = parse_optional_json(
        historical_conditions,
        "historical_conditions",
    )

    # ========================================================
    # DEBUG — proves exactly what reached the backend
    # ========================================================

    print("\n========== ANALYSIS REQUEST INPUTS ==========")
    print("temperature:", parsed_temperature)
    print("humidity:", parsed_humidity)
    print("storage_method:", parsed_storage)
    print("age_hours:", parsed_age_hours)
    print("age_days:", round(parsed_age_hours / 24.0, 2))
    print("weather_data:", bool(parsed_weather_data))
    print("iot_data:", bool(parsed_iot_data))
    print("historical_conditions:", bool(parsed_historical_conditions))
    print("=============================================\n")

    # ========================================================
    # ANALYSIS
    # ========================================================

    try:
        result = analyze_food(
            food_image,
            temperature=parsed_temperature,
            humidity=parsed_humidity,
            storage_method=parsed_storage,
            age_hours=parsed_age_hours,
            historical_conditions=parsed_historical_conditions,
            weather_data=(
                parsed_weather_data
                if isinstance(parsed_weather_data, dict)
                else None
            ),
            iot_data=(
                parsed_iot_data
                if isinstance(parsed_iot_data, dict)
                else None
            ),
        )

    except Exception as exc:
        print("ANALYSIS API ERROR:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail="Food analysis failed. Please try another image.",
        ) from exc

    # ========================================================
    # RESPONSE
    # ========================================================
        # ========================================================
    # SAVE ANALYSIS TO HISTORICAL DATABASE
    # ========================================================

    try:
        timestamp = datetime.now(
            timezone.utc
        ).isoformat()

        original_filename = (
            image.filename
            or "uploaded_image.jpg"
        )

        extension = (
            Path(original_filename).suffix
            or ".jpg"
        )

        history_filename = (
            f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
            f"{extension}"
        )

        saved_image_path = (
            UPLOAD_DIR / history_filename
        )

        saved_image_path.write_bytes(
            contents
        )

        # --------------------------------------------
        # Shelf-life value for database
        # --------------------------------------------

        shelf_data = result.get(
            "estimated_shelf_life_days"
        )

        predicted_shelf_life = None

        if isinstance(shelf_data, dict):
            minimum = shelf_data.get("min")
            maximum = shelf_data.get("max")

            if (
                isinstance(minimum, (int, float))
                and isinstance(maximum, (int, float))
            ):
                predicted_shelf_life = (
                    float(minimum) + float(maximum)
                ) / 2.0

            elif isinstance(
                minimum,
                (int, float),
            ):
                predicted_shelf_life = float(minimum)

        elif isinstance(
            shelf_data,
            (int, float),
        ):
            predicted_shelf_life = float(
                shelf_data
            )

        # --------------------------------------------
        # Save scan
        # --------------------------------------------

        history_id = save_scan(
            food_name=(
                result.get("food_class")
                or result.get("food_name")
                or "Unknown"
            ),

            freshness_status=(
                result.get(
                    "freshness_status"
                )
            ),

            freshness_score=(
                result.get(
                    "freshness_score"
                )
            ),

            confidence=(
                result.get(
                    "confidence"
                )
            ),

            spoilage_probability=(
                result.get(
                    "spoilage_probability"
                )
            ),

            temperature=(
                parsed_temperature
            ),

            humidity=(
                parsed_humidity
            ),

            storage_method=(
                parsed_storage
            ),

            food_age_days=round(
                parsed_age_hours / 24.0,
                2,
            ),

            predicted_shelf_life=(
                predicted_shelf_life
            ),

            recommendation=(
                result.get(
                    "recommendation"
                )
            ),

            image_path=str(
                saved_image_path
            ),

            timestamp=timestamp,
        )

        print(
            "HISTORICAL DATABASE SAVE SUCCESS:",
            history_id,
        )

    except Exception as history_error:
        # Database failure should NOT break
        # the working AI analysis response.
        print(
            "HISTORICAL DATABASE ERROR:",
            repr(history_error),
        )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "success": True,
        "filename": image.filename,
        "inputs": {
            "temperature": parsed_temperature,
            "humidity": parsed_humidity,
            "storage_method": parsed_storage,
            "age_hours": parsed_age_hours,
            "age_days": round(
                parsed_age_hours / 24.0,
                2,
            ),
        },
        "result": result,
    }
