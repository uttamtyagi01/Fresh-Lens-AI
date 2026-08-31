from __future__ import annotations

import io
import json
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.services.analyzer import analyze_food


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
