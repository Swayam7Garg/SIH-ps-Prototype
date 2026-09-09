"""
schemas/prediction.py
----------------------
Pydantic schemas for AI rainfall nowcasting and model metadata endpoints.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.rainfall import GridCell, RainfallStats


class RainfallPredictionRequest(BaseModel):
    start_timestamp: str = Field(
        ..., description="ISO-8601 timestamp representing t=0 (last observed frame)"
    )
    horizon_hours: int = Field(
        default=3, ge=1, le=3, description="Number of future forecast horizons (1, 2, or 3 hours)"
    )
    model_type: str = Field(
        default="spatiotemporal", description="'spatiotemporal' (Conv-ML) or 'baseline' (Persistence)"
    )


class PredictedFrame(BaseModel):
    horizon_step: int
    horizon_label: str
    timestamp: str
    formatted_time: str
    has_actual_ground_truth: bool = False
    actual_timestamp: Optional[str] = None
    stats: RainfallStats
    cells: List[GridCell]
    evaluation_against_actual: Optional[Dict[str, Any]] = None


class RainfallPredictionResponse(BaseModel):
    start_timestamp: str
    prediction_horizon_steps: int
    model_name: str
    model_type: str
    region_name: str
    unit: str = "mm"
    bounds: List[List[float]]
    center: List[float]
    lat_resolution: float
    lon_resolution: float
    n_lat: int
    n_lon: int
    latitudes: List[float]
    longitudes: List[float]
    frames: List[PredictedFrame]
    scientific_disclaimer: str


class ModelInfoResponse(BaseModel):
    model_name: str
    model_type: str
    dataset_info: Dict[str, Any]
    evaluation_metrics: Dict[str, Any]
    scientific_limitations: str
