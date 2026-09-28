import base64
import io
import json
import math
import os
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import joblib
import numpy as np
import pandas as pd
import torch
from PIL import Image
from dotenv import load_dotenv
from fastai.vision.all import create_vision_model, resnet18
from huggingface_hub import hf_hub_download
from torchvision import transforms
from transformers import pipeline


# ============================================================
# FreshLens AI - Production-style ML analysis service
# ============================================================
# Features:
#   - Local food identification
#   - Local freshness classification
#   - Optional Gemini visual reasoning
#   - Temperature / humidity
#   - Storage method
#   - Food age
#   - Historical conditions
#   - Optional weather / IoT context
#   - Environmental risk
#   - Dynamic shelf-life estimate
#   - Spoilage probability + forecast
#   - Explainability
#   - Recommendations
#
# Research/prototype estimates only.
# Not a food-safety guarantee.
# ============================================================


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    "",
).strip()

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash",
).strip()

# Optional fallback model. Only used for non-quota failures
# if explicitly configured.
GEMINI_FALLBACK_MODEL = os.getenv(
    "GEMINI_FALLBACK_MODEL",
    "",
).strip()

# IMPORTANT:
# 429/quota is NOT retried.
# Temporary 500/503 errors get at most one retry.
GEMINI_MAX_RETRIES = 2
GEMINI_RETRY_DELAY_SECONDS = 2.0

MODEL_REPO = os.getenv(
    "FRESHNESS_MODEL_REPO",
    "nathansekar/food-freshness-detector",
)

MODEL_VERSION = os.getenv(
    "FRESHLENS_MODEL_VERSION",
    "prototype-v2",
)

gemini_client = None
gemini_available = False


if GEMINI_API_KEY:
    try:
        from google import genai

        gemini_client = genai.Client(
            api_key=GEMINI_API_KEY,
        )

        gemini_available = True

        print("Gemini client initialized successfully.")
        print("Gemini model:", GEMINI_MODEL)

    except Exception as exc:
        gemini_client = None
        gemini_available = False

        print(
            "Gemini initialization error:",
            str(exc),
        )
else:
    print(
        "GEMINI_API_KEY not found. "
        "FreshLens will use local models."
    )


# ============================================================
# FOOD BASELINE SHELF LIFE
# ============================================================

FOOD_SHELF_LIFE = {
    "Apple": {"min": 5, "max": 14},
    "Banana": {"min": 2, "max": 7},
    "Orange": {"min": 4, "max": 10},
    "Lemon": {"min": 5, "max": 14},
    "Strawberry": {"min": 1, "max": 4},
    "Pineapple": {"min": 2, "max": 6},
    "Mango": {"min": 2, "max": 7},
    "Tomato": {"min": 2, "max": 7},
    "Potato": {"min": 7, "max": 21},
    "Carrot": {"min": 7, "max": 21},
    "Guava": {"min": 2, "max": 5},
    "Fig": {"min": 2, "max": 5},
    "Custard Apple": {"min": 2, "max": 5},
    "Food": {"min": 1, "max": 5},
}


# ============================================================
# STORAGE PROFILES
# ============================================================

STORAGE_FACTORS = {
    "refrigerated": 0.72,
    "refrigerator": 0.72,
    "fridge": 0.72,
    "room temperature": 1.00,
    "room_temperature": 1.00,
    "counter": 1.05,
    "pantry": 1.08,
    "cool dry place": 1.10,
    "cool_dry": 1.10,
    "freezer": 0.35,
    "frozen": 0.35,
    "unknown": 1.00,
}


# ============================================================
# ENVIRONMENT PROFILES
# ============================================================
# Prototype heuristics only.

ENVIRONMENT_PROFILES = {
    "Apple": {"temp": (1, 8), "humidity": (85, 95)},
    "Banana": {"temp": (13, 18), "humidity": (60, 70)},
    "Orange": {"temp": (3, 10), "humidity": (85, 95)},
    "Lemon": {"temp": (4, 10), "humidity": (85, 95)},
    "Strawberry": {"temp": (0, 4), "humidity": (90, 95)},
    "Pineapple": {"temp": (7, 13), "humidity": (80, 90)},
    "Mango": {"temp": (10, 13), "humidity": (85, 95)},
    "Tomato": {"temp": (10, 15), "humidity": (85, 95)},
    "Potato": {"temp": (7, 10), "humidity": (90, 95)},
    "Carrot": {"temp": (0, 5), "humidity": (90, 95)},
    "Guava": {"temp": (8, 12), "humidity": (85, 95)},
    "Fig": {"temp": (0, 4), "humidity": (85, 95)},
    "Custard Apple": {"temp": (10, 15), "humidity": (80, 90)},
    "Food": {"temp": (4, 20), "humidity": (60, 90)},
}


# ============================================================
# LOCAL MODEL LOADING
# ============================================================

print("Loading FreshLens AI freshness model...")

weights_path = hf_hub_download(
    repo_id=MODEL_REPO,
    filename="model_weights.pth",
)

config_path = hf_hub_download(
    repo_id=MODEL_REPO,
    filename="config.json",
)

vocab_path = hf_hub_download(
    repo_id=MODEL_REPO,
    filename="vocab.json",
)


with open(
    config_path,
    "r",
    encoding="utf-8",
) as f:
    config = json.load(f)


with open(
    vocab_path,
    "r",
    encoding="utf-8",
) as f:
    vocab = json.load(f)


if isinstance(vocab, dict):
    vocab = {
        int(key): value
        for key, value in vocab.items()
    }


def get_label(index: int) -> str:
    if isinstance(vocab, dict):
        return str(
            vocab.get(
                index,
                "Unknown",
            )
        )

    if 0 <= index < len(vocab):
        return str(
            vocab[index]
        )

    return "Unknown"


print("Model config:", config)
print("Freshness vocabulary:", vocab)


model = create_vision_model(
    resnet18,
    config["n_classes"],
)


checkpoint = torch.load(
    weights_path,
    map_location="cpu",
)


if (
    isinstance(checkpoint, dict)
    and "state_dict" in checkpoint
):
    model.load_state_dict(
        checkpoint["state_dict"]
    )
else:
    model.load_state_dict(
        checkpoint
    )


model.eval()

print(
    "Freshness model loaded successfully."
)


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

preprocess = transforms.Compose(
    [
        transforms.Resize(256),

        transforms.CenterCrop(
            config.get(
                "img_size",
                224,
            )
        ),

        transforms.ToTensor(),

        transforms.Normalize(
            mean=[
                0.485,
                0.456,
                0.406,
            ],
            std=[
                0.229,
                0.224,
                0.225,
            ],
        ),
    ]
)


# ============================================================
# FOOD IDENTIFICATION MODEL
# ============================================================

print(
    "Loading food identification model..."
)

food_classifier = pipeline(
    "image-classification",
    model="google/vit-base-patch16-224",
    device=-1,
)

print(
    "Food identification model loaded successfully."
)


# ============================================================
# HELPERS
# ============================================================

def clamp(
    value: Any,
    minimum: float = 0.0,
    maximum: float = 100.0,
) -> float:
    try:
        value = float(value)
    except (TypeError, ValueError):
        value = minimum

    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


def safe_round(
    value: Any,
    digits: int = 2,
) -> float:
    return round(
        clamp(value),
        digits,
    )


def normalize_status(
    value: Any,
) -> str:
    text = str(
        value or ""
    ).strip().lower()

    text = (
        text
        .replace("_", " ")
        .replace("-", " ")
    )

    if text == "fresh":
        return "Fresh"

    if text in {
        "slightly spoiled",
        "slightly spoil",
        "mildly spoiled",
        "early spoilage",
    }:
        return "Slightly Spoiled"

    if text in {
        "spoiled",
        "rotten",
        "bad",
    }:
        return "Spoiled"

    if text in {
        "unripe",
        "raw",
    }:
        return "Unripe"

    return "Fresh"


def clean_food_name(
    label: str,
) -> str:
    label = (
        str(label)
        .replace("_", " ")
        .replace("-", " ")
        .strip()
    )

    if not label:
        return "Food"

    lower = label.lower()

    aliases = [
        (
            [
                "granny smith",
                "red delicious",
                "golden delicious",
                "apple",
            ],
            "Apple",
        ),
        (
            ["banana"],
            "Banana",
        ),
        (
            ["orange"],
            "Orange",
        ),
        (
            ["lemon"],
            "Lemon",
        ),
        (
            ["strawberry"],
            "Strawberry",
        ),
        (
            ["pineapple"],
            "Pineapple",
        ),
        (
            ["mango"],
            "Mango",
        ),
        (
            ["tomato"],
            "Tomato",
        ),
        (
            ["potato"],
            "Potato",
        ),
        (
            ["carrot"],
            "Carrot",
        ),
        (
            ["guava"],
            "Guava",
        ),
        (
            ["fig"],
            "Fig",
        ),
        (
            [
                "custard apple",
                "sugar apple",
                "sweetsop",
            ],
            "Custard Apple",
        ),
    ]

    for keywords, name in aliases:
        if any(
            keyword in lower
            for keyword in keywords
        ):
            return name

    return label.title()


def normalize_storage_method(
    value: Any,
) -> str:
    text = str(
        value or "unknown"
    ).strip().lower()

    text = text.replace("-", "_")

    aliases = {
        "roomtemperature":
            "room temperature",
        "room_temperature":
            "room temperature",
        "room temperature":
            "room temperature",

        "refrigerated":
            "refrigerated",
        "refrigerator":
            "refrigerator",
        "fridge":
            "fridge",

        "freezer":
            "freezer",
        "frozen":
            "frozen",

        "counter":
            "counter",

        "pantry":
            "pantry",

        "cool_dry":
            "cool dry place",
        "cool_dry_place":
            "cool dry place",
        "cool dry place":
            "cool dry place",

        "unknown":
            "unknown",
    }

    return aliases.get(
        text,
        "unknown",
    )


def parse_age_hours(
    value: Any,
) -> float:
    """
    Normalize food age to hours.

    Accepted:
      48
      "48"
      "48 hours"
      "2 days"
    """

    if value is None:
        return 0.0

    try:
        if isinstance(value, str):
            text = value.strip().lower()

            if not text:
                return 0.0

            if "day" in text:
                number = float(
                    text
                    .replace("days", "")
                    .replace("day", "")
                    .strip()
                )

                return max(
                    0.0,
                    min(
                        number * 24.0,
                        24.0 * 60.0,
                    ),
                )

            if "hour" in text:
                number = float(
                    text
                    .replace("hours", "")
                    .replace("hour", "")
                    .strip()
                )

                return max(
                    0.0,
                    min(
                        number,
                        24.0 * 60.0,
                    ),
                )

        age = float(value)

        return max(
            0.0,
            min(
                age,
                24.0 * 60.0,
            ),
        )

    except (
        TypeError,
        ValueError,
    ):
        return 0.0


