from __future__ import annotations

import argparse
import io
import json
import re
import time
import zipfile
from pathlib import Path

import numpy as np
import torch
from PIL import Image, UnidentifiedImageError
from fastai.vision.all import create_vision_model, resnet18
from huggingface_hub import hf_hub_download
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import GroupShuffleSplit
from torchvision import transforms

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
LABEL_RE = re.compile(r"^(?P<stage>Fresh|Semi[\s_]*Fresh|Rotten)\s*(?P<food>.*?)\s*\(\s*(?P<min>\d+(?:\.\d+)?)\s*-\s*(?P<max>\d+(?:\.\d+)?)\s*\)$", re.IGNORECASE)
DEFAULT_REPO = "nathansekar/food-freshness-detector"


def normalize_stage(value: str) -> str | None:
    value = re.sub(r"[_\s]+", " ", value.strip().lower())
    return {"fresh": "Fresh", "semi fresh": "Slightly Spoiled", "rotten": "Spoiled"}.get(value)


def parse_stage(folder: str) -> str | None:
    match = LABEL_RE.match(folder.strip())
    return normalize_stage(match.group("stage")) if match else None


def group_id(name: str) -> str:
    return re.sub(r"^aug_\d+_", "", Path(name).stem, flags=re.IGNORECASE).lower()


def find_dataset(backend: Path) -> Path:
    candidates: list[Path] = []
    root = backend / "ml_training" / "data" / "AgriFreshNET_raw"
    if root.exists():
        candidates.extend(root.rglob("Processed Data.zip"))
    downloads = Path.home() / "Downloads"
    if downloads.exists():
        candidates.extend(downloads.rglob("Processed Data.zip"))
    if not candidates:
        raise FileNotFoundError("Processed Data.zip was not found.")
    return max(candidates, key=lambda p: p.stat().st_mtime)


def load_model(repo: str):
    weights = hf_hub_download(repo_id=repo, filename="model_weights.pth")
    config_file = hf_hub_download(repo_id=repo, filename="config.json")
    vocab_file = hf_hub_download(repo_id=repo, filename="vocab.json")
    config = json.loads(Path(config_file).read_text(encoding="utf-8"))
    vocab = json.loads(Path(vocab_file).read_text(encoding="utf-8"))
    if isinstance(vocab, dict):
        vocab = {int(k): str(v) for k, v in vocab.items()}

    def label(i: int) -> str:
        if isinstance(vocab, dict):
            return str(vocab.get(i, "Unknown"))
        return str(vocab[i]) if 0 <= i < len(vocab) else "Unknown"

    model = create_vision_model(resnet18, config["n_classes"])
    checkpoint = torch.load(weights, map_location="cpu")
    model.load_state_dict(checkpoint["state_dict"] if isinstance(checkpoint, dict) and "state_dict" in checkpoint else checkpoint)
    model.eval()
    preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(config.get("img_size", 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return model, preprocess, label


def prediction_to_status(raw: str) -> str:
    text = str(raw or "").strip().lower().replace("_", " ").replace("-", " ")
    if text == "fresh": return "Fresh"
    if text in {"slightly spoiled", "slightly spoil", "mildly spoiled"}: return "Slightly Spoiled"
    if text in {"rotten", "spoiled", "rot"}: return "Spoiled"
    if text in {"unripe", "raw", "not ripe"}: return "Unripe"
    return text.title() if text else "Unknown"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend-dir", default=str(Path.cwd()))
    parser.add_argument("--model-repo", default=DEFAULT_REPO)
    parser.add_argument("--test-size", type=float, default=0.20)
    parser.add_argument("--max-images", type=int, default=0)
    args = parser.parse_args()

    backend = Path(args.backend_dir).resolve()
    models = backend / "ml_training" / "models"
    models.mkdir(parents=True, exist_ok=True)
    dataset_zip = find_dataset(backend)

    records: list[tuple[str, str, str]] = []
    with zipfile.ZipFile(dataset_zip, "r") as zf:
        for info in zf.infolist():
            if info.is_dir() or Path(info.filename).suffix.lower() not in IMAGE_EXTS:
                continue
            parts = info.filename.replace("\\", "/").split("/")
            if len(parts) < 2:
                continue
            true_label = parse_stage(parts[-2])
            if true_label:
                records.append((info.filename, true_label, group_id(Path(info.filename).name)))

    if args.max_images > 0:
        records = records[:args.max_images]
    if not records:
        raise RuntimeError("No labeled images were found in the dataset.")

    groups = np.array([row[2] for row in records])
    splitter = GroupShuffleSplit(n_splits=1, test_size=args.test_size, random_state=42)
    _, test_idx = next(splitter.split(np.zeros(len(records)), np.zeros(len(records)), groups=groups))
    test_records = [records[i] for i in test_idx]

    model, preprocess, get_label = load_model(args.model_repo)
    y_true: list[str] = []
    y_pred: list[str] = []
    started = time.time()

    with zipfile.ZipFile(dataset_zip, "r") as zf:
        for number, (name, true_label, _) in enumerate(test_records, start=1):
            try:
                image = Image.open(io.BytesIO(zf.read(name))).convert("RGB")
                tensor = preprocess(image).unsqueeze(0)
                with torch.no_grad():
                    probabilities = torch.softmax(model(tensor), dim=1)[0]
                predicted = prediction_to_status(get_label(int(torch.argmax(probabilities).item())))
                y_true.append(true_label)
                y_pred.append(predicted)
            except (OSError, UnidentifiedImageError, ValueError):
                continue
            if number % 100 == 0 or number == len(test_records):
                print(f"Evaluation: {number}/{len(test_records)}")

    labels = sorted(set(y_true) | set(y_pred))
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)),
        "precision_weighted": float(precision_score(y_true, y_pred, average="weighted", zero_division=0)),
        "recall_weighted": float(recall_score(y_true, y_pred, average="weighted", zero_division=0)),
        "f1_weighted": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
    }

    output = models / "freshness_classification_metadata.json"
    payload = {
        "evaluation": {
            "type": "held_out_group_classification",
            "random_state": 42,
            "test_size": args.test_size,
            "total_labeled_images": len(records),
            "test_images_evaluated": len(y_true),
            "unique_test_groups": len({records[i][2] for i in test_idx}),
            "evaluation_seconds": round(time.time() - started, 2),
        },
        "model": {"name": "FreshLens Local Freshness Model", "repository": args.model_repo},
        "labels": labels,
        "metrics": metrics,
        "per_class": classification_report(y_true, y_pred, labels=labels, output_dict=True, zero_division=0),
        "confusion_matrix": {"labels": labels, "matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist()},
        "notes": [
            "Metrics are computed on a deterministic 20% group-held-out labeled split.",
            "Dashboard scan history is not used as the classification test set.",
            "These are external evaluation values for the packaged model, not its original training benchmark.",
            "Per-image confidence is different from dataset-level evaluation metrics.",
        ],
    }
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print("\n=== CLASSIFICATION EVALUATION COMPLETE ===")
    print(f"Accuracy: {metrics['accuracy'] * 100:.2f}%")
    print(f"Macro Precision: {metrics['precision_macro'] * 100:.2f}%")
    print(f"Macro Recall: {metrics['recall_macro'] * 100:.2f}%")
    print(f"Macro F1: {metrics['f1_macro'] * 100:.2f}%")
    print("Metadata:", output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
