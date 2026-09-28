from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.database import get_connection


router = APIRouter(
    prefix="/history",
    tags=["Historical Database"],
)


# ============================================================
# GET HISTORY
# ============================================================

@router.get("")
async def get_history(
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
):
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

        history = [
            dict(row)
            for row in rows
        ]

        return {
            "success": True,
            "count": len(history),
            "history": history,
        }

    finally:
        connection.close()


# ============================================================
# GET SINGLE HISTORY RECORD
# ============================================================

@router.get("/{scan_id}")
async def get_single_history(
    scan_id: int,
):
    connection = get_connection()

    try:
        row = connection.execute(
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
            WHERE id = ?
            """,
            (scan_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Historical scan not found.",
            )

        return {
            "success": True,
            "history": dict(row),
        }

    finally:
        connection.close()


# ============================================================
# DELETE SINGLE HISTORY RECORD
# ============================================================

@router.delete("/{scan_id}")
async def delete_history(
    scan_id: int,
):
    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            DELETE FROM scan_history
            WHERE id = ?
            """,
            (scan_id,),
        )

        connection.commit()

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Historical scan not found.",
            )

        return {
            "success": True,
            "message": "Historical scan deleted.",
            "id": scan_id,
        }

    finally:
        connection.close()


# ============================================================
# DELETE ALL HISTORY
# ============================================================

@router.delete("")
async def clear_history():
    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            DELETE FROM scan_history
            """
        )

        connection.commit()

        return {
            "success": True,
            "deleted_count": cursor.rowcount,
            "message": "Historical scan database cleared.",
        }

    finally:
        connection.close()