def current_timestamp() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


# ============================================================
# LOCAL FOOD IDENTIFICATION
# ============================================================

def identify_food(
    food_image: Image.Image,
) -> Dict[str, Any]:

    try:
        food_image = food_image.convert(
            "RGB"
        )

        predictions = food_classifier(
            food_image,
            top_k=5,
        )

        if not predictions:
            return {
                "name": "Food",
                "confidence": 0.0,
                "confidence_level": "Very Low",
                "confidence_message": "Food identification could not be determined from the image.",
                "raw_label": "unknown",
                "top_predictions": [],
            }

        print(
            "\n========== FOOD PREDICTIONS =========="
        )

        top_predictions = []

        for prediction in predictions:
            label = prediction.get(
                "label",
                "unknown",
            )

            score = (
                float(
                    prediction.get(
                        "score",
                        0.0,
                    )
                )
                * 100.0
            )

            print(
                label,
                round(score, 2),
                "%",
            )

            top_predictions.append(
                {
                    "label": label,
                    "score": round(
                        score,
                        2,
                    ),
                    "food_name":
                        clean_food_name(
                            label
                        ),
                }
            )

        print(
            "======================================="
        )

        best = predictions[0]

        raw_label = str(
            best.get(
                "label",
                "unknown",
            )
        )

        food_name = clean_food_name(
            raw_label
        )

        food_confidence = (
            float(
                best.get(
                    "score",
                    0.0,
                )
            )
            * 100.0
        )

        confidence_rounded = round(clamp(food_confidence), 2)

        return {
            "name": food_name,
            "confidence": confidence_rounded,
            "confidence_level": classify_food_confidence(confidence_rounded),
            "confidence_message": food_identification_message(
                food_name, confidence_rounded
            ),
            "raw_label": raw_label,
            "top_predictions": top_predictions,
        }

    except Exception as exc:
        print(
            "FOOD IDENTIFICATION ERROR:",
            str(exc),
        )

        return {
            "name": "Food",
            "confidence": 0.0,
            "confidence_level": "Very Low",
            "confidence_message": "Food identification failed for this image.",
            "raw_label": "error",
            "top_predictions": [],
        }


# ============================================================
# LOCAL FRESHNESS MODEL
# ============================================================

# ============================================================
# GRAD-CAM EXPLAINABILITY
# ============================================================

def _find_last_conv_layer(model_instance: torch.nn.Module) -> Optional[torch.nn.Module]:
    """Return the last 2D convolution layer for Grad-CAM."""
    conv_layers = [
        module
        for module in model_instance.modules()
        if isinstance(module, torch.nn.Conv2d)
    ]
    return conv_layers[-1] if conv_layers else None


def _attention_region_from_cam(cam: np.ndarray) -> str:
    """Convert the strongest CAM area into a simple image-region label."""
    if cam.ndim != 2 or cam.size == 0:
        return "Visible food surface"

    threshold = np.percentile(cam, 85)
    ys, xs = np.where(cam >= threshold)

    if len(xs) == 0:
        y, x = np.unravel_index(int(np.argmax(cam)), cam.shape)
    else:
        x = int(np.mean(xs))
        y = int(np.mean(ys))

    h, w = cam.shape
    horizontal = (
        "left" if x < w / 3
        else "right" if x >= 2 * w / 3
        else "center"
    )
    vertical = (
        "upper" if y < h / 3
        else "lower" if y >= 2 * h / 3
        else "middle"
    )

    if horizontal == "center" and vertical == "middle":
        return "Center surface region"
    return f"{vertical}-{horizontal} surface region"


def generate_gradcam(
    food_image: Image.Image,
    target_index: int,
) -> Optional[Dict[str, Any]]:
    """
    Generate a Grad-CAM overlay for the local freshness model.

    The returned heatmap shows relative model influence for the selected
    freshness class. It is an explanation aid, not a pixel-level diagnosis
    of discoloration, texture defects, or contamination.
    """
    target_layer = _find_last_conv_layer(model)
    if target_layer is None:
        print("Grad-CAM unavailable: no Conv2d layer found.")
        return None

    activations = None
    gradients = None

    def forward_hook(_module, _inputs, output):
        nonlocal activations
        activations = output

    def backward_hook(_module, _grad_input, grad_output):
        nonlocal gradients
        if grad_output and grad_output[0] is not None:
            gradients = grad_output[0]

    forward_handle = target_layer.register_forward_hook(forward_hook)
    backward_handle = target_layer.register_full_backward_hook(backward_hook)

    try:
        model.zero_grad(set_to_none=True)

        tensor = preprocess(food_image.convert("RGB")).unsqueeze(0)

        # Gradients are required for Grad-CAM.
        output = model(tensor)
        score = output[0, target_index]
        score.backward()

        if activations is None or gradients is None:
            print("Grad-CAM unavailable: model hooks produced no activations/gradients.")
            return None

        weights = gradients.mean(dim=(2, 3), keepdim=True)
        cam_tensor = torch.sum(weights * activations, dim=1).squeeze(0)
        cam_tensor = torch.relu(cam_tensor)

        cam = cam_tensor.detach().cpu().numpy()
        if not np.isfinite(cam).all() or float(cam.max()) <= 0:
            print("Grad-CAM unavailable: empty or invalid activation map.")
            return None

        cam -= cam.min()
        cam /= (cam.max() + 1e-8)

        # Resize CAM to the original image size.
        cam_image = Image.fromarray(
            np.uint8(cam * 255.0),
            mode="L",
        ).resize(
            food_image.size,
            Image.Resampling.BILINEAR,
        )

        cam_full = np.asarray(cam_image, dtype=np.float32) / 255.0

        # FreshLens visual ramp: green (low attention) -> yellow -> red (high).
        red = np.clip(cam_full * 2.0, 0.0, 1.0)
        green = np.clip(2.0 - cam_full * 2.0, 0.0, 1.0)
        blue = np.zeros_like(cam_full)

        rgba = np.stack(
            [red, green, blue, np.clip(cam_full * 200.0, 0.0, 200.0) / 255.0],
            axis=-1,
        )

        rgba_uint8 = np.uint8(np.clip(rgba * 255.0, 0, 255))
        overlay = Image.fromarray(rgba_uint8, mode="RGBA")

        buffer = io.BytesIO()
        overlay.save(buffer, format="PNG", optimize=True)

        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")

        # Region is computed from the model CAM, not guessed from the label.
        region = _attention_region_from_cam(cam_full)

        return {
            "available": True,
            "method": "Grad-CAM",
            "target_class": get_label(target_index),
            "focus_area": region,
            "heatmap_base64": f"data:image/png;base64,{encoded}",
            "note": (
                "Red areas indicate stronger relative influence on the selected "
                "freshness prediction; the heatmap does not prove a specific defect."
            ),
        }

    except Exception as exc:
        print("Grad-CAM generation error:", str(exc))
        return None

    finally:
        forward_handle.remove()
        backward_handle.remove()
        model.zero_grad(set_to_none=True)


def analyze_freshness(
    food_image: Image.Image,
) -> Dict[str, Any]:

    food_image = food_image.convert(
        "RGB"
    )

    tensor = preprocess(
        food_image
    ).unsqueeze(0)

    with torch.no_grad():
        output = model(
            tensor
        )

        probs = torch.softmax(
            output,
            dim=1,
        )[0]

    print(
        "\n========== FRESHNESS PREDICTIONS =========="
    )

    for index, probability in enumerate(probs):
        print(
            repr(
                get_label(index)
            ),
            round(
                probability.item() * 100,
                2,
            ),
            "%",
        )

    print(
        "==========================================="
    )

    pred_idx = int(
        torch.argmax(
            probs
        ).item()
    )

    raw_label = str(
        get_label(pred_idx)
    ).strip().lower()

    confidence = (
        float(
            probs[pred_idx].item()
        )
        * 100.0
    )

    if raw_label == "fresh":
        status = "Fresh"
        freshness_score = confidence

    elif raw_label in {
        "slightly_spoiled",
        "slightly spoiled",
    }:
        status = "Slightly Spoiled"
        freshness_score = (
            100.0 - confidence
        )

    elif raw_label in {
        "rotten",
        "spoiled",
    }:
        status = "Spoiled"
        freshness_score = (
            100.0 - confidence
        )

    elif raw_label == "unripe":
        status = "Unripe"
        freshness_score = confidence

    else:
        print(
            "WARNING: Unknown freshness label:",
            raw_label,
        )

        status = "Fresh"
        freshness_score = confidence

    # Generate visual explainability from the same local model.
    gradcam = generate_gradcam(
        food_image,
        pred_idx,
    )

    return {
        "label":
            raw_label,

        "status":
            status,

        "confidence":
            round(
                clamp(confidence),
                2,
            ),

        "score":
            round(
                clamp(
                    freshness_score
                ),
                2,
            ),

        "predicted_index":
            pred_idx,

        "gradcam":
            gradcam,
    }


# ============================================================
# DEFAULT VISUAL BREAKDOWN
# ============================================================

def create_default_breakdown(
    freshness_score: float,
    freshness_status: str,
) -> Dict[str, float]:

    score = clamp(
        freshness_score
    )

    status = normalize_status(
        freshness_status
    )

    if status == "Spoiled":

        visual_quality = max(
            0,
            score - 3,
        )

        color_condition = max(
            0,
            score - 8,
        )

        texture_indicators = max(
            0,
            score - 12,
        )

        spots_defects = max(
            0,
            score - 15,
        )

        environmental_risk = 50.0

    elif status == "Slightly Spoiled":

        visual_quality = max(
            0,
            score,
        )

        color_condition = max(
            0,
            score - 3,
        )

        texture_indicators = max(
            0,
            score - 6,
        )

        spots_defects = max(
            0,
            score - 8,
        )

        environmental_risk = 50.0

    elif status == "Unripe":

        visual_quality = score
        color_condition = score

        texture_indicators = max(
            0,
            score - 4,
        )

        spots_defects = score
        environmental_risk = 50.0

    else:

        visual_quality = score

        color_condition = min(
            100,
            score + 2,
        )

        texture_indicators = min(
            100,
            score + 1,
        )

        spots_defects = score
        environmental_risk = 50.0

    return {
        "visual_quality":
            safe_round(
                visual_quality
            ),

        "color_condition":
            safe_round(
                color_condition
            ),

        "texture_indicators":
            safe_round(
                texture_indicators
            ),

        "spots_defects":
            safe_round(
                spots_defects
            ),

        "environmental_risk":
            safe_round(
                environmental_risk
            ),
    }


# ============================================================
# GEMINI JSON EXTRACTION
# ============================================================

