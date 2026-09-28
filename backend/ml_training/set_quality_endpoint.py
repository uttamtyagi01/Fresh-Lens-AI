from __future__ import annotations

import csv
from datetime import date
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent / "data" / "shelf_life_dataset.csv"


def main() -> None:
    sample_id = input("Sample ID (e.g. APPLE-001): ").strip()
    endpoint = input("Observed quality endpoint date (YYYY-MM-DD): ").strip()
    if not sample_id or not endpoint:
        raise SystemExit("Sample ID and endpoint date are required.")
    try:
        date.fromisoformat(endpoint)
    except ValueError:
        raise SystemExit("Date must be YYYY-MM-DD.")

    with DATA_PATH.open("r", newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
        fields = handle.seek(0) or []

    if not rows:
        raise SystemExit("Dataset is empty.")

    updated = 0
    for row in rows:
        if row.get("sample_id", "").strip() == sample_id:
            row["quality_endpoint_date"] = endpoint
            updated += 1

    if not updated:
        raise SystemExit(f"No rows found for sample_id={sample_id}")

    # Preserve schema from the first row, but make sure required columns exist.
    fieldnames = list(rows[0].keys())
    with DATA_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Updated endpoint date for {updated} observation rows of {sample_id}.")
    print("Run label_shelf_life_dataset.py next to derive remaining_shelf_life_days.")


if __name__ == "__main__":
    main()
