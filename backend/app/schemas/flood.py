"""
schemas/flood.py
-----------------
Pydantic models for SRTM DEM elevation/slope data and multi-criteria flood inundation predictions.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# DEM Schemas
# ---------------------------------------------------------------------------

class DEMLandmark(BaseModel):
    name: str
    lat: float
    lon: float
    elev_m: float
    type: str = "landmark"


class DEMMetadata(BaseModel):
    source_file: str
    crs: str
    region_name: str
    spatial_resolution_deg: float
    spatial_resolution_km: str
    n_lat: int
    n_lon: int
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float
    bounds: List[List[float]]
    center: List[float]
    min_elevation_m: float
    max_elevation_m: float
    mean_elevation_m: float
    max_slope_deg: float
    mean_slope_deg: float
    landmarks: List[DEMLandmark]


class ElevationCell(BaseModel):
    lat: float
    lon: float
    elevation_m: float
    color: str
    label: str
    category: str
    bounds: List[List[float]]


class DEMElevationResponse(BaseModel):
    type: str = "elevation"
    unit: str = "meters (m)"
    region_name: str
    bounds: List[List[float]]
    center: List[float]
    latitudes: List[float]
    longitudes: List[float]
    stats: Dict[str, Any]
    cells: List[ElevationCell]
    landmarks: List[DEMLandmark]


class SlopeCell(BaseModel):
    lat: float
    lon: float
    slope_deg: float
    elevation_m: float
    color: str
    label: str
    category: str
    accumulation_hazard: str
    bounds: List[List[float]]


class DEMSlopeResponse(BaseModel):
    type: str = "slope"
    unit: str = "degrees (°)"
    region_name: str
    bounds: List[List[float]]
    center: List[float]
    latitudes: List[float]
    longitudes: List[float]
    stats: Dict[str, Any]
    cells: List[SlopeCell]


# ---------------------------------------------------------------------------
# Flood Inundation Prediction Schemas
# ---------------------------------------------------------------------------

class FloodPredictionRequest(BaseModel):
    predicted_rainfall_timestamp: Optional[str] = Field(
        default=None,
        description="ISO timestamp for historical or predicted rainfall frame (e.g. '2024-07-30T04:00:00Z')",
    )
    rainfall_grid: Optional[List[List[float]]] = Field(
        default=None,
        description="Optional 2D grid of rainfall values (mm) to use directly",
    )
    custom_weights: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional override for weights: {'rainfall_weight': 0.5, 'elevation_weight': 0.3, 'slope_weight': 0.2}",
    )


class FloodRiskExplanation(BaseModel):
    disclaimer: Optional[str] = None
    rainfall_contribution: float
    elevation_contribution: float
    slope_contribution: float
    overall_risk: float
    formula: str
    interpretation: Optional[str] = None


class FloodRiskSummary(BaseModel):
    low_pixels: int
    moderate_pixels: int
    high_pixels: int
    very_high_pixels: int
    high_risk_pixels_total: int
    percentage_high_or_vhigh_risk: float
    percentage_very_high_risk: float
    percentage_moderate_risk: float
    percentage_low_risk: float
    estimated_high_risk_area_km2: float
    estimated_very_high_risk_area_km2: float
    total_monitored_area_km2: float


class InundationCell(BaseModel):
    lat: float
    lon: float
    rainfall_mm: float
    elevation_m: float
    slope_deg: float
    rainfall_score: float
    elevation_score: float
    slope_score: float
    risk_score: float
    risk_level: str
    risk_label: str
    color: str
    alert: str
    bounds: List[List[float]]


class InundationPredictionResponse(BaseModel):
    model_type: str
    disclaimer: str
    model_category: str
    timestamp: str
    bounds: List[List[float]]
    center: List[float]
    grid_dimensions: Dict[str, int]
    cell_area_km2: float
    weights: Dict[str, float]
    explanation: FloodRiskExplanation
    risk_summary: FloodRiskSummary
    risk_matrix: List[List[float]]
    cells: List[InundationCell]
    top_hotspots: List[Dict[str, Any]]
    landmarks_status: List[Dict[str, Any]]