def extract_json_from_text(
    text: str,
) -> Optional[Dict[str, Any]]:

    if not text:
        return None

    cleaned = str(
        text
    ).strip()

    if cleaned.startswith(
        "```"
    ):
        lines = cleaned.splitlines()

        if lines:
            lines = lines[1:]

        if (
            lines
            and lines[-1].strip()
            == "```"
        ):
            lines = lines[:-1]

        cleaned = "\n".join(
            lines
        ).strip()

    try:
        parsed = json.loads(
            cleaned
        )

        if isinstance(
            parsed,
            dict,
        ):
            return parsed

    except Exception:
        pass

    start = cleaned.find(
        "{"
    )

    end = cleaned.rfind(
        "}"
    )

    if (
        start >= 0
        and end > start
    ):
        candidate = cleaned[
            start:
            end + 1
        ]

        try:
            parsed = json.loads(
                candidate
            )

            if isinstance(
                parsed,
                dict,
            ):
                return parsed

        except Exception:
            pass

    return None


# ============================================================
# GEMINI IMAGE ANALYSIS
# ============================================================

def analyze_with_gemini(
    food_image: Image.Image,
) -> Optional[Dict[str, Any]]:
    """
    Gemini visual analysis for FreshLens AI.

    JSON mode is used with automatic function calling disabled.
    If Gemini is unavailable or returns invalid output, the caller
    falls back to the local freshness model.
    """

    if (
        not gemini_available
        or gemini_client is None
    ):
        print(
            "Gemini client unavailable; "
            "using local model fallback."
        )
        return None

    image = food_image.convert("RGB")

    prompt = """
You are the visual analysis engine for FreshLens AI.

Analyze the supplied food image.

Return ONLY one valid JSON object.
Do not return Markdown.
Do not return code fences.
Do not return any explanation outside the JSON object.

This is a visual research/prototype estimate.
Do not guarantee food safety.
Do not diagnose illness.
Do not invent temperature, humidity, storage,
or food age because those values are not supplied to Gemini.

Use exactly this JSON structure:

{
  "food_name": "Apple",
  "food_confidence": 0,
  "freshness_status": "Fresh",
  "freshness_score": 0,
  "confidence": 0,
  "visual_condition": "Good",
  "visual_signs": [],
  "freshness_breakdown": {
    "visual_quality": 0,
    "color_condition": 0,
    "texture_indicators": 0,
    "spots_defects": 0,
    "environmental_risk": 0
  },
  "recommendation": ""
}

freshness_status MUST be exactly one of:
Fresh
Slightly Spoiled
Spoiled
Unripe

All numerical values must be between 0 and 100.
Higher freshness_score means visually fresher.

environmental_risk MUST be 0 because environment data is not supplied to Gemini.

visual_signs must contain 2 to 5 short, specific visible observations.
recommendation must be concise and practical.
"""

    def _extract_response_text(response: Any) -> str:
        """Safely extract model text from a Gemini response."""
        text = getattr(response, "text", None)
        if text:
            return str(text).strip()

        try:
            candidates = getattr(response, "candidates", None) or []
            if not candidates:
                return ""

            candidate = candidates[0]
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) or []

            collected = []
            for part in parts:
                part_text = getattr(part, "text", None)
                if part_text:
                    collected.append(str(part_text))

            return "\n".join(collected).strip()

        except Exception as exc:
            print(
                "Gemini response extraction error:",
                str(exc),
            )
            return ""

    def _call_gemini() -> Any:
        from google.genai import types

        return gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[prompt, image],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
                temperature=0.2,
                max_output_tokens=1200,
            ),
        )

    # First attempt.
    try:
        response = _call_gemini()
        response_text = _extract_response_text(response)

        print(
            "\n========== GEMINI RAW RESPONSE =========="
        )
        print(
            response_text
            if response_text
            else "<empty response>"
        )
        print(
            "=========================================="
        )

        parsed = extract_json_from_text(
            response_text
        )

        if parsed:
            parsed["_model_used"] = GEMINI_MODEL

            print(
                "Gemini analysis succeeded using",
                GEMINI_MODEL,
            )

            return parsed

        print(
            "Gemini returned invalid JSON; "
            "attempting one clean retry."
        )

    except Exception as exc:
        message = str(exc)
        upper = message.upper()

        if (
            "429" in upper
            or "RESOURCE_EXHAUSTED" in upper
            or "QUOTA" in upper
        ):
            print(
                "Gemini quota/rate limit reached. "
                "Using local model fallback."
            )
            return None

        if (
            "401" in upper
            or "403" in upper
            or "API_KEY_INVALID" in upper
            or "UNAUTHENTICATED" in upper
        ):
            print(
                "Gemini authentication error. "
                "Using local model fallback."
            )
            return None

        if (
            "404" in upper
            or "NOT_FOUND" in upper
        ):
            print(
                "Gemini model unavailable. "
                "Using local model fallback."
            )
            return None

        print(
            "GEMINI ANALYSIS ERROR:",
            message,
        )

        transient = any(
            token in upper
            for token in (
                "500",
                "503",
                "UNAVAILABLE",
                "INTERNAL",
                "TIMEOUT",
                "DEADLINE_EXCEEDED",
            )
        )

        if not transient:
            return None

    # One retry for invalid JSON or transient failures.
    try:
        time.sleep(
            GEMINI_RETRY_DELAY_SECONDS
        )

        retry_response = _call_gemini()
        retry_text = _extract_response_text(
            retry_response
        )

        print(
            "\n========== GEMINI RETRY RESPONSE =========="
        )
        print(
            retry_text
            if retry_text
            else "<empty response>"
        )
        print(
            "============================================"
        )

        parsed = extract_json_from_text(
            retry_text
        )

        if parsed:
            parsed["_model_used"] = GEMINI_MODEL

            print(
                "Gemini retry succeeded using",
                GEMINI_MODEL,
            )

            return parsed

        print(
            "Gemini retry returned invalid JSON; "
            "using local model fallback."
        )

    except Exception as exc:
        message = str(exc)
        upper = message.upper()

        if (
            "429" in upper
            or "RESOURCE_EXHAUSTED" in upper
            or "QUOTA" in upper
        ):
            print(
                "Gemini quota/rate limit reached during retry. "
                "Using local model fallback."
            )
        elif (
            "401" in upper
            or "403" in upper
            or "API_KEY_INVALID" in upper
            or "UNAUTHENTICATED" in upper
        ):
            print(
                "Gemini authentication error during retry. "
                "Using local model fallback."
            )
        else:
            print(
                "Gemini retry failed:",
                message,
            )

    print(
        "Gemini unavailable; "
        "using local model fallback."
    )

    return None


# ============================================================
# GEMINI SANITIZATION
# ============================================================

def sanitize_gemini_result(
    gemini_result: Dict[str, Any],
) -> Dict[str, Any]:

    food_name = clean_food_name(
        gemini_result.get(
            "food_name",
            "Food",
        )
    )

    food_confidence = clamp(
        gemini_result.get(
            "food_confidence",
            0,
        )
    )

    freshness_status = normalize_status(
        gemini_result.get(
            "freshness_status",
            "Fresh",
        )
    )

    freshness_score = clamp(
        gemini_result.get(
            "freshness_score",
            0,
        )
    )

    confidence = clamp(
        gemini_result.get(
            "confidence",
            0,
        )
    )

    visual_condition = str(
        gemini_result.get(
            "visual_condition",
            "",
        )
    ).strip()

    if visual_condition not in {
        "Good",
        "Fair",
        "Poor",
    }:

        if freshness_status == "Spoiled":
            visual_condition = "Poor"

        elif freshness_status in {
            "Slightly Spoiled",
            "Unripe",
        }:
            visual_condition = "Fair"

        else:
            visual_condition = "Good"

    signs = gemini_result.get(
        "visual_signs",
        [],
    )

    if not isinstance(
        signs,
        list,
    ):
        signs = []

    visual_signs = [
        str(sign).strip()
        for sign in signs
        if str(sign).strip()
    ]

    if not visual_signs:
        visual_signs = [
            "Visual characteristics were analyzed by the AI model.",
            "The result is a research estimate, not a food-safety guarantee.",
        ]

    breakdown = gemini_result.get(
        "freshness_breakdown",
        {},
    )

    if not isinstance(
        breakdown,
        dict,
    ):
        breakdown = {}

    fallback = create_default_breakdown(
        freshness_score,
        freshness_status,
    )

    final_breakdown = {
        "visual_quality":
            safe_round(
                breakdown.get(
                    "visual_quality",
                    fallback[
                        "visual_quality"
                    ],
                )
            ),

        "color_condition":
            safe_round(
                breakdown.get(
                    "color_condition",
                    fallback[
                        "color_condition"
                    ],
                )
            ),

        "texture_indicators":
            safe_round(
                breakdown.get(
                    "texture_indicators",
                    fallback[
                        "texture_indicators"
                    ],
                )
            ),

        "spots_defects":
            safe_round(
                breakdown.get(
                    "spots_defects",
                    fallback[
                        "spots_defects"
                    ],
                )
            ),

        "environmental_risk":
            safe_round(
                breakdown.get(
                    "environmental_risk",
                    0,
                )
            ),
    }

    recommendation = str(
        gemini_result.get(
            "recommendation",
            "",
        )
    ).strip()

    if not recommendation:
        recommendation = (
            "Use this as a visual estimate only "
            "and follow appropriate food-safety guidance."
        )

    return {
        "food_name":
            food_name,

        "food_confidence":
            round(
                food_confidence,
                2,
            ),

        "freshness_status":
            freshness_status,

        "freshness_score":
            round(
                freshness_score,
                2,
            ),

        "confidence":
            round(
                confidence,
                2,
            ),

        "visual_condition":
            visual_condition,

        "visual_signs":
            visual_signs,

        "freshness_breakdown":
            final_breakdown,

        "recommendation":
            recommendation,
    }


# ============================================================
# ENVIRONMENTAL INTELLIGENCE
# ============================================================

