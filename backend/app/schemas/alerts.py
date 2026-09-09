"""
schemas/alerts.py
------------------
Pydantic schemas for multi-hazard rainfall & inundation prototype alert engine.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AlertEvaluateRequest(BaseModel):
    timestamp: Optional[str] = Field(
        default=None,
        description="ISO timestamp for historical or predicted rainfall frame (e.g. '2024-07-30T04:00:00Z')",
    )
    rainfall_grid: Optional[List[List[float]]] = Field(
        default=None,
        description="Optional 2D grid of rainfall values (mm)",
    )
    flood_risk_grid: Optional[List[List[float]]] = Field(
        default=None,
        description="Optional 2D grid of flood risk scores",
    )
    custom_thresholds: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional overrides for prototype alert thresholds",
    )


class CellAlert(BaseModel):
    lat: float
    lon: float
    rainfall_mm: float
    elevation_m: float
    slope_deg: float
    flood_risk_score: float
    alert_level: str
    alert_label: str
    color: str
    bounds: List[List[float]]


class LandmarkAlert(BaseModel):
    name: str
    lat: float
    lon: float
    type: str = "landmark"
    rainfall_mm: float
    elevation_m: float
    slope_deg: float
    flood_risk_score: float
    alert_level: str
    alert_label: str
    color: str


class AlertFactor(BaseModel):
    name: str
    label: str
    contribution: float = Field(..., description="Normalized contribution factor between 0.0 and 1.0")


class AlertEvaluateResponse(BaseModel):
    alert_level: str = Field(..., description="Overall alert level (e.g. 'RED', 'ORANGE', 'YELLOW', 'NORMAL')")
    overall_alert: str
    alert_color: str
    alert_label: str
    action_guidance: str
    disclaimer: str
    scientific_notice: Optional[str] = None
    timestamp: str
    rainfall_alert: str
    flood_alert: str
    affected_area: float
    affected_area_km2: float
    high_risk_area_km2: float
    high_risk_percentage: float
    total_monitored_area_km2: float
    cells_by_alert: Dict[str, int]
    factors: List[AlertFactor]
    reasons: List[str]
    thresholds_summary: Dict[str, Any]
    key_hotspots: List[Dict[str, Any]]
    landmarks_alert: List[LandmarkAlert]
    cell_alerts: List[CellAlert]

