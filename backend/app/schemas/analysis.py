from fastapi import APIRouter, File, UploadFile, HTTPException
from PIL import Image
import io

from app.services.analyzer import analyze_food

router = APIRouter(
    prefix="/analysis",
    tags=["Food Analysis"],
)


@router.post("/analyze")
async def analyze(image: UploadFile = File(...)):

    if not image.content_type:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type",
        )

    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed",
        )

    contents = await image.read()

    try:
        food_image = Image.open(io.BytesIO(contents))
        food_image.verify()
        food_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file",
        )

    result = analyze_food(food_image)

    return {
        "success": True,
        "filename": image.filename,
        "result": result,
    }