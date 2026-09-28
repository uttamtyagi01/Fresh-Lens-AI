from __future__ import annotations

import pandas as pd
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent / "data" / "shelf_life_dataset.csv"

REQUIRED = {
    "sample_id",
    "observation_date",
    "food_type",
    "quality_endpoint_date",
    "remaining_shelf_life_days",
}


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"Dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    missing = REQUIRED - set(df.columns)
    if missing:
        raise SystemExit(f"Missing required columns: {sorted(missing)}")

    df["observation_date"] = pd.to_datetime(df["observation_date"], errors="coerce")
    df["quality_endpoint_date"] = pd.to_datetime(
        df["quality_endpoint_date"], errors="coerce"
    )

    mask = df["observation_date"].notna() & df["quality_endpoint_date"].notna()
    df.loc[mask, "remaining_shelf_life_days"] = (
        df.loc[mask, "quality_endpoint_date"] - df.loc[mask, "observation_date"]
    ).dt.total_seconds() / 86400.0

    invalid = df["remaining_shelf_life_days"].notna() & (
        pd.to_numeric(df["remaining_shelf_life_days"], errors="coerce") < 0
    )
    if invalid.any():
        raise SystemExit(
            "Found rows where quality_endpoint_date is before observation_date. "
            "Fix those observations first."
        )

    df["remaining_shelf_life_days"] = pd.to_numeric(
        df["remaining_shelf_life_days"], errors="coerce"
    ).round(2)

    df["observation_date"] = df["observation_date"].dt.strftime("%Y-%m-%d")
    df["quality_endpoint_date"] = df["quality_endpoint_date"].dt.strftime("%Y-%m-%d")

    df.to_csv(DATA_PATH, index=False)
    labeled = int(df["remaining_shelf_life_days"].notna().sum())
    samples = int(df.loc[df["remaining_shelf_life_days"].notna(), "sample_id"].nunique())
    print(f"Updated dataset: {labeled} labeled observations across {samples} samples.")


if __name__ == "__main__":
    main()
