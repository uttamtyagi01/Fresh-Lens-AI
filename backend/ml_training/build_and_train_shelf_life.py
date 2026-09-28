
from __future__ import annotations

import os
import zipfile
import argparse
import io
import json
import math
import re
import sys
import time
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import torch
from PIL import Image, UnidentifiedImageError
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import OneHotEncoder
from torchvision import transforms
from fastai.vision.all import create_vision_model, resnet18
from huggingface_hub import hf_hub_download
from xgboost import XGBRegressor


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
LABEL_RE = re.compile(
    r"^(?P<stage>Fresh|Semi[\s_]*Fresh|Rotten)\s*"
    r"(?P<food>.*?)\s*"
    r"\(\s*(?P<min>\d+(?:\.\d+)?)\s*-\s*(?P<max>\d+(?:\.\d+)?)\s*\)\s*$",
    re.IGNORECASE,
)

DEFAULT_MODEL_REPO = os.getenv(
    "FRESHNESS_MODEL_REPO",
    "nathansekar/food-freshness-detector",
)


def find_processed_zip(backend_dir: Path) -> Path:
    candidates = [
        backend_dir / "ml_training" / "data" / "AgriFreshNET_raw",
    ]

    for base in candidates:
        if not base.exists():
            continue
        found = sorted(
            base.rglob("Processed Data.zip"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if found:
            return found[0]

    downloads = Path.home() / "Downloads"
    if downloads.exists():
        found = sorted(
            downloads.rglob("Processed Data.zip"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if found:
            return found[0]

    raise FileNotFoundError(
        "Could not find 'Processed Data.zip'. "
        "Expected it under backend\\ml_training\\data\\AgriFreshNET_raw\\..."
    )


def normalize_stage(value: str) -> str:
    s = re.sub(r"[_\s]+", " ", value.strip().lower())
    if s == "fresh":
        return "Fresh"
    if s in {"semi fresh", "semifresh"}:
        return "Slightly Spoiled"
    if s == "rotten":
        return "Spoiled"
    return value.strip().title()


def parse_label_folder(folder_name: str) -> dict[str, Any] | None:
    match = LABEL_RE.match(folder_name.strip())
    if not match:
        return None

    stage = normalize_stage(match.group("stage"))
    food = re.sub(r"\s+", " ", match.group("food").replace("_", " ")).strip()
    food = food.title()

    min_days = float(match.group("min"))
    max_days = float(match.group("max"))
    return {
        "freshness_stage": stage,
        "food_type": food,
        "target_min_days": min_days,
        "target_max_days": max_days,
        "target_mid_days": (min_days + max_days) / 2.0,
    }


def clean_group_id(file_name: str) -> str:
    stem = Path(file_name).stem
    stem = re.sub(r"^aug_\d+_", "", stem, flags=re.IGNORECASE)
    return stem.lower()


def load_freshness_model(model_repo: str):
    print(f"Loading freshness model: {model_repo}")
    weights_path = hf_hub_download(
        repo_id=model_repo,
        filename="model_weights.pth",
    )
    config_path = hf_hub_download(
        repo_id=model_repo,
        filename="config.json",
    )
    vocab_path = hf_hub_download(
        repo_id=model_repo,
        filename="vocab.json",
    )

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    with open(vocab_path, "r", encoding="utf-8") as f:
        vocab = json.load(f)

    if isinstance(vocab, dict):
        vocab = {int(k): str(v) for k, v in vocab.items()}

    def get_label(index: int) -> str:
        if isinstance(vocab, dict):
            return str(vocab.get(index, "Unknown"))
        return str(vocab[index]) if 0 <= index < len(vocab) else "Unknown"

    model = create_vision_model(
        resnet18,
        config["n_classes"],
    )

    checkpoint = torch.load(
        weights_path,
        map_location="cpu",
    )

    if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
        model.load_state_dict(checkpoint["state_dict"])
    else:
        model.load_state_dict(checkpoint)

    model.eval()

    preprocess = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(config.get("img_size", 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )

    return model, preprocess, get_label


def infer_features(
    model,
    preprocess,
    get_label,
    zf: zipfile.ZipFile,
    names: list[str],
    batch_size: int = 32,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for start in range(0, len(names), batch_size):
        batch_names = names[start : start + batch_size]
        tensors = []
        valid_names = []

        for name in batch_names:
            try:
                raw = zf.read(name)
                image = Image.open(io.BytesIO(raw)).convert("RGB")
                tensors.append(preprocess(image))
                valid_names.append(name)
            except (OSError, UnidentifiedImageError, ValueError) as exc:
                print(f"Skipping unreadable image: {name} ({exc})")

        if not tensors:
            continue

        x = torch.stack(tensors)

        with torch.no_grad():
            logits = model(x)
            probs = torch.softmax(logits, dim=1).cpu().numpy()

        for name, p in zip(valid_names, probs):
            pred_idx = int(np.argmax(p))
            raw_label = get_label(pred_idx).strip().lower()
            confidence = float(p[pred_idx] * 100.0)

            if raw_label == "fresh":
                freshness_score = confidence
                predicted_status = "Fresh"
            elif raw_label in {"slightly_spoiled", "slightly spoiled"}:
                freshness_score = 100.0 - confidence
                predicted_status = "Slightly Spoiled"
            elif raw_label in {"rotten", "spoiled"}:
                freshness_score = 100.0 - confidence
                predicted_status = "Spoiled"
            elif raw_label == "unripe":
                freshness_score = confidence
                predicted_status = "Unripe"
            else:
                freshness_score = confidence
                predicted_status = "Unknown"

            # Same deterministic spoilage calculation used by FreshLens
            score = max(0.0, min(100.0, freshness_score))
            raw_visual = (100.0 - score) * (
                0.55 + (confidence / 100.0) * 0.20
            )

            if predicted_status == "Fresh":
                visual_component = min(45.0, raw_visual)
                status_adjustment = -14.0
            elif predicted_status == "Slightly Spoiled":
                visual_component = min(68.0, raw_visual)
                status_adjustment = 7.0
            elif predicted_status == "Unripe":
                visual_component = min(55.0, raw_visual)
                status_adjustment = -8.0
            else:
                visual_component = min(85.0, raw_visual)
                status_adjustment = 16.0

            spoilage_probability = max(
                1.0,
                min(
                    98.0,
                    visual_component + status_adjustment,
                ),
            )

            parts = name.replace("\\", "/").split("/")
            folder_name = parts[-2] if len(parts) >= 2 else ""

            label_info = parse_label_folder(folder_name)
            if not label_info:
                continue

            rows.append(
                {
                    "source_group": clean_group_id(Path(name).name),
                    "image_name": Path(name).name,
                    "food_type": label_info["food_type"],
                    "freshness_stage": label_info["freshness_stage"],
                    "freshness_score": round(score, 4),
                    "freshness_confidence": round(confidence, 4),
                    "spoilage_probability": round(spoilage_probability, 4),
                    "target_min_days": label_info["target_min_days"],
                    "target_max_days": label_info["target_max_days"],
                    "remaining_shelf_life_days": label_info["target_mid_days"],
                }
            )

        done = min(start + batch_size, len(names))
        if done % (batch_size * 10) == 0 or done == len(names):
            print(f"Feature extraction: {done}/{len(names)} images")

    return rows


def build_training_dataframe(
    zip_path: Path,
    model_repo: str,
    batch_size: int,
    max_images: int,
) -> pd.DataFrame:
    with zipfile.ZipFile(zip_path, "r") as zf:
        image_names = [
            info.filename
            for info in zf.infolist()
            if not info.is_dir()
            and Path(info.filename).suffix.lower() in IMAGE_EXTS
            and len(info.filename.split("/")) >= 3
            and parse_label_folder(info.filename.replace("\\", "/").split("/")[-2])
        ]

        image_names.sort()

        if max_images > 0:
            image_names = image_names[:max_images]

        print(f"Images selected for ML feature extraction: {len(image_names)}")

        model, preprocess, get_label = load_freshness_model(model_repo)

        rows = infer_features(
            model=model,
            preprocess=preprocess,
            get_label=get_label,
            zf=zf,
            names=image_names,
            batch_size=batch_size,
        )

    if not rows:
        raise RuntimeError("No valid labelled images were processed.")

    df = pd.DataFrame(rows)

    # Drop exact duplicates if any.
    df = df.drop_duplicates(
        subset=["image_name", "food_type", "freshness_stage"]
    ).reset_index(drop=True)

    return df


def train_model(df: pd.DataFrame, models_dir: Path) -> dict[str, Any]:
    """Train a universal XGBoost shelf-life regressor.

    Food identity is represented by a leakage-safe target-encoded prior learned
    only from the training split. Unseen foods use the training-set global mean.
    """
    feature_cols = [
        "freshness_score",
        "freshness_confidence",
        "spoilage_probability",
        "food_prior_days",
    ]
    target_col = "remaining_shelf_life_days"
    groups = df["source_group"]

    raw_X = df[[
        "food_type",
        "freshness_score",
        "freshness_confidence",
        "spoilage_probability",
    ]].copy()
    y = df[target_col].astype(float)

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=42,
    )
    train_idx, test_idx = next(splitter.split(raw_X, y, groups=groups))

    X_train_raw = raw_X.iloc[train_idx].copy()
    X_test_raw = raw_X.iloc[test_idx].copy()
    y_train = y.iloc[train_idx].copy()
    y_test = y.iloc[test_idx].copy()

    global_prior = float(y_train.mean())
    food_prior_by_type = (
        pd.DataFrame({
            "food_type": X_train_raw["food_type"].astype(str),
            "target": y_train.to_numpy(),
        })
        .groupby("food_type")["target"]
        .mean()
        .to_dict()
    )

    X_train = pd.DataFrame({
        "freshness_score": X_train_raw["freshness_score"].astype(float),
        "freshness_confidence": X_train_raw["freshness_confidence"].astype(float),
        "spoilage_probability": X_train_raw["spoilage_probability"].astype(float),
        "food_prior_days": X_train_raw["food_type"].map(food_prior_by_type).fillna(global_prior).astype(float),
    })

    X_test = pd.DataFrame({
        "freshness_score": X_test_raw["freshness_score"].astype(float),
        "freshness_confidence": X_test_raw["freshness_confidence"].astype(float),
        "spoilage_probability": X_test_raw["spoilage_probability"].astype(float),
        "food_prior_days": X_test_raw["food_type"].map(food_prior_by_type).fillna(global_prior).astype(float),
    })

    model = XGBRegressor(
        objective="reg:squarederror",
        n_estimators=700,
        max_depth=7,
        learning_rate=0.035,
        subsample=0.85,
        colsample_bytree=0.9,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
    )

    print("Training universal XGBoost shelf-life model...")
    started = time.time()
    model.fit(X_train[feature_cols], y_train)
    elapsed = time.time() - started

    pred = model.predict(X_test[feature_cols])

    mae = float(mean_absolute_error(y_test, pred))
    rmse = float(math.sqrt(mean_squared_error(y_test, pred)))
    r2 = float(r2_score(y_test, pred))

    models_dir.mkdir(parents=True, exist_ok=True)

    metrics = {
        "mae_days": mae,
        "rmse_days": rmse,
        "r2": r2,
    }

    bundle = {
        "model": model,
        "feature_columns": feature_cols,
        "target": target_col,
        "target_definition": (
            "Midpoint of the approximate shelf-life range encoded in "
            "the AgriFreshNET Processed Data folder label."
        ),
        "model_scope": "Universal shelf-life regression with learned food prior and freshness signals.",
        "food_prior_by_type": {str(k): float(v) for k, v in food_prior_by_type.items()},
        "food_prior_default": global_prior,
        "training_rows": int(len(train_idx)),
        "test_rows": int(len(test_idx)),
        "unique_train_groups": int(groups.iloc[train_idx].nunique()),
        "unique_test_groups": int(groups.iloc[test_idx].nunique()),
        "metrics": metrics,
    }

    model_path = models_dir / "shelf_life_xgb.joblib"
    meta_path = models_dir / "shelf_life_xgb_metadata.json"

    joblib.dump(bundle, model_path)

    metadata = {
        "model": "XGBoost",
        "model_scope": bundle["model_scope"],
        "feature_columns": feature_cols,
        "target": target_col,
        "target_definition": bundle["target_definition"],
        "dataset_rows": int(len(df)),
        "train_rows": int(len(train_idx)),
        "test_rows": int(len(test_idx)),
        "unique_groups_total": int(groups.nunique()),
        "unique_groups_train": int(groups.iloc[train_idx].nunique()),
        "unique_groups_test": int(groups.iloc[test_idx].nunique()),
        "food_types_total": int(df["food_type"].nunique()),
        "food_types": sorted(str(v) for v in df["food_type"].dropna().unique()),
        "food_prior_default": global_prior,
        "metrics": metrics,
        "training_seconds": round(elapsed, 2),
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return metadata

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build and train FreshLens XGBoost shelf-life model."
    )
    parser.add_argument(
        "--backend-dir",
        default=str(Path.cwd()),
        help="FreshLens backend directory.",
    )
    parser.add_argument(
        "--model-repo",
        default=DEFAULT_MODEL_REPO,
        help="Freshness model repo used for feature extraction.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Inference batch size.",
    )
    parser.add_argument(
        "--max-images",
        type=int,
        default=0,
        help="0 = all images; otherwise process only first N images.",
    )
    args = parser.parse_args()

    backend_dir = Path(args.backend_dir).resolve()
    data_dir = backend_dir / "ml_training" / "data"
    models_dir = backend_dir / "ml_training" / "models"

    zip_path = find_processed_zip(backend_dir)
    print(f"Dataset ZIP: {zip_path}")

    print("\n[1/3] Building ML feature table...")
    df = build_training_dataframe(
        zip_path=zip_path,
        model_repo=args.model_repo,
        batch_size=max(1, args.batch_size),
        max_images=max(0, args.max_images),
    )

    data_dir.mkdir(parents=True, exist_ok=True)
    csv_path = data_dir / "shelf_life_training_features.csv"
    df.to_csv(csv_path, index=False)

    print(f"\nTraining dataset saved: {csv_path}")
    print(f"Rows: {len(df)}")
    print(f"Food types: {df['food_type'].nunique()}")
    print(df["food_type"].value_counts().sort_index().to_string())

    print("\n[2/3] Training XGBoost...")
    metadata = train_model(df, models_dir)

    print("\n[3/3] COMPLETE")
    print("=" * 60)
    print("Model:", metadata["model"])
    print("Dataset rows:", metadata["dataset_rows"])
    print("Train rows:", metadata["train_rows"])
    print("Test rows:", metadata["test_rows"])
    print("MAE (days):", round(metadata["metrics"]["mae_days"], 4))
    print("RMSE (days):", round(metadata["metrics"]["rmse_days"], 4))
    print("RÂ²:", round(metadata["metrics"]["r2"], 4))
    print("Model file:", models_dir / "shelf_life_xgb.joblib")
    print("Metadata:", models_dir / "shelf_life_xgb_metadata.json")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


