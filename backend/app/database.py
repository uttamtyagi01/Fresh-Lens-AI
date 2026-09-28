from __future__ import annotations
import sqlite3
from pathlib import Path
from typing import Any, Optional


# ============================================================
# FreshLens AI - Historical Analysis Database
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "freshlens.db"

DATA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(
        DB_PATH,
        check_same_thread=False,
    )

    connection.row_factory = sqlite3.Row

    return connection


def init_database() -> None:
    connection = get_connection()

    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                food_name TEXT NOT NULL,

                freshness_status TEXT,

                freshness_score REAL,

                confidence REAL,

                spoilage_probability REAL,

                temperature REAL,

                humidity REAL,

                storage_method TEXT,

                food_age_days REAL,

                predicted_shelf_life REAL,

                recommendation TEXT,

                image_path TEXT,

                timestamp TEXT NOT NULL
            )
            """
        )

        connection.commit()

    finally:
        connection.close()


def save_scan(
    *,
    food_name: str,
    freshness_status: Optional[str],
    freshness_score: Optional[float],
    confidence: Optional[float],
    spoilage_probability: Optional[float],
    temperature: Optional[float],
    humidity: Optional[float],
    storage_method: Optional[str],
    food_age_days: Optional[float],
    predicted_shelf_life: Optional[float],
    recommendation: Optional[str],
    image_path: Optional[str],
    timestamp: str,
) -> int:

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            INSERT INTO scan_history (
                food_name,
                freshness_status,
                freshness_score,
                confidence,
                spoilage_probability,
                temperature,
                humidity,
                storage_method,
                food_age_days,
                predicted_shelf_life,
                recommendation,
                image_path,
                timestamp
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                food_name,
                freshness_status,
                freshness_score,
                confidence,
                spoilage_probability,
                temperature,
                humidity,
                storage_method,
                food_age_days,
                predicted_shelf_life,
                recommendation,
                image_path,
                timestamp,
            ),
        )

        connection.commit()

        return int(cursor.lastrowid)

    finally:
        connection.close()


def get_scan_history(
    limit: int = 100,
) -> list[dict[str, Any]]:

    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                id,
                food_name,
                freshness_status,
                freshness_score,
                confidence,
                spoilage_probability,
                temperature,
                humidity,
                storage_method,
                food_age_days,
                predicted_shelf_life,
                recommendation,
                image_path,
                timestamp
            FROM scan_history
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

        return [
            dict(row)
            for row in rows
        ]

    finally:
        connection.close()