def calculate_environmental_intelligence(
    food_name: str,
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    storage_method: str = "unknown",
) -> Dict[str, Any]:

    food = clean_food_name(
        food_name
    )

    profile = ENVIRONMENT_PROFILES.get(
        food,
        ENVIRONMENT_PROFILES["Food"],
    )

    storage = normalize_storage_method(
        storage_method
    )

    temp = None
    hum = None

    try:
        if temperature is not None:
            temp = float(
                temperature
            )
    except (
        TypeError,
        ValueError,
    ):
        temp = None

    try:
        if humidity is not None:
            hum = float(
                humidity
            )
    except (
        TypeError,
        ValueError,
    ):
        hum = None

    risk_points = 0.0
    factors = []

    if temp is not None:
        low, high = profile["temp"]

        if temp > high:
            excess = temp - high

            risk_points += min(
                45.0,
                18.0 + excess * 2.0,
            )

            factors.append(
                f"Temperature {temp:.1f}°C is above the prototype target range."
            )

        elif temp < low:
            risk_points += min(
                15.0,
                (low - temp) * 1.5,
            )

            factors.append(
                f"Temperature {temp:.1f}°C is below the prototype target range."
            )

        else:
            factors.append(
                f"Temperature {temp:.1f}°C is within the prototype target range."
            )

    if hum is not None:
        low_h, high_h = profile["humidity"]

        if hum > high_h:
            excess = hum - high_h

            risk_points += min(
                35.0,
                12.0 + excess * 1.2,
            )

            factors.append(
                f"Humidity {hum:.0f}% is elevated for this prototype profile."
            )

        elif hum < low_h:
            deficit = low_h - hum

            risk_points += min(
                15.0,
                deficit * 0.5,
            )

            factors.append(
                f"Humidity {hum:.0f}% is below the prototype target range."
            )

        else:
            factors.append(
                f"Humidity {hum:.0f}% is within the prototype target range."
            )

    storage_factor = STORAGE_FACTORS.get(
        storage,
        1.0,
    )

    if storage in {
        "room temperature",
        "room_temperature",
        "counter",
    }:
        risk_points += 8.0

        factors.append(
            "Room/counter storage can increase deterioration rate."
        )

    elif storage in {
        "refrigerated",
        "refrigerator",
        "fridge",
    }:
        risk_points -= 8.0

        factors.append(
            "Refrigerated storage reduces the prototype deterioration factor."
        )

    elif storage in {
        "freezer",
        "frozen",
    }:
        risk_points -= 12.0

        factors.append(
            "Frozen storage reduces the prototype deterioration factor."
        )

    risk_score = round(
        max(
            0.0,
            min(
                100.0,
                risk_points,
            ),
        ),
        2,
    )

    if risk_score >= 70:
        risk_level = "High"

    elif risk_score >= 40:
        risk_level = "Medium"

    elif risk_score >= 15:
        risk_level = "Low"

    else:
        risk_level = "Very Low"

    return {
        "temperature_c":
            temp,

        "humidity_percent":
            hum,

        "storage_method":
            storage,

        "risk_score":
            risk_score,

        "risk_level":
            risk_level,

        "factors":
            factors,

        "profile":
            {
                "temperature_range_c":
                    list(profile["temp"]),

                "humidity_range_percent":
                    list(profile["humidity"]),
            },

        "storage_factor":
            storage_factor,
    }


# ============================================================
# HISTORICAL ENVIRONMENT
# ============================================================

def calculate_historical_condition_factor(
    historical_conditions: Optional[Any],
) -> Dict[str, Any]:

    if not historical_conditions:
        return {
            "factor": 1.0,
            "risk_score": 0.0,
            "samples": 0,
            "summary":
                "No historical environmental data supplied.",
        }

    if isinstance(
        historical_conditions,
        dict,
    ):
        historical_conditions = [
            historical_conditions
        ]

    if not isinstance(
        historical_conditions,
        list,
    ):
        return {
            "factor": 1.0,
            "risk_score": 0.0,
            "samples": 0,
            "summary":
                "Historical data format was not recognized.",
        }

    valid = []

    for item in historical_conditions:

        if not isinstance(
            item,
            dict,
        ):
            continue

        temp = item.get(
            "temperature"
        )

        humidity = item.get(
            "humidity"
        )

        try:
            temp = (
                float(temp)
                if temp is not None
                else None
            )
        except (
            TypeError,
            ValueError,
        ):
            temp = None

        try:
            humidity = (
                float(humidity)
                if humidity is not None
                else None
            )
        except (
            TypeError,
            ValueError,
        ):
            humidity = None

        if (
            temp is None
            and humidity is None
        ):
            continue

        valid.append(
            {
                "temperature":
                    temp,

                "humidity":
                    humidity,
            }
        )

    if not valid:
        return {
            "factor": 1.0,
            "risk_score": 0.0,
            "samples": 0,
            "summary":
                "No valid historical environmental samples.",
        }

    risk_values = []

    for item in valid:

        risk = 0.0

        if item["temperature"] is not None:

            if item["temperature"] > 30:
                risk += 55

            elif item["temperature"] > 25:
                risk += 35

            elif item["temperature"] > 20:
                risk += 15

        if item["humidity"] is not None:

            if item["humidity"] > 85:
                risk += 40

            elif item["humidity"] > 75:
                risk += 25

            elif item["humidity"] > 65:
                risk += 10

        risk_values.append(
            min(
                100.0,
                risk,
            )
        )

    average_risk = (
        sum(risk_values)
        / len(risk_values)
    )

    factor = (
        1.0
        - (
            average_risk
            / 100.0
        )
        * 0.25
    )

    factor = max(
        0.70,
        min(
            1.05,
            factor,
        ),
    )

    return {
        "factor":
            round(
                factor,
                4,
            ),

        "risk_score":
            round(
                average_risk,
                2,
            ),

        "samples":
            len(valid),

        "summary":
            (
                "Historical environmental risk score: "
                f"{average_risk:.1f}/100 across "
                f"{len(valid)} samples."
            ),
    }


# ============================================================
# SPOILAGE PROBABILITY
# ============================================================

def calculate_spoilage_probability(
    freshness_score: float,
    freshness_status: str,
    confidence: float,
    environmental_risk: float = 0.0,
    age_hours: float = 0.0,
) -> Dict[str, Any]:

    score = clamp(
        freshness_score
    )

    confidence = clamp(
        confidence
    )

    status = normalize_status(
        freshness_status
    )

    environmental_risk = clamp(
        environmental_risk
    )

    try:
        age_hours = max(
            0.0,
            float(age_hours),
        )
    except (
        TypeError,
        ValueError,
    ):
        age_hours = 0.0

    raw_visual_component = (
        (
            100.0
            - score
        )
        * (
            0.55
            + (
                confidence
                / 100.0
            )
            * 0.20
        )
    )

    if status == "Fresh":
        visual_component = min(
            45.0,
            raw_visual_component,
        )

    elif status == "Slightly Spoiled":
        visual_component = min(
            68.0,
            raw_visual_component,
        )

    elif status == "Unripe":
        visual_component = min(
            55.0,
            raw_visual_component,
        )

    else:
        visual_component = min(
            85.0,
            raw_visual_component,
        )

    status_adjustment = {
        "Fresh": -14.0,
        "Unripe": -8.0,
        "Slightly Spoiled": 7.0,
        "Spoiled": 16.0,
    }.get(
        status,
        0.0,
    )

    environment_component = (
        environmental_risk
        * 0.22
    )

    age_component = min(
        12.0,
        (
            age_hours
            / 24.0
        )
        * 1.5,
    )

    probability = round(
        clamp(
            visual_component
            + status_adjustment
            + environment_component
            + age_component,
            1.0,
            98.0,
        ),
        2,
    )

    if probability >= 75:
        risk = "High"

    elif probability >= 40:
        risk = "Medium"

    elif probability >= 15:
        risk = "Low"

    else:
        risk = "Very Low"

    return {
        "probability":
            probability,

        "risk":
            risk,

        "environment_component":
            round(
                environment_component,
                2,
            ),

        "age_component":
            round(
                age_component,
                2,
            ),

        "visual_component":
            round(
                visual_component,
                2,
            ),
    }


# ============================================================
# SPOILAGE FORECAST
# ============================================================

def calculate_spoilage_forecast(
    current_probability: float,
    remaining_days: float,
) -> Dict[str, float]:

    current = clamp(
        current_probability,
        0.0,
        98.0,
    )

    try:
        days = float(
            remaining_days
        )
    except (
        TypeError,
        ValueError,
    ):
        days = 1.0

    days = max(
        0.25,
        days,
    )

    tau_hours = max(
        18.0,
        days * 36.0,
    )

    def forecast_at(
        hours: float,
    ) -> float:

        growth = (
            1.0
            - math.exp(
                -float(hours)
                / tau_hours
            )
        )

        headroom = (
            98.0
            - current
        )

        predicted = (
            current
            + headroom * growth
        )

        return round(
            clamp(
                predicted,
                current,
                98.0,
            ),
            2,
        )

    values = {
        "next_24_hours":
            forecast_at(24.0),

        "next_48_hours":
            forecast_at(48.0),

        "next_72_hours":
            forecast_at(72.0),

        "next_5_days":
            forecast_at(120.0),
    }

    previous = current

    for key in values:

        values[key] = round(
            max(
                previous,
                values[key],
            ),
            2,
        )

        previous = values[key]

    return values


# ============================================================
# XGBOOST SHELF-LIFE MODEL
# ============================================================

SHELF_LIFE_MODEL_PATH = os.getenv(
    "SHELF_LIFE_MODEL_PATH",
    str(
        Path(__file__).resolve().parents[2]
        / "ml_training"
        / "models"
        / "shelf_life_xgb.joblib"
    ),
)

_shelf_life_bundle = None
_shelf_life_model_error = None

# Resolve shelf-life food identity dynamically from learned model metadata.
def normalize_shelf_life_food(value: Any) -> str:
    text = str(value or "").strip()
    text = text.replace("_", " ").replace("-", " ")
    text = " ".join(text.split())
    if not text:
        return "Food"
    pretty = text.title()
    bundle = _shelf_life_bundle
    priors = bundle.get("food_prior_by_type", {}) if isinstance(bundle, dict) else {}
    canonical = re.sub(r"[^a-z0-9]+", "", pretty.lower())
    for known_food in priors:
        known_canonical = re.sub(r"[^a-z0-9]+", "", str(known_food).lower())
        if canonical == known_canonical:
            return str(known_food)
    return pretty

def load_shelf_life_model() -> Optional[Dict[str, Any]]:
    """Load the trained XGBoost bundle once; return None on unavailable model."""
    global _shelf_life_bundle, _shelf_life_model_error

    if _shelf_life_bundle is not None:
        return _shelf_life_bundle

    if _shelf_life_model_error:
        return None

    try:
        if not os.path.exists(SHELF_LIFE_MODEL_PATH):
            raise FileNotFoundError(
                f"Shelf-life model not found: {SHELF_LIFE_MODEL_PATH}"
            )

        bundle = joblib.load(SHELF_LIFE_MODEL_PATH)
        if not isinstance(bundle, dict):
            raise TypeError("Shelf-life model bundle must be a dictionary.")

        if "model" not in bundle or "feature_columns" not in bundle:
            raise KeyError("Shelf-life model bundle is missing model/feature_columns.")

        _shelf_life_bundle = bundle
        print("Shelf-life XGBoost model loaded:", SHELF_LIFE_MODEL_PATH)
        return bundle

    except Exception as exc:
        _shelf_life_model_error = str(exc)
        print("Shelf-life XGBoost model unavailable:", _shelf_life_model_error)
        return None

