from __future__ import annotations

import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

BACKEND = Path.cwd().resolve()
TEMPLATE_DIR = Path(__file__).resolve().parent


def find_one(name: str) -> Path:
    exact_candidates = [
        BACKEND / name,
        BACKEND / "app" / "services" / name,
        BACKEND / "ml_training" / name,
    ]
    for p in exact_candidates:
        if p.exists():
            return p
    matches = sorted(BACKEND.rglob(name))
    if not matches:
        raise FileNotFoundError(f"Could not find {name} under {BACKEND}")
    return matches[0]


def backup(path: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = path.with_name(f"{path.stem}.BACKUP_STEP3_{stamp}{path.suffix}")
    shutil.copy2(path, dest)
    return dest


def patch_trainer(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if "food_prior_days" in text and "Universal shelf-life regression" in text:
        print(f"Trainer already patched: {path}")
        return
    if "import zipfile" not in text:
        text = text.replace("import time\n", "import time\nimport zipfile\n", 1)
    start = text.index("def train_model(")
    end = text.index("\ndef main(", start)
    template = (TEMPLATE_DIR / "build_and_train_shelf_life_UNIVERSAL.py").read_text(encoding="utf-8")
    ts = template.index("def train_model(")
    te = template.index("\ndef main(", ts)
    text = text[:start] + template[ts:te] + text[end:]
    path.write_text(text, encoding="utf-8")
    print(f"Patched trainer: {path}")


def patch_analyzer(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if "food_prior_days" in text and "universal trained XGBoost bundle" in text:
        print(f"Analyzer already patched: {path}")
        return

    block_start = text.index("# V1 training data contains these eight food classes.")
    block_end = text.index("def load_shelf_life_model", block_start)
    template = (TEMPLATE_DIR / "analyzer_XGB_UNIVERSAL.py").read_text(encoding="utf-8")
    ns = template.index("# Resolve shelf-life food identity dynamically from learned model metadata.")
    ne = template.index("def load_shelf_life_model", ns)
    text = text[:block_start] + template[ns:ne] + text[block_end:]

    old_guard = '''        if "model" not in bundle or "preprocessor" not in bundle:
            raise KeyError("Shelf-life model bundle is missing model/preprocessor.")
'''
    new_guard = '''        if "model" not in bundle or "feature_columns" not in bundle:
            raise KeyError("Shelf-life model bundle is missing model/feature_columns.")
'''
    if old_guard in text:
        text = text.replace(old_guard, new_guard, 1)

    ps = text.index("def predict_shelf_life_xgb(")
    pe = text.index("def apply_xgb_shelf_life_prediction", ps)
    ps2 = template.index("def predict_shelf_life_xgb(")
    pe2 = template.index("def apply_xgb_shelf_life_prediction", ps2)
    text = text[:ps] + template[ps2:pe2] + text[pe:]
    path.write_text(text, encoding="utf-8")
    print(f"Patched analyzer: {path}")


def main() -> int:
    trainer = find_one("build_and_train_shelf_life.py")
    analyzer = find_one("analyzer.py")
    print(f"Backend:  {BACKEND}")
    print(f"Trainer:  {trainer}")
    print(f"Analyzer: {analyzer}")
    print("\nCreating backups...")
    print("Backup trainer:", backup(trainer))
    print("Backup analyzer:", backup(analyzer))
    patch_trainer(trainer)
    patch_analyzer(analyzer)

    print("\nStarting retraining with universal XGBoost...")
    result = subprocess.run(
        [sys.executable, str(trainer), "--backend-dir", str(BACKEND)],
        cwd=str(BACKEND),
    )
    if result.returncode != 0:
        print(f"\nTraining failed with exit code {result.returncode}.")
        return result.returncode

    model_path = BACKEND / "ml_training" / "models" / "shelf_life_xgb.joblib"
    meta_path = BACKEND / "ml_training" / "models" / "shelf_life_xgb_metadata.json"
    if not model_path.exists() or not meta_path.exists():
        print("Training finished, but model artifacts were not created.")
        return 2

    print("\nSTEP 3 COMPLETE")
    print("Universal XGBoost model:", model_path)
    print("Metadata:", meta_path)
    print("All food classes can now reach the ML shelf-life regressor; unseen foods use the learned global prior instead of a hard-coded class rejection.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
