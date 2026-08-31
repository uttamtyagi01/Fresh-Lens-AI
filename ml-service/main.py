from fastapi import FastAPI, File, UploadFile, HTTPException
from PIL import Image
from transformers import AutoModelForImageClassification
import torch
import torchvision.transforms as transforms
import io


app = FastAPI(
    title="FreshLens ML Service",
    version="1.0.0",
)


# --------------------------------------------------
# MODEL
# --------------------------------------------------

MODEL_NAME = "Dhahlan2000/freshness_detector_updated"

print("Loading FreshLens model...")

model = AutoModelForImageClassification.from_pretrained(
    MODEL_NAME
)

model.eval()

print("FreshLens model loaded successfully.")


# --------------------------------------------------
# IMAGE PREPROCESSING
# --------------------------------------------------

image_transform = transforms.Compose(
    [
        transforms.Resize(
            (224, 224)
        ),

        transforms.ToTensor(),

        transforms.Normalize(
            mean=[0.5, 0.5, 0.5],
            std=[0.5, 0.5, 0.5],
        ),
    ]
)


# --------------------------------------------------
# ROOT
# --------------------------------------------------

@app.get("/")
async def root():

    return {
        "status": "online",
        "service": "FreshLens ML Service",
        "version": "1.0.0",
        "model": MODEL_NAME,
    }


# --------------------------------------------------
# HEALTH
# --------------------------------------------------

@app.get("/health")
async def health():

    return {
        "status": "healthy",
        "model_loaded": True,
    }


# --------------------------------------------------
# PREDICT
# --------------------------------------------------

@app.post("/predict")
async def predict(
    image: UploadFile = File(...)
):

    try:

        # Read uploaded image
        contents = await image.read()

        food_image = Image.open(
            io.BytesIO(contents)
        ).convert("RGB")


        # --------------------------------------------------
        # PREPROCESS
        # --------------------------------------------------

        pixel_values = image_transform(
            food_image
        )

        # Add batch dimension
        pixel_values = pixel_values.unsqueeze(0)


        # --------------------------------------------------
        # MODEL INFERENCE
        # --------------------------------------------------

        with torch.no_grad():

            outputs = model(
                pixel_values=pixel_values
            )


        # --------------------------------------------------
        # PROBABILITIES
        # --------------------------------------------------

        probabilities = torch.softmax(
            outputs.logits,
            dim=-1
        )[0]


        # --------------------------------------------------
        # TOP 5 PREDICTIONS
        # --------------------------------------------------

        top_k = min(
            5,
            len(probabilities)
        )

        scores, indices = torch.topk(
            probabilities,
            k=top_k
        )


        predictions = []


        for score, index in zip(
            scores,
            indices
        ):

            index_value = index.item()

            label = model.config.id2label.get(
                index_value,
                str(index_value)
            )

            predictions.append(
                {
                    "label": label,
                    "confidence": round(
                        score.item() * 100,
                        2
                    )
                }
            )


        # --------------------------------------------------
        # BEST PREDICTION
        # --------------------------------------------------

        best_prediction = predictions[0]


        return {

            "success": True,

            "label": best_prediction["label"],

            "confidence": best_prediction[
                "confidence"
            ],

            "predictions": predictions,
        }


    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=f"Prediction failed: {str(e)}"
        )