def predict_shelf_life_xgb(
    food_name: str,
    freshness_score: float,
    freshness_confidence: float,
    spoilage_probability: float,
) -> Optional[Dict[str, Any]]:
    """Predict shelf life with the universal trained XGBoost model."""
    bundle = load_shelf_life_model()
    if bundle is None:
        return None

    model_food = normalize_shelf_life_food(food_name)
    priors = bundle.get("food_prior_by_type", {})
    default_prior = float(bundle.get("food_prior_default", 0.0) or 0.0)
    food_prior_days = float(priors.get(model_food, default_prior))

    feature_columns = bundle.get(
        "feature_columns",
        [
            "freshness_score",
            "freshness_confidence",
            "spoilage_probability",
            "food_prior_days",
        ],
    )

    row = pd.DataFrame([{
        "freshness_score": float(freshness_score),
        "freshness_confidence": float(freshness_confidence),
        "spoilage_probability": float(spoilage_probability),
        "food_prior_days": food_prior_days,
    }])

    try:
        prediction = float(bundle["model"].predict(row[feature_columns])[0])
        prediction = max(0.0, prediction)

        metrics = bundle.get("metrics", {})
        mae_days = float(metrics.get("mae_days", 0.0) or 0.0)
        rmse_days = float(metrics.get("rmse_days", 0.0) or 0.0)
        r2 = float(metrics.get("r2", 0.0) or 0.0)

        return {
            "estimated_days": round(prediction, 2),
            "model_food_type": model_food,
            "method": "XGBoost",
            "mae_days": round(mae_days, 4),
            "rmse_days": round(rmse_days, 4),
            "r2": round(r2, 4),
            "feature_values": {
                "food_type": model_food,
                "freshness_score": round(float(freshness_score), 2),
                "freshness_confidence": round(float(freshness_confidence), 2),
                "spoilage_probability": round(float(spoilage_probability), 2),
                "food_prior_days": round(food_prior_days, 2),
            },
        }

    except Exception as exc:
        print("Shelf-life XGBoost prediction error:", str(exc))
        return None

def apply_xgb_shelf_life_prediction(
    heuristic_shelf_life: Dict[str, Any],
    prediction: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Apply the trained XGBoost shelf-life prediction while keeping the
    displayed result consistent with strong visual deterioration signals.

    The guardrail is a prototype consistency rule, not a calibrated food-
    safety model and not a replacement for model validation.
    """

    result = dict(heuristic_shelf_life)

    estimated_days = float(
        prediction["estimated_days"]
    )

    mae_days = max(
        0.0,
        float(
            prediction.get(
                "mae_days",
                0.0,
            )
        ),
    )

    feature_values = prediction.get(
        "feature_values",
        {},
    )

    freshness_score = float(
        feature_values.get(
            "freshness_score",
            100.0,
        )
    )

    spoilage_probability = float(
        feature_values.get(
            "spoilage_probability",
            0.0,
        )
    )

    # ---------------------------------------------------------
    # Deterioration consistency guardrail
    # ---------------------------------------------------------
    # Severe deterioration: cap remaining shelf life at 1 day.
    # Moderate deterioration: cap at 3 days.
    # Mild deterioration: cap at 5 days.
    # These are prototype UI/logic guardrails, not food-safety limits.
    if (
        freshness_score <= 20.0
        or spoilage_probability >= 70.0
    ):
        estimated_days = min(
            estimated_days,
            1.0,
        )
        range_cap = 1.0
        severe_deterioration = True

    elif (
        freshness_score <= 50.0
        or spoilage_probability >= 40.0
    ):
        estimated_days = min(
            estimated_days,
            3.0,
        )
        range_cap = 3.0
        severe_deterioration = False

    elif (
        freshness_score <= 70.0
        or spoilage_probability >= 20.0
    ):
        estimated_days = min(
            estimated_days,
            5.0,
        )
        range_cap = 5.0
        severe_deterioration = False

    else:
        range_cap = None
        severe_deterioration = False

    # This is an empirical error band based on the model's validation MAE,
    # not a calibrated prediction interval.
    if severe_deterioration:
        likely_min = 0.0
        likely_max = min(
            estimated_days,
            1.0,
        )
    else:
        likely_min = max(
            0.0,
            estimated_days - mae_days,
        )

        likely_max = max(
            estimated_days,
            estimated_days + mae_days,
        )

        if range_cap is not None:
            likely_max = min(
                likely_max,
                range_cap,
            )

            likely_min = min(
                likely_min,
                likely_max,
            )

    def fmt_days(
        value: float,
    ) -> str:
        if value < 1:
            return f"{value:.1f} day"
        if abs(
            value - round(value)
        ) < 0.05:
            return f"{int(round(value))} days"
        return f"{value:.1f} days"

    likely_range = (
        f"{fmt_days(likely_min)}-"
        f"{fmt_days(likely_max)}"
    )

    result.update(
        {
            "min": round(
                likely_min,
                2,
            ),
            "max": round(
                likely_max,
                2,
            ),
            "estimated_days": round(
                estimated_days,
                2,
            ),
            "range": likely_range,
            "likely_range": likely_range,
            "likely_min_days": round(
                likely_min,
                2,
            ),
            "likely_max_days": round(
                likely_max,
                2,
            ),
            "model": "XGBoost",
            "model_food_type": prediction[
                "model_food_type"
            ],
            "model_validation": {
                "mae_days": prediction[
                    "mae_days"
                ],
                "rmse_days": prediction[
                    "rmse_days"
                ],
                "r2": prediction[
                    "r2"
                ],
            },
            "prediction_error_band_days": prediction[
                "mae_days"
            ],
            "prediction_features": prediction[
                "feature_values"
            ],
            "consistency_guardrail": {
                "applied": range_cap is not None,
                "cap_days": range_cap,
                "reason": (
                    "Strong deterioration guardrail applied."
                    if range_cap is not None
                    else "No deterioration shelf-life cap required."
                ),
            },
            "confidence_basis": (
                "Prototype context confidence retained from the existing "
                "shelf-life confidence heuristic; model MAE/RMSE/R2 are "
                "reported separately and are not per-image probabilities."
            ),
        }
    )

    return result


# ============================================================
# DYNAMIC SHELF LIFE
# ============================================================

def calculate_dynamic_shelf_life(
    food_name: str,
    freshness_score: float,
    freshness_status: str,
    spoilage_probability: float,
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    storage_method: Optional[str] = None,
    age_hours: float = 0.0,
    historical_conditions: Optional[Any] = None,
) -> Dict[str, Any]:

    food_key = clean_food_name(
        food_name
    )

    baseline = FOOD_SHELF_LIFE.get(
        food_key,
        FOOD_SHELF_LIFE["Food"],
    )

    baseline_min = float(
        baseline["min"]
    )

    baseline_max = float(
        baseline["max"]
    )

    score = clamp(
        freshness_score
    )

    spoilage = clamp(
        spoilage_probability
    )

    status = normalize_status(
        freshness_status
    )

    visual_factor = (
        0.60 * (
            score / 100.0
        )
        + 0.40 * (
            1.0
            - spoilage / 100.0
        )
    )

    status_factor = {
        "Fresh": 0.90,
        "Unripe": 0.78,
        "Slightly Spoiled": 0.52,
        "Spoiled": 0.08,
    }.get(
        status,
        0.70,
    )

    combined_factor = (
        0.65 * visual_factor
        + 0.35 * status_factor
    )

    environmental_factor = 1.0

    environment_available = (
        temperature is not None
        or humidity is not None
    )

    try:
        if temperature is not None:

            temp = float(
                temperature
            )

            if temp > 30:

                environmental_factor -= min(
                    0.22,
                    (
                        temp
                        - 30.0
                    )
                    * 0.022,
                )

            elif temp > 25:

                environmental_factor -= min(
                    0.10,
                    (
                        temp
                        - 25.0
                    )
                    * 0.02,
                )

            elif temp < 10:

                environmental_factor += min(
                    0.08,
                    (
                        10.0
                        - temp
                    )
                    * 0.008,
                )

    except (
        TypeError,
        ValueError,
    ):
        pass

    try:
        if humidity is not None:

            hum = float(
                humidity
            )

            if hum > 75:

                environmental_factor -= min(
                    0.18,
                    (
                        hum
                        - 75.0
                    )
                    * 0.009,
                )

            elif hum < 45:

                environmental_factor += min(
                    0.05,
                    (
                        45.0
                        - hum
                    )
                    * 0.004,
                )

    except (
        TypeError,
        ValueError,
    ):
        pass

    environmental_factor = max(
        0.55,
        min(
            1.08,
            environmental_factor,
        ),
    )

    storage = normalize_storage_method(
        storage_method
    )

    storage_factor = {
        "refrigerated": 1.20,
        "refrigerator": 1.20,
        "fridge": 1.20,
        "cold storage": 1.28,
        "cold_storage": 1.28,
        "freezer": 1.35,
        "frozen": 1.35,
        "room temperature": 0.78,
        "room_temperature": 0.78,
        "counter": 0.75,
        "pantry": 0.90,
        "cool dry place": 1.10,
        "open air": 0.65,
        "open_air": 0.65,
    }.get(
        storage,
        1.0,
    )

    try:
        age = max(
            0.0,
            float(age_hours),
        )
    except (
        TypeError,
        ValueError,
    ):
        age = 0.0

    age_factor = max(
        0.45,
        1.0 - (
            age / 240.0
        ),
    )

    historical = (
        calculate_historical_condition_factor(
            historical_conditions
        )
    )

    total_factor = max(
        0.05,
        min(
            1.40,
            combined_factor
            * environmental_factor
            * storage_factor
            * age_factor
            * historical["factor"],
        ),
    )

    if status == "Spoiled":

        dynamic_min = 0.0

        dynamic_max = min(
            1.0,
            max(
                0.1,
                baseline_max
                * total_factor,
            ),
        )

    else:

        dynamic_min = max(
            0.5,
            baseline_min
            * total_factor,
        )

        dynamic_max = max(
            dynamic_min,
            baseline_max
            * total_factor,
        )

    estimated_days = (
        dynamic_min
        + dynamic_max
    ) / 2.0

    confidence = 48.0

    if temperature is not None:
        confidence += 8.0

    if humidity is not None:
        confidence += 8.0

    if storage_method:
        confidence += 6.0

    if age > 0:
        confidence += 5.0

    if historical["samples"] > 0:
        confidence += 6.0

    confidence += min(
        12.0,
        score * 0.12,
    )

    confidence = round(
        clamp(
            confidence,
            35.0,
            92.0,
        ),
        2,
    )

    interval_width = max(
        0.5,
        estimated_days * (
            0.16
            + (
                100.0
                - confidence
            )
            / 260.0
        ),
    )

    likely_min = max(
        0.0,
        estimated_days
        - interval_width,
    )

    likely_max = max(
        estimated_days,
        estimated_days
        + interval_width,
    )

    def fmt_days(
        value: float,
    ) -> str:

        if value < 1:
            return (
                f"{value:.1f} day"
            )

        if (
            abs(
                value
                - round(value)
            )
            < 0.05
        ):
            return (
                f"{int(round(value))} days"
            )

        return (
            f"{value:.1f} days"
        )

    likely_range = (
        f"{fmt_days(likely_min)}-"
        f"{fmt_days(likely_max)}"
    )

    return {
        "min":
            round(
                dynamic_min,
                2,
            ),

        "max":
            round(
                dynamic_max,
                2,
            ),

        "estimated_days":
            round(
                estimated_days,
                2,
            ),

        "range":
            likely_range,

        "likely_range":
            likely_range,

        "likely_min_days":
            round(
                likely_min,
                2,
            ),

        "likely_max_days":
            round(
                likely_max,
                2,
            ),

        "confidence":
            confidence,

        "baseline_min":
            int(
                baseline_min
            ),

        "baseline_max":
            int(
                baseline_max
            ),

        "environment_available":
            environment_available,

        "storage_method":
            storage,

        "age_hours":
            round(
                age,
                2,
            ),

        "historical_conditions":
            historical,
    }


# ============================================================
# EXPLAINABLE AI
# ============================================================

def create_explainable_risk(
    freshness_score: float,
    freshness_status: str,
    visual_signs: Optional[Any] = None,
    environmental: Optional[Dict[str, Any]] = None,
    age_hours: float = 0.0,
    storage_method: Optional[str] = None,
) -> Dict[str, Any]:

    score = clamp(
        freshness_score
    )

    status = normalize_status(
        freshness_status
    )

    factors = []

    if isinstance(
        visual_signs,
        list,
    ):
        for sign in visual_signs[:5]:

            sign_text = str(
                sign
            ).strip()

            if sign_text:

                factors.append(
                    {
                        "category":
                            "Visual",

                        "factor":
                            sign_text,

                        "impact":
                            (
                                "High"
                                if status in {
                                    "Spoiled",
                                    "Slightly Spoiled",
                                }
                                else "Low"
                            ),
                    }
                )

    if status == "Spoiled":

        factors.append(
            {
                "category":
                    "Freshness",

                "factor":
                    "Strong visual deterioration classification.",

                "impact":
                    "High",
            }
        )

    elif status == "Slightly Spoiled":

        factors.append(
            {
                "category":
                    "Freshness",

                "factor":
                    "Visible deterioration-associated classification.",

                "impact":
                    "Medium",
            }
        )

    elif status == "Unripe":

        factors.append(
            {
                "category":
                    "Freshness",

                "factor":
                    "Food is classified as visually unripe.",

                "impact":
                    "Medium",
            }
        )

    else:

        factors.append(
            {
                "category":
                    "Freshness",

                "factor":
                    "Food is classified as visually fresh.",

                "impact":
                    "Low",
            }
        )

    if isinstance(
        environmental,
        dict,
    ):

        temp = environmental.get(
            "temperature_c"
        )

        hum = environmental.get(
            "humidity_percent"
        )

        env_score = clamp(
            environmental.get(
                "risk_score",
                0,
            )
        )

        impact = (
            "High"
            if env_score >= 70
            else "Medium"
            if env_score >= 40
            else "Low"
        )

        if temp is not None:

            factors.append(
                {
                    "category":
                        "Environment",

                    "factor":
                        f"Temperature: {float(temp):.1f}°C.",

                    "impact":
                        impact,
                }
            )

        if hum is not None:

            factors.append(
                {
                    "category":
                        "Environment",

                    "factor":
                        f"Humidity: {float(hum):.0f}%.",

                    "impact":
                        impact,
                }
            )

    try:
        age = max(
            0.0,
            float(age_hours),
        )
    except (
        TypeError,
        ValueError,
    ):
        age = 0.0

    if age > 0:

        factors.append(
            {
                "category":
                    "Age",

                "factor":
                    f"{age / 24.0:.1f} days since storage.",

                "impact":
                    (
                        "Medium"
                        if age >= 72
                        else "Low"
                    ),
            }
        )

    if (
        storage_method
        and str(
            storage_method
        ).strip()
    ):

        factors.append(
            {
                "category":
                    "Storage",

                "factor":
                    (
                        "Storage method: "
                        f"{storage_method}."
                    ),

                "impact":
                    "Context",
            }
        )

    priority = {
        "High": 3,
        "Medium": 2,
        "Low": 1,
        "Context": 0,
    }

    main_risk_factor = (
        max(
            factors,
            key=lambda item:
                priority.get(
                    item.get(
                        "impact"
                    ),
                    0,
                ),
        )["factor"]
        if factors
        else "Visual freshness assessment"
    )

    return {
        "factors":
            factors,

        "main_risk_factor":
            main_risk_factor,

        "freshness_score":
            round(
                score,
                2,
            ),

        "freshness_status":
            status,
    }


# ============================================================
# SMART RECOMMENDATION
# ============================================================

def generate_recommendation(
    freshness_status: str,
    spoilage_risk: str = "Low",
    environmental: Optional[Dict[str, Any]] = None,
    shelf_life: Optional[Dict[str, Any]] = None,
) -> str:

    status = normalize_status(
        freshness_status
    )

    risk = str(
        spoilage_risk or "Low"
    ).strip().title()

    shelf_text = ""

    if isinstance(
        shelf_life,
        dict,
    ):

        estimated = shelf_life.get(
            "estimated_days"
        )

        try:
            if estimated is not None:

                shelf_text = (
                    " Estimated remaining freshness "
                    f"is about {float(estimated):.1f} days."
                )

        except (
            TypeError,
            ValueError,
        ):
            shelf_text = ""

    environment_text = ""

    if isinstance(
        environmental,
        dict,
    ):

        env_risk = str(
            environmental.get(
                "risk_level",
                "",
            )
        ).strip()

        if env_risk == "High":

            environment_text = (
                " Current environmental conditions may "
                "accelerate deterioration."
            )

        elif env_risk == "Medium":

            environment_text = (
                " Environmental conditions show moderate "
                "deterioration pressure."
            )

    if status == "Spoiled":

        return (
            "The item shows strong visual signs of spoilage. "
            "Do not rely on this AI estimate alone to determine "
            "food safety; inspect appropriately and follow "
            "food-safety guidance."
            + environment_text
        )

    if status == "Slightly Spoiled":

        return (
            "The item shows signs of deterioration. "
            "Prioritize inspection and consider using it soon "
            "if appropriate."
            + shelf_text
            + environment_text
        )

    if status == "Unripe":

        return (
            "The item appears visually unripe. Allow appropriate "
            "ripening conditions before use if suitable."
            + shelf_text
        )

    if risk == "High":

        return (
            "The item appears visually fresh, but estimated "
            "spoilage risk is elevated. Prioritize appropriate "
            "storage and inspection."
            + shelf_text
            + environment_text
        )

    if risk == "Medium":

        return (
            "The item appears reasonably fresh. Use appropriate "
            "storage and monitor for visible deterioration."
            + shelf_text
            + environment_text
        )

    return (
        "The item appears visually fresh. Store appropriately "
        "to help maintain freshness and monitor its condition."
        + shelf_text
    )


# ============================================================
# MAIN ANALYSIS
# ============================================================

def analyze_food(
    food_image: Image.Image,
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    storage_method: str = "unknown",
    age_hours: float = 0.0,
    historical_conditions: Optional[Any] = None,
    weather_data: Optional[Dict[str, Any]] = None,
    iot_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:

    food_image = food_image.convert(
        "RGB"
    )

    # --------------------------------------------------------
    # IoT fallback for missing direct values.
    # --------------------------------------------------------

    if isinstance(
        iot_data,
        dict,
    ):

        if temperature is None:

            temperature = iot_data.get(
                "temperature",
                iot_data.get(
                    "temperature_c"
                ),
            )

        if humidity is None:

            humidity = iot_data.get(
                "humidity",
                iot_data.get(
                    "humidity_percent"
                ),
            )

    # --------------------------------------------------------
    # Weather fallback for missing direct values.
    # --------------------------------------------------------

    if isinstance(
        weather_data,
        dict,
    ):

        if temperature is None:

            temperature = weather_data.get(
                "temperature",
                weather_data.get(
                    "temperature_c"
                ),
            )

        if humidity is None:

            humidity = weather_data.get(
                "humidity",
                weather_data.get(
                    "humidity_percent"
                ),
            )

    age_hours = parse_age_hours(
        age_hours
    )

    # --------------------------------------------------------
    # 1. LOCAL FOOD
    # --------------------------------------------------------

    local_food = identify_food(
        food_image
    )

    local_food_name = local_food[
        "name"
    ]

    local_food_confidence = local_food[
        "confidence"
    ]

    local_food_confidence_level = local_food.get(
        "confidence_level",
        classify_food_confidence(local_food_confidence),
    )

    local_food_confidence_message = local_food.get(
        "confidence_message",
        food_identification_message(
            local_food_name,
            local_food_confidence,
        ),
    )

    raw_food_label = local_food[
        "raw_label"
    ]

    # --------------------------------------------------------
    # 2. LOCAL FRESHNESS
    # --------------------------------------------------------

    local_freshness = analyze_freshness(
        food_image
    )

    local_model_label = local_freshness[
        "label"
    ]

    local_confidence = local_freshness[
        "confidence"
    ]

    local_model_status = local_freshness[
        "status"
    ]

    local_model_score = local_freshness[
        "score"
    ]

    local_gradcam = local_freshness.get(
        "gradcam"
    )

    # --------------------------------------------------------
    # 3. GEMINI
    # --------------------------------------------------------

    gemini_raw = analyze_with_gemini(
        food_image
    )

    gemini_result = None

    if gemini_raw:

        gemini_result = (
            sanitize_gemini_result(
                gemini_raw
            )
        )

    # --------------------------------------------------------
    # 4. FINAL VISUAL AI RESULT
    # --------------------------------------------------------

    if gemini_result:

        food_name = gemini_result[
            "food_name"
        ]

        food_confidence = gemini_result[
            "food_confidence"
        ]

        freshness_status = gemini_result[
            "freshness_status"
        ]

        freshness_score = gemini_result[
            "freshness_score"
        ]

        confidence = gemini_result[
            "confidence"
        ]

        visual_condition = gemini_result[
            "visual_condition"
        ]

        visual_signs = gemini_result[
            "visual_signs"
        ]

        freshness_breakdown = (
            gemini_result[
                "freshness_breakdown"
            ]
        )

        analysis_source = (
            "Gemini + Local Freshness Model"
        )

        gemini_used = True

    else:

        food_name = local_food_name

        food_confidence = (
            local_food_confidence
        )

        freshness_status = (
            local_model_status
        )

        freshness_score = (
            local_model_score
        )

        confidence = local_confidence

        freshness_breakdown = (
            create_default_breakdown(
                freshness_score,
                freshness_status,
            )
        )

        if freshness_status == "Spoiled":

            visual_condition = "Poor"

            visual_signs = [
                "Local freshness model detected strong deterioration indicators.",
                "Image-only analysis cannot guarantee food safety.",
            ]

        elif freshness_status == "Slightly Spoiled":

            visual_condition = "Fair"

            visual_signs = [
                "Local freshness model detected deterioration-associated visual patterns.",
                "The item should be inspected carefully.",
            ]

        elif freshness_status == "Unripe":

            visual_condition = "Fair"

            visual_signs = [
                "Local freshness model classified the item as unripe.",
            ]

        else:

            visual_condition = "Good"

            visual_signs = [
                "Local freshness model classified the item as fresh.",
                "Image-only analysis cannot establish food safety.",
            ]

        analysis_source = (
            "Local Freshness Model"
        )

        gemini_used = False

    # Low food-identification confidence is surfaced explicitly.
    # We do not overwrite the detected class because the classifier
    # can still be useful, but the UI/API must not imply certainty.
    if float(food_confidence) < FOOD_CONFIDENCE_UNCERTAIN:
        uncertainty_note = food_identification_message(
            food_name,
            food_confidence,
        )
        if uncertainty_note not in visual_signs:
            visual_signs = list(visual_signs) + [uncertainty_note]

    # --------------------------------------------------------
    # 5. ENVIRONMENT
    # --------------------------------------------------------

    environmental = (
        calculate_environmental_intelligence(
            food_name=food_name,
            temperature=temperature,
            humidity=humidity,
            storage_method=storage_method,
        )
    )

    freshness_breakdown = dict(
        freshness_breakdown
    )

    if (
        environmental.get(
            "temperature_c"
        )
        is not None
        or environmental.get(
            "humidity_percent"
        )
        is not None
    ):

        freshness_breakdown[
            "environmental_risk"
        ] = round(
            environmental[
                "risk_score"
            ],
            2,
        )

    else:

        freshness_breakdown[
            "environmental_risk"
        ] = 0.0

    # --------------------------------------------------------
    # 6. SPOILAGE
    # --------------------------------------------------------

    spoilage_result = (
        calculate_spoilage_probability(
            freshness_score=freshness_score,
            freshness_status=freshness_status,
            confidence=confidence,
            environmental_risk=(
                environmental[
                    "risk_score"
                ]
            ),
            age_hours=age_hours,
        )
    )

    spoilage_probability = (
        spoilage_result[
            "probability"
        ]
    )

    spoilage_risk = (
        spoilage_result[
            "risk"
        ]
    )

    # --------------------------------------------------------
    # 7. SHELF LIFE
    # --------------------------------------------------------

    heuristic_shelf_life = (
        calculate_dynamic_shelf_life(
            food_name=food_name,
            freshness_score=freshness_score,
            freshness_status=freshness_status,
            spoilage_probability=(
                spoilage_probability
            ),
            temperature=temperature,
            humidity=humidity,
            storage_method=storage_method,
            age_hours=age_hours,
            historical_conditions=(
                historical_conditions
            ),
        )
    )

    # --------------------------------------------------------
    # XGBoost shelf-life model
    # --------------------------------------------------------
    #
    # The trained XGBoost model uses the local freshness model's
    # visual features. Those features are kept for transparency.
    #
    # However, the final FreshLens result is a fused assessment
    # using freshness_score + spoilage_probability + context.
    #
    # When the local model strongly disagrees with the final fused
    # result, do NOT allow the local-model-only XGBoost prediction
    # to collapse the final shelf-life to an inconsistent value.
    #
    # In that disagreement case:
    #   - heuristic_shelf_life remains the final shelf-life estimate
    #   - XGBoost prediction is retained as supporting model metadata
    #   - validation metrics are still exposed
    #
    # This is a prototype fusion-consistency rule, not a
    # food-safety guarantee.

    xgb_food_name = (
        local_food_name
        if normalize_shelf_life_food(
            local_food_name
        ) is not None
        else food_name
    )

    # XGBoost input remains aligned with the model's training schema.
    xgb_spoilage_result = calculate_spoilage_probability(
        freshness_score=local_model_score,
        freshness_status=local_model_status,
        confidence=local_confidence,
        environmental_risk=0.0,
        age_hours=0.0,
    )

    xgb_prediction = predict_shelf_life_xgb(
        food_name=xgb_food_name,
        freshness_score=local_model_score,
        freshness_confidence=local_confidence,
        spoilage_probability=(
            xgb_spoilage_result["probability"]
        ),
    )

    # --------------------------------------------------------
    # Detect strong disagreement between:
    #   1. final fused assessment
    #   2. local freshness model
    # --------------------------------------------------------

    final_score_value = float(
        freshness_score
    )

    final_spoilage_value = float(
        spoilage_probability
    )

    local_score_value = float(
        local_model_score
    )

    local_spoilage_value = float(
        xgb_spoilage_result["probability"]
    )

    strong_fusion_disagreement = (
        final_score_value >= 70.0
        and final_spoilage_value < 20.0
        and local_score_value <= 20.0
        and local_spoilage_value >= 70.0
    )

    if xgb_prediction is not None:

        if strong_fusion_disagreement:

            # Keep the final fused assessment as the source of truth
            # when the local model is strongly inconsistent with it.
            shelf_life = dict(
                heuristic_shelf_life
            )

            shelf_life["model"] = (
                "Fusion + XGBoost supporting"
            )

            shelf_life["model_food_type"] = (
                xgb_prediction[
                    "model_food_type"
                ]
            )

            shelf_life["model_validation"] = {
                "mae_days": xgb_prediction[
                    "mae_days"
                ],
                "rmse_days": xgb_prediction[
                    "rmse_days"
                ],
                "r2": xgb_prediction[
                    "r2"
                ],
            }

            shelf_life[
                "prediction_error_band_days"
            ] = xgb_prediction[
                "mae_days"
            ]

            shelf_life[
                "prediction_features"
            ] = xgb_prediction[
                "feature_values"
            ]

            shelf_life[
                "consistency_guardrail"
            ] = {
                "applied": False,
                "cap_days": None,
                "reason": (
                    "XGBoost/local-model output strongly "
                    "disagreed with the final fused freshness "
                    "assessment, so the fused heuristic shelf-life "
                    "was retained."
                ),
            }

            shelf_life[
                "xgb_disagreement"
            ] = True

            shelf_life[
                "xgb_disagreement_reason"
            ] = (
                "Local freshness model indicated strong "
                "deterioration while the final fused assessment "
                "indicated fresh food."
            )

        else:

            shelf_life = (
                apply_xgb_shelf_life_prediction(
                    heuristic_shelf_life=(
                        heuristic_shelf_life
                    ),
                    prediction=xgb_prediction,
                )
            )

            shelf_life[
                "xgb_disagreement"
            ] = False

            shelf_life[
                "xgb_disagreement_reason"
            ] = (
                "No strong disagreement detected."
            )

    else:

        shelf_life = dict(
            heuristic_shelf_life
        )

        shelf_life["model"] = (
            "Heuristic fallback"
        )

        shelf_life[
            "model_food_type"
        ] = None

        shelf_life[
            "fallback_reason"
        ] = (
            "The trained XGBoost shelf-life model "
            "could not be used for this analysis."
        )

    # Record exact XGBoost input features for transparency.
    shelf_life[
        "xgb_input_features"
    ] = {
        "food_type": xgb_food_name,
        "freshness_score": round(
            local_score_value,
            2,
        ),
        "freshness_confidence": round(
            float(local_confidence),
            2,
        ),
        "spoilage_probability": round(
            local_spoilage_value,
            2,
        ),
    }

    shelf_min = shelf_life[
        "min"
    ]

    shelf_max = shelf_life[
        "max"
    ]


    # --------------------------------------------------------
    # 8. FORECAST
    # --------------------------------------------------------

    remaining_days_for_forecast = max(
        0.1,
        float(
            shelf_life[
                "estimated_days"
            ]
        ),
    )

    spoilage_forecast = (
        calculate_spoilage_forecast(
            current_probability=(
                spoilage_probability
            ),
            remaining_days=(
                remaining_days_for_forecast
            ),
        )
    )

    # --------------------------------------------------------
    # 9. EXPLAINABILITY
    # --------------------------------------------------------

    explainability = (
        create_explainable_risk(
            freshness_score=freshness_score,
            freshness_status=freshness_status,
            visual_signs=visual_signs,
            environmental=environmental,
            age_hours=age_hours,
            storage_method=(
                environmental[
                    "storage_method"
                ]
            ),
        )
    )

    # --------------------------------------------------------
    # 10. RECOMMENDATION
    # --------------------------------------------------------

    recommendation = (
        generate_recommendation(
            freshness_status=freshness_status,
            spoilage_risk=spoilage_risk,
            environmental=environmental,
            shelf_life=shelf_life,
        )
    )

    # If Gemini worked and no environment context exists,
    # preserve Gemini's own concise recommendation.
    if (
        gemini_used
        and gemini_result is not None
        and temperature is None
        and humidity is None
        and not weather_data
        and not iot_data
    ):
        recommendation = (
            gemini_result[
                "recommendation"
            ]
        )

    # --------------------------------------------------------
    # 11. INPUT SOURCES / MODE
    # --------------------------------------------------------

    environment_source = []

    if (
        temperature is not None
        or humidity is not None
    ):
        environment_source.append(
            "direct"
        )

    if (
        isinstance(
            weather_data,
            dict,
        )
        and weather_data
    ):
        environment_source.append(
            "weather"
        )

    if (
        isinstance(
            iot_data,
            dict,
        )
        and iot_data
    ):
        environment_source.append(
            "iot"
        )

    if historical_conditions:
        environment_source.append(
            "historical"
        )

    if not environment_source:
        environment_source.append(
            "none"
        )

    if "iot" in environment_source:

        multimodal_mode = (
            "image + IoT + environment"
        )

    elif (
        "direct" in environment_source
        or "weather" in environment_source
    ):

        multimodal_mode = (
            "image + environment"
        )

    else:

        multimodal_mode = (
            "image_only"
        )

    if "historical" in environment_source:
        multimodal_mode += (
            " + historical"
        )

    # --------------------------------------------------------
    # 12. FINAL RESULT
    # --------------------------------------------------------

    result = {

        # ====================================================
        # FOOD
        # ====================================================

        "food_class":
            food_name,

        "food_name":
            food_name,

        "detected_food":
            food_name,

        "food":
            food_name,

        "raw_food_label":
            raw_food_label,

        "food_identification_confidence":
            round(
                float(
                    food_confidence
                ),
                2,
            ),

        "food_confidence":
            round(
                float(
                    food_confidence
                ),
                2,
            ),

        "food_confidence_level": classify_food_confidence(
            food_confidence
        ),

        "food_identification_uncertain": (
            float(food_confidence) < FOOD_CONFIDENCE_UNCERTAIN
        ),

        "food_identification_message": food_identification_message(
            food_name,
            food_confidence,
        ),

        "local_food_confidence_level": local_food_confidence_level,

        "local_food_confidence_message": local_food_confidence_message,

        "food_predictions":
            local_food.get(
                "top_predictions",
                [],
            ),

        # ====================================================
        # FRESHNESS
        # ====================================================

        "freshness_status":
            freshness_status,

        "status":
            freshness_status,

        "freshness":
            freshness_status,

        "freshness_score":
            round(
                float(
                    freshness_score
                ),
                2,
            ),

        "score":
            round(
                float(
                    freshness_score
                ),
                2,
            ),

        # ====================================================
        # CONFIDENCE
        # ====================================================

        "confidence":
            round(
                float(
                    confidence
                ),
                2,
            ),

        "ai_confidence":
            round(
                float(
                    confidence
                ),
                2,
            ),

        "model_confidence":
            round(
                float(
                    confidence
                ),
                2,
            ),

        "freshness_confidence_level": classify_food_confidence(
            confidence
        ),

        # ====================================================
        # LOCAL MODEL
        # ====================================================

        "model_label":
            local_model_status,

        "local_model_label":
            local_model_status,

        "local_model_status":
            local_model_status,

        "local_model_raw_label":
            local_model_label,

        "local_model_score":
            local_model_score,

        "local_model_confidence":
            local_confidence,

        # ====================================================
        # GEMINI
        # ====================================================

        "gemini_used":
            gemini_used,

        "gemini_available":
            gemini_available,

        "gemini_model":
            GEMINI_MODEL,

        "analysis_source":
            analysis_source,

        "gemini_analysis":
            gemini_result,

        # ====================================================
        # VISUAL
        # ====================================================

        "visual_signs":
            visual_signs,

        "visual_condition":
            visual_condition,

        "condition":
            visual_condition,

        # ====================================================
        # BREAKDOWN
        # ====================================================

        "visual_quality":
            freshness_breakdown[
                "visual_quality"
            ],

        "color_condition":
            freshness_breakdown[
                "color_condition"
            ],

        "texture_indicators":
            freshness_breakdown[
                "texture_indicators"
            ],

        "spots_defects":
            freshness_breakdown[
                "spots_defects"
            ],

        "environmental_risk":
            freshness_breakdown[
                "environmental_risk"
            ],

        "freshness_breakdown":
            freshness_breakdown,

        "breakdown":
            freshness_breakdown,

        "visual_breakdown":
            freshness_breakdown,

        # ====================================================
        # ENVIRONMENT
        # ====================================================

        "environment":
            environmental,

        "temperature":
            environmental[
                "temperature_c"
            ],

        "temperature_c":
            environmental[
                "temperature_c"
            ],

        "humidity":
            environmental[
                "humidity_percent"
            ],

        "humidity_percent":
            environmental[
                "humidity_percent"
            ],

        "storage_method":
            environmental[
                "storage_method"
            ],

        "environmental_risk_score":
            environmental[
                "risk_score"
            ],

        "environmental_risk_level":
            environmental[
                "risk_level"
            ],

        "environmental_factors":
            environmental[
                "factors"
            ],

        "weather":
            weather_data,

        "iot":
            iot_data,

        "environment_source":
            environment_source,

        "multimodal_mode":
            multimodal_mode,

        # ====================================================
        # AGE / HISTORY
        # ====================================================

        "age_hours":
            round(
                float(
                    age_hours or 0.0
                ),
                2,
            ),

        "age_days":
            round(
                float(
                    age_hours or 0.0
                )
                / 24.0,
                2,
            ),

        "historical_conditions":
            shelf_life[
                "historical_conditions"
            ],

        # ====================================================
        # SPOILAGE
        # ====================================================

        "spoilage_probability":
            spoilage_probability,

        "spoilage_probability_percent":
            spoilage_probability,

        "spoilage_risk":
            spoilage_risk,

        "spoilage":
            {
                "probability":
                    spoilage_probability,

                "risk":
                    spoilage_risk,
            },

        "spoilage_components":
            {
                "environment":
                    spoilage_result[
                        "environment_component"
                    ],

                "age":
                    spoilage_result[
                        "age_component"
                    ],

                "visual":
                    spoilage_result[
                        "visual_component"
                    ],
            },

        # ====================================================
        # FORECAST
        # ====================================================

        "spoilage_forecast":
            spoilage_forecast,

        "spoilage_forecast_percent":
            spoilage_forecast,

        # ====================================================
        # SHELF LIFE
        # ====================================================

        "estimated_shelf_life_days":
            {
                "min":
                    shelf_min,

                "max":
                    shelf_max,

                "range":
                    shelf_life[
                        "range"
                    ],

                "estimated":
                    shelf_life[
                        "estimated_days"
                    ],

                "estimated_days":
                    shelf_life[
                        "estimated_days"
                    ],

                "likely_range":
                    shelf_life[
                        "likely_range"
                    ],

                "confidence":
                    shelf_life[
                        "confidence"
                    ],
            },

        "shelf_life":
            {
                "min":
                    shelf_min,

                "max":
                    shelf_max,

                "range":
                    shelf_life[
                        "range"
                    ],

                "estimated":
                    shelf_life[
                        "estimated_days"
                    ],

                "estimated_days":
                    shelf_life[
                        "estimated_days"
                    ],

                "likely_range":
                    shelf_life[
                        "likely_range"
                    ],

                "confidence":
                    shelf_life[
                        "confidence"
                    ],
            },

        "shelf_life_days":
            {
                "min":
                    shelf_min,

                "max":
                    shelf_max,

                "range":
                    shelf_life[
                        "range"
                    ],

                "estimated":
                    shelf_life[
                        "estimated_days"
                    ],

                "estimated_days":
                    shelf_life[
                        "estimated_days"
                    ],

                "likely_range":
                    shelf_life[
                        "likely_range"
                    ],

                "confidence":
                    shelf_life[
                        "confidence"
                    ],
            },

        "dynamic_shelf_life":
            shelf_life,

        "shelf_life_model":
            shelf_life.get("model", "unknown"),

        "shelf_life_model_food_type":
            shelf_life.get("model_food_type"),

        "shelf_life_model_validation":
            shelf_life.get("model_validation"),

        "shelf_life_prediction_error_band_days":
            shelf_life.get("prediction_error_band_days"),

        # ====================================================
        # EXPLAINABILITY
        # ====================================================

        "explainability":
            {
                **explainability,
                "gradcam": local_gradcam,
            },

        "risk_factors":
            explainability[
                "factors"
            ],

        "main_risk_factor":
            explainability[
                "main_risk_factor"
            ],

        # ====================================================
        # RECOMMENDATION
        # ====================================================

        "recommendation":
            recommendation,

        # ====================================================
        # METADATA
        # ====================================================

        "model_version":
            MODEL_VERSION,

        "analysis_timestamp":
            current_timestamp(),

        "research_estimate":
            True,

        "safety_disclaimer":
            (
                "Freshness, shelf-life and spoilage probability are "
                "AI-based research/prototype estimates. They are not "
                "a food-safety guarantee and should not replace "
                "professional food-safety guidance."
            ),
    }

    # ========================================================
    # DEBUG
    # ========================================================

    print(
        "\n========================================"
    )

    print(
        "FINAL FRESHLENS AI RESULT"
    )

    print(
        "========================================"
    )

    print(
        "Food:",
        food_name,
    )

    print(
        "Food confidence:",
        food_confidence,
        "%",
    )

    print(
        "Freshness:",
        freshness_status,
    )

    print(
        "Freshness score:",
        freshness_score,
        "%",
    )

    print(
        "AI confidence:",
        confidence,
        "%",
    )

    print(
        "Gemini used:",
        gemini_used,
    )

    print(
        "Analysis source:",
        analysis_source,
    )

    print(
        "Visual condition:",
        visual_condition,
    )

    print(
        "Temperature:",
        environmental[
            "temperature_c"
        ],
        "°C",
    )

    print(
        "Humidity:",
        environmental[
            "humidity_percent"
        ],
        "%",
    )

    print(
        "Environmental risk:",
        environmental[
            "risk_score"
        ],
        environmental[
            "risk_level"
        ],
    )

    print(
        "Storage:",
        environmental[
            "storage_method"
        ],
    )

    print(
        "Age:",
        round(
            age_hours / 24.0,
            2,
        ),
        "days",
    )

    print(
        "Spoilage probability:",
        spoilage_probability,
        "%",
    )

    print(
        "Spoilage risk:",
        spoilage_risk,
    )

    print(
        "Dynamic shelf life:",
        shelf_life[
            "range"
        ],
    )

    print(
        "Estimated shelf life:",
        shelf_life[
            "estimated_days"
        ],
        "days",
    )

    print(
        "Likely range:",
        shelf_life[
            "likely_range"
        ],
    )

    print(
        "Shelf-life confidence:",
        shelf_life[
            "confidence"
        ],
        "%",
    )

    print(
        "Multimodal mode:",
        multimodal_mode,
    )

    print(
        "Main risk factor:",
        explainability[
            "main_risk_factor"
        ],
    )

    print(
        "Recommendation:",
        recommendation,
    )

    print(
        "========================================\n"
    )

    return result


# ============================================================
# OPTIONAL CONVENIENCE WRAPPER
# ============================================================

def analyze_food_bytes(
    image_bytes: bytes,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Convenience function for FastAPI/Node clients.
    """

    image = Image.open(
        io.BytesIO(
            image_bytes
        )
    ).convert("RGB")

    return analyze_food(
        image,
        **kwargs,
    )
FOOD_CONFIDENCE_UNCERTAIN = 60.0
FOOD_CONFIDENCE_LOW = 40.0
def classify_food_confidence(confidence: float) -> str:
    value = clamp(confidence)
    if value >= 70.0:
        return "High"
    if value >= FOOD_CONFIDENCE_UNCERTAIN:
        return "Moderate"
    if value >= FOOD_CONFIDENCE_LOW:
        return "Low"
    return "Very Low"


def food_identification_message(food_name: str, confidence: float) -> str:
    level = classify_food_confidence(confidence)
    if level == "Very Low":
        return (
            f"Food identification is very uncertain ({confidence:.1f}%). "
            "A clearer image is recommended."
        )
    if level == "Low":
        return (
            f"Food identification is uncertain ({confidence:.1f}%). "
            f"The model currently detects {food_name}; a clearer image is recommended."
        )
    if level == "Moderate":
        return (
            f"The model detects {food_name} with moderate identification confidence "
            f"({confidence:.1f}%)."
        )
    return f"The model identifies {food_name} with high confidence ({confidence:.1f}%)."

