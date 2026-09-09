"""
ml/train.py
------------
Training & evaluation pipeline for the rainfall nowcasting model.
- Enforces strict temporal train/val/test split (no temporal leakage)
- Trains Spatio-Temporal Convolutional Nowcaster
- Evaluates against Persistence Baseline
- Saves model weights and metrics report to models/ directory
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from app.ml.metrics import evaluate_prediction
from app.ml.rainfall_dataset import RainfallDataset
from app.ml.rainfall_model import PersistenceBaselineModel, SpatioTemporalNowcasterModel
from app.services.rainfall_service import rainfall_service
from app.utils.config import BASE_DIR

MODELS_DIR = BASE_DIR.parent / "models" if (BASE_DIR.parent / "models").exists() else BASE_DIR / "models"


def run_training_pipeline() -> Dict[str, Any]:
    """
    Executes end-to-end model training, evaluation against baseline, and saving.
    """
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_save_path = MODELS_DIR / "rainfall_nowcast_model.json"
    metrics_save_path = MODELS_DIR / "rainfall_nowcast_metrics.json"

    # 1. Load dataset
    raw_data = rainfall_service._dataset_cache
    if raw_data is None:
        rainfall_service._ensure_dataset_loaded()
        raw_data = rainfall_service._dataset_cache

    dataset = RainfallDataset(
        frames_dict=raw_data["frames"],
        latitudes=raw_data["latitudes"],
        longitudes=raw_data["longitudes"],
        sequence_length=4,
    )

    # 2. Strict Temporal Split (No Data Leakage)
    train_samples, val_samples, test_samples = dataset.temporal_train_val_test_split(
        train_ratio=0.6, val_ratio=0.15
    )

    # 3. Baseline & ML Models
    baseline_model = PersistenceBaselineModel()
    ml_model = SpatioTemporalNowcasterModel(sequence_length=4)

    # 4. Train ML Model
    train_stats = ml_model.fit(train_samples, val_samples)

    # 5. Evaluate on Test Set
    eval_samples = test_samples if test_samples else (val_samples if val_samples else train_samples)

    baseline_maes = []
    baseline_rmses = []
    ml_maes = []
    ml_rmses = []

    last_baseline_eval = None
    last_ml_eval = None

    for sample in eval_samples:
        inp = sample["input_grids"]
        act = sample["target_grid"]

        pred_base = baseline_model.predict(inp)
        pred_ml = ml_model.predict(inp)

        eval_base = evaluate_prediction(act, pred_base)
        eval_ml = evaluate_prediction(act, pred_ml)

        baseline_maes.append(eval_base["mae_mm"])
        baseline_rmses.append(eval_base["rmse_mm"])
        ml_maes.append(eval_ml["mae_mm"])
        ml_rmses.append(eval_ml["rmse_mm"])

        last_baseline_eval = eval_base
        last_ml_eval = eval_ml

    avg_baseline_mae = round(sum(baseline_maes) / len(baseline_maes), 3) if baseline_maes else 0.0
    avg_baseline_rmse = round(sum(baseline_rmses) / len(baseline_rmses), 3) if baseline_rmses else 0.0

    avg_ml_mae = round(sum(ml_maes) / len(ml_maes), 3) if ml_maes else 0.0
    avg_ml_rmse = round(sum(ml_rmses) / len(ml_rmses), 3) if ml_rmses else 0.0

    mae_improvement = (
        round(((avg_baseline_mae - avg_ml_mae) / avg_baseline_mae) * 100, 2)
        if avg_baseline_mae > 0
        else 0.0
    )
    rmse_improvement = (
        round(((avg_baseline_rmse - avg_ml_rmse) / avg_baseline_rmse) * 100, 2)
        if avg_baseline_rmse > 0
        else 0.0
    )

    metrics_report = {
        "model_name": ml_model.name,
        "model_type": "Spatio-Temporal Convolutional ML Nowcaster",
        "dataset_info": {
            "source": "GPM IMERG V07B 0.1° Gridded",
            "region": raw_data.get("region_name", "Kerala & Western Ghats Basin"),
            "grid_dimensions": f"{len(raw_data['latitudes'])} x {len(raw_data['longitudes'])}",
            "total_timesteps": len(raw_data["timestamps"]),
            "sequence_input_length": 4,
            "prediction_horizon_steps": "1 to 3 frames",
            "train_samples": len(train_samples),
            "val_samples": len(val_samples),
            "test_samples": len(test_samples),
            "leakage_prevention": "Strict temporal sequence split (time-ordered)",
        },
        "evaluation_metrics": {
            "persistence_baseline": {
                "test_mae_mm": avg_baseline_mae,
                "test_rmse_mm": avg_baseline_rmse,
                "csi_summary": last_baseline_eval.get("csi_summary", {}) if last_baseline_eval else {},
            },
            "spatiotemporal_ml_model": {
                "test_mae_mm": avg_ml_mae,
                "test_rmse_mm": avg_ml_rmse,
                "csi_summary": last_ml_eval.get("csi_summary", {}) if last_ml_eval else {},
                "mae_improvement_vs_baseline_pct": mae_improvement,
                "rmse_improvement_vs_baseline_pct": rmse_improvement,
            },
        },
        "scientific_limitations": (
            "Prototype model trained on historical monsoon event sequences. "
            "Suitable for short-term spatial advection-diffusion nowcasting (1–3 hours). "
            "Not for official operational safety warnings."
        ),
    }

    # 6. Save Model and Metrics
    ml_model.save(model_save_path)
    with open(metrics_save_path, "w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2)

    return metrics_report


if __name__ == "__main__":
    report = run_training_pipeline()
    print("Training Complete!")
    print(f"ML Model MAE: {report['evaluation_metrics']['spatiotemporal_ml_model']['test_mae_mm']} mm")
    print(f"Baseline MAE: {report['evaluation_metrics']['persistence_baseline']['test_mae_mm']} mm")
    print(f"Improvement: {report['evaluation_metrics']['spatiotemporal_ml_model']['mae_improvement_vs_baseline_pct']}%")
