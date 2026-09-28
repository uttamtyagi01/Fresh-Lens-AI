from __future__ import annotations

import csv
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent / "data" / "shelf_life_dataset.csv"
BACKUP_PATH = DATA_PATH.with_suffix(".csv.before_v2_backup")

NEW_FIELDS = [
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

OLD_FIELDS = [
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
    "remaining_shelf_life_days",
]


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"Dataset not found: {DATA_PATH}")

    with DATA_PATH.open("r", newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    if not rows:
        raise SystemExit("Dataset has no data rows.")

    current_fields = set(rows[0].keys())
    if set(NEW_FIELDS).issubset(current_fields):
        print("Dataset is already on the v2 schema. Nothing changed.")
        return

    if not set(OLD_FIELDS).issubset(current_fields):
        raise SystemExit(
            "Dataset columns do not match the expected old schema. "
            f"Found: {sorted(current_fields)}"
        )

    DATA_PATH.replace(BACKUP_PATH)

    counters: dict[str, int] = {}
    new_rows: list[dict[str, str]] = []

    for old in rows:
        food = (old.get("food_type") or "Food").strip() or "Food"
        key = "".join(ch for ch in food.upper() if ch.isalnum()) or "FOOD"
        counters[key] = counters.get(key, 0) + 1
        sample_id = f"{key}-{counters[key]:03d}"

        new_rows.append(
            {
                "sample_id": sample_id,
                "observation_date": "",
                "food_type": food,
                "freshness_score": old.get("freshness_score", ""),
                "spoilage_probability": old.get("spoilage_probability", ""),
                "temperature_c": old.get("temperature_c", ""),
                "humidity_percent": old.get("humidity_percent", ""),
                "storage_method": old.get("storage_method", ""),
                "food_age_days": old.get("food_age_days", ""),
                "historical_avg_temp_c": old.get("historical_avg_temp_c", ""),
                "historical_avg_humidity_percent": old.get("historical_avg_humidity_percent", ""),
                "storage_changes_24h": old.get("storage_changes_24h", ""),
                "quality_endpoint_date": "",
                "remaining_shelf_life_days": old.get("remaining_shelf_life_days", ""),
            }
        )

    with DATA_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=NEW_FIELDS)
        writer.writeheader()
        writer.writerows(new_rows)

    print(f"Migrated {len(new_rows)} rows to the v2 schema.")
    print(f"Backup created: {BACKUP_PATH}")
    print("Fill observation_date for each sample before using endpoint-based labels.")


if __name__ == "__main__":
    main()
