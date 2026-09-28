from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "shelf_life_dataset.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "shelf_life_xgb.joblib"
META_PATH = MODEL_DIR / "shelf_life_xgb_metadata.json"

TARGET = "remaining_shelf_life_days"
GROUP = "sample_id"
DROP_COLUMNS = {TARGET, GROUP, "observation_date", "quality_endpoint_date"}

CATEGORICAL = ["food_type", "storage_method"]
NUMERIC = [
    "freshness_score",
    "spoilage_probability",
    "temperature_c",
    "humidity_percent",
    "food_age_days",
    "historical_avg_temp_c",
    "historical_avg_humidity_percent",
    "storage_changes_24h",
]

MIN_LABELED_ROWS = 30
MIN_UNIQUE_SAMPLES = 10


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"Dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    required = set(NUMERIC) | set(CATEGORICAL) | {TARGET, GROUP}
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"Missing columns: {sorted(missing)}")

    df[TARGET] = pd.to_numeric(df[TARGET], errors="coerce")
    labeled = df[df[TARGET].notna()].copy()

    if len(labeled) < MIN_LABELED_ROWS:
        raise SystemExit(
            f"Only {len(labeled)} labeled rows found. "
            f"Need at least {MIN_LABELED_ROWS} real observed rows before training."
        )

    unique_samples = labeled[GROUP].astype(str).nunique()
    if unique_samples < MIN_UNIQUE_SAMPLES:
        raise SystemExit(
            f"Only {unique_samples} unique samples found. "
            f"Need at least {MIN_UNIQUE_SAMPLES} unique physical food samples "
            "to reduce sample-level leakage."
        )

    X = labeled[NUMERIC + CATEGORICAL].copy()
    y = labeled[TARGET].astype(float)
    groups = labeled[GROUP].astype(str)

    splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups=groups))

    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

    numeric_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median", add_indicator=True, keep_empty_features=True)),
    ])
    categorical_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer([
        ("num", numeric_pipe, NUMERIC),
        ("cat", categorical_pipe, CATEGORICAL),
    ])

    model = XGBRegressor(
        objective="reg:squarederror",
        n_estimators=400,
        learning_rate=0.04,
        max_depth=5,
        min_child_weight=2,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_alpha=0.05,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=4,
        tree_method="hist",
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", model),
    ])

    pipeline.fit(X_train, y_train)
    predictions = np.maximum(0.0, pipeline.predict(X_test))

    mae = mean_absolute_error(y_test, predictions)
    rmse = mean_squared_error(y_test, predictions) ** 0.5
    r2 = r2_score(y_test, predictions) if len(y_test) >= 2 else float("nan")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)

    metadata = {
        "model": "XGBRegressor",
        "target": TARGET,
        "features": NUMERIC + CATEGORICAL,
        "training_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "unique_samples": int(unique_samples),
        "mae_days": round(float(mae), 4),
        "rmse_days": round(float(rmse), 4),
        "r2": round(float(r2), 4) if np.isfinite(r2) else None,
        "group_split": True,
        "prototype_note": "Metrics are dataset-specific; do not present as food-safety guarantees.",
    }
    META_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print("\nShelf-life XGBoost model trained successfully.")
    print(f"Model: {MODEL_PATH}")
    print(f"Training rows: {len(X_train)}")
    print(f"Test rows: {len(X_test)}")
    print(f"Unique physical samples: {unique_samples}")
    print(f"MAE: {mae:.3f} days")
    print(f"RMSE: {rmse:.3f} days")
    print(f"R²: {r2:.3f}" if np.isfinite(r2) else "R²: N/A")


if __name__ == "__main__":
    main()
