from __future__ import annotations

import requests
from fastapi import APIRouter, HTTPException, Query


router = APIRouter(
    prefix="/weather",
    tags=["Weather"],
)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


@router.get("/current")
async def get_current_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    """Return current Open-Meteo conditions for a selected demo location."""

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "apparent_temperature,"
            "precipitation,"
            "weather_code,"
            "wind_speed_10m"
        ),
        "timezone": "auto",
    }

    try:
        response = requests.get(
            OPEN_METEO_URL,
            params=params,
            timeout=(4, 6),
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch live weather: {exc}",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail="Weather service returned invalid JSON.",
        ) from exc

    current = payload.get("current") or {}

    temperature = current.get("temperature_2m")
    humidity = current.get("relative_humidity_2m")

    if temperature is None or humidity is None:
        raise HTTPException(
            status_code=502,
            detail="Weather service returned incomplete current conditions.",
        )

    return {
        "success": True,
        "source": "Open-Meteo",
        "latitude": payload.get("latitude", latitude),
        "longitude": payload.get("longitude", longitude),
        "timezone": payload.get("timezone"),
        "weather": {
            "temperature": temperature,
            "temperature_c": temperature,
            "humidity": humidity,
            "humidity_percent": humidity,
            "apparent_temperature": current.get("apparent_temperature"),
            "precipitation": current.get("precipitation"),
            "weather_code": current.get("weather_code"),
            "wind_speed_kmh": current.get("wind_speed_10m"),
        },
        "units": {
            "temperature": "°C",
            "humidity": "%",
            "apparent_temperature": "°C",
            "precipitation": "mm",
            "wind_speed_kmh": "km/h",
        },
    }
