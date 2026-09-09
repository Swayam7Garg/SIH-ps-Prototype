"""
api/flood.py
-------------
FastAPI router for simplified multi-criteria rainfall + terrain based flood inundation risk prediction.
"""

from fastapi import APIRouter, HTTPException

from app.flood.config import flood_config_manager
from app.flood.inundation_service import inundation_service
from app.schemas.flood import (
    FloodPredictionRequest,
    InundationPredictionResponse,
)

router = APIRouter(prefix="/flood", tags=["Inundation Risk"])


@router.post("/predict", response_model=InundationPredictionResponse)
def predict_flood_risk(request: FloodPredictionRequest) -> InundationPredictionResponse:
    """
    Calculate simplified multi-criteria inundation susceptibility index combining:
    - Predicted or observed rainfall intensity (0.5 weight default)
    - SRTM terrain elevation (0.3 weight default)
    - Terrain slope / water accumulation potential (0.2 weight default)
    
    IMPORTANT: Clearly labeled as "Simplified Inundation Risk Estimate",
    not a hydrodynamic flood simulation.
    """
    try:
        data = inundation_service.compute_inundation_risk(
            timestamp=request.predicted_rainfall_timestamp,
            rainfall_grid=request.rainfall_grid,
            custom_weights=request.custom_weights,
        )
        return InundationPredictionResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inundation risk estimation failed: {str(e)}")


@router.get("/config")
def get_flood_risk_config():
    """
    Get configurable weights, normalization constants, and risk band thresholds.
    """
    try:
        return flood_config_manager.get_config()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch flood config: {str(e)}")
