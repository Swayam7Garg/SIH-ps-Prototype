"""
api/prediction.py
------------------
FastAPI router for AI rainfall nowcasting and model metadata.
"""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

from app.ml.predict import rainfall_predictor
from app.schemas.prediction import (
    ModelInfoResponse,
    RainfallPredictionRequest,
    RainfallPredictionResponse,
)
from app.utils.config import BASE_DIR

MODELS_DIR = BASE_DIR.parent / "models" if (BASE_DIR.parent / "models").exists() else BASE_DIR / "models"

router = APIRouter(prefix="/prediction", tags=["AI Prediction"])


@router.post("/rainfall", response_model=RainfallPredictionResponse)
def predict_rainfall(request: RainfallPredictionRequest) -> RainfallPredictionResponse:
    """
    Generate 1–3 hour spatial rainfall nowcast given a starting timestamp t.
    Uses previous 4 frames [t-3, t-2, t-1, t] to predict [t+1, t+2, t+3].
    """
    try:
        res = rainfall_predictor.predict_future(
            start_timestamp=request.start_timestamp,
            horizon_steps=request.horizon_hours,
            model_choice=request.model_type,
        )
        return RainfallPredictionResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/model-info", response_model=ModelInfoResponse)
def get_model_info() -> ModelInfoResponse:
    """
    Return model architecture, training split info, and benchmark evaluation metrics against baseline.
    """
    metrics_path = MODELS_DIR / "rainfall_nowcast_metrics.json"
    if not metrics_path.exists():
        from app.ml.train import run_training_pipeline
        run_training_pipeline()

    try:
        with open(metrics_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return ModelInfoResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read model info: {str(e)}")
