from __future__ import annotations

import csv
from datetime import date
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent / "data" / "shelf_life_dataset.csv"
FIELDS = [
    "sample_id",
    "observation_date",
    "food_type",
    "freshness_score",
    "spoilage_probability",
    "temperature_c",
    "humidity_percent",
    "storage_method",
    "food_age_days",
    "historical_avg_temp_c",
    "historical_avg_humidity_percent",
    "storage_changes_24h",
    "quality_endpoint_date",
    "remaining_shelf_life_days",
]


def ask(label: str, required: bool = False) -> str:
    while True:
        value = input(f"{label}: ").strip()
        if value or not required:
            return value
        print("This field is required.")


def ask_float(label: str, allow_blank: bool = True) -> str:
    while True:
        value = ask(label, required=not allow_blank)
        if value == "":
            return ""
        try:
            float(value)
            return value
        except ValueError:
            print("Enter a valid number or leave blank.")


def ask_date(label: str, allow_blank: bool = False) -> str:
    while True:
        value = ask(label, required=not allow_blank)
        if value == "":
            return ""
        try:
            date.fromisoformat(value)
            return value
        except ValueError:
            print("Use YYYY-MM-DD format.")


def main() -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

    print("\nFreshLens AI - Shelf-Life Observation Recorder")
    print(f"CSV: {DATA_PATH}")
    print("Leave unavailable numeric fields blank. Do not invent measurements.")
    print("Do not enter remaining shelf life unless it is based on an observed endpoint.\n")

    row = {
        "sample_id": ask("Sample ID (e.g. APPLE-001)", required=True),
        "observation_date": ask_date("Observation date (YYYY-MM-DD)"),
        "food_type": ask("Food type", required=True),
        "freshness_score": ask_float("Freshness score", allow_blank=False),
        "spoilage_probability": ask_float("Spoilage probability", allow_blank=False),
        "temperature_c": ask_float("Temperature °C"),
        "humidity_percent": ask_float("Humidity %"),
        "storage_method": ask("Storage method", required=True),
        "food_age_days": ask_float("Food age days", allow_blank=False),
        "historical_avg_temp_c": ask_float("Historical average temperature °C"),
        "historical_avg_humidity_percent": ask_float("Historical average humidity %"),
        "storage_changes_24h": ask_float("Storage changes in last 24h"),
        "quality_endpoint_date": ask_date(
            "Observed quality endpoint date (YYYY-MM-DD; leave blank until endpoint is known)",
            allow_blank=True,
        ),
        "remaining_shelf_life_days": "",
    }

    file_exists = DATA_PATH.exists() and DATA_PATH.stat().st_size > 0
    with DATA_PATH.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)

    print("\nSaved observation successfully.")
    print("Target remains blank until the quality endpoint is actually observed.")


if __name__ == "__main__":
    main()
