from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/iot",
    tags=["IoT Sensor"]
)


class SensorReading(BaseModel):
    temperature: float = Field(
        ...,
        ge=-50,
        le=80,
        description="Temperature in Celsius"
    )

    humidity: float = Field(
        ...,
        ge=0,
        le=100,
        description="Relative humidity percentage"
    )

    storage_method: str = Field(
        default="unknown",
        description="Storage environment"
    )


@router.post("/sensor")
async def receive_sensor_reading(
    reading: SensorReading
):
    return {
        "success": True,
        "source": "IoT Sensor",
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "sensor": {
            "temperature": reading.temperature,
            "temperature_c": reading.temperature,
            "humidity": reading.humidity,
            "humidity_percent": reading.humidity,
            "storage_method": reading.storage_method,
        },
        "message": "IoT sensor reading received successfully."
    }