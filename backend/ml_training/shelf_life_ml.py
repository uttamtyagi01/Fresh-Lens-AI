from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "shelf_life_xgb.joblib"
FEATURES = [
    "freshness_score",
    "spoilage_probability",
    "temperature_c",
    "humidity_percent",
    "food_age_days",
    "historical_avg_temp_c",
    "historical_avg_humidity_percent",
    "storage_changes_24h",
    "food_type",
    "storage_method",
]

_MODEL = None


def is_model_ready() -> bool:
    return MODEL_PATH.exists()


def load_model() -> Any:
    global _MODEL
    if _MODEL is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Shelf-life model not found: {MODEL_PATH}"
            )
        _MODEL = joblib.load(MODEL_PATH)
    return _MODEL


def predict_remaining_shelf_life(features: dict[str, Any]) -> float:
    row = {key: features.get(key) for key in FEATURES}
    frame = pd.DataFrame([row])
    prediction = float(load_model().predict(frame)[0])
    return round(max(0.0, prediction), 2)
