"""
api/alerts.py
--------------
FastAPI router for integrated rainfall and flood inundation multi-hazard alert engine.
"""

from fastapi import APIRouter, HTTPException

from app.alerts.alert_engine import alert_engine
from app.alerts.config import alert_config_manager
from app.schemas.alerts import (
    AlertEvaluateRequest,
    AlertEvaluateResponse,
)

router = APIRouter(prefix="/alerts", tags=["Multi-Hazard Alerts"])


@router.post("/evaluate", response_model=AlertEvaluateResponse)
def evaluate_alerts(request: AlertEvaluateRequest) -> AlertEvaluateResponse:
    """
    Evaluate operational early-warning alert levels combining predicted/observed
    precipitation intensity with SRTM DEM flood inundation susceptibility scores.
    
    IMPORTANT: Prototype alert thresholds inspired by operational warning concepts.
    Not official IMD/NDMA disaster alerts.
    """
    try:
        data = alert_engine.evaluate_alerts(
            timestamp=request.timestamp,
            rainfall_grid=request.rainfall_grid,
            flood_risk_grid=request.flood_risk_grid,
            custom_thresholds=request.custom_thresholds,
        )
        return AlertEvaluateResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alert evaluation failed: {str(e)}")


@router.get("/config")
def get_alert_config():
    """
    Get configurable prototype alert thresholds (YELLOW, ORANGE, RED).
    """
    try:
        return alert_config_manager.get_config()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alert config: {str(e)}")
