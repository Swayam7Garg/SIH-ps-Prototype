"""
schemas/rainfall.py
-------------------
Pydantic schemas for the rainfall API endpoints.

These are the public-facing shapes returned to the frontend / API consumers.
They are intentionally kept simple for Sprint 2 – serialise grid values as
flat lists so JSON serialisation works without extra dependencies.
"""

from __future__ import annotations

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Grid Cell & Stats Schemas
# ---------------------------------------------------------------------------

class PeakLocation(BaseModel):
    name: str
    lat: float
    lon: float
    value: float


class RainfallStats(BaseModel):
    min_rainfall: float = 0.0
    max_rainfall: float = 0.0
    mean_rainfall: float = 0.0
    active_cells_count: int = 0
    heavy_rain_area_km2: float = 0.0
    peak_location: Optional[PeakLocation] = None


class GridCell(BaseModel):
    lat: float
    lon: float
    rainfall_mm: float
    level: str  # 'none' | 'light' | 'moderate' | 'heavy' | 'very_heavy' | 'extremely_heavy'
    level_label: str
    alert: str  # 'None' | 'Green' | 'Yellow' | 'Orange' | 'Red'
    color: str
    opacity: float = 0.75
    bounds: List[List[float]]  # [[south, west], [north, east]]


# ---------------------------------------------------------------------------
# /api/rainfall/metadata
# ---------------------------------------------------------------------------

class RainfallMetadata(BaseModel):
    """Summary information about the loaded rainfall dataset."""

    source_file: str
    file_format: str
    region_name: str
    time_range_start: Optional[str] = None
    time_range_end: Optional[str] = None
    n_timesteps: int
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float
    lat_resolution: float
    lon_resolution: float
    n_lat: int
    n_lon: int
    rainfall_variable: str = "precipitationCal"
    original_unit: str = "mm/hr"
    stored_unit: str = "mm"


# ---------------------------------------------------------------------------
# /api/rainfall/frames & /api/rainfall/timestamps
# ---------------------------------------------------------------------------

class TimestampSummary(BaseModel):
    timestamp: str
    formatted_time: str
    max_rainfall: float
    mean_rainfall: float
    active_alert: str
    peak_area: str


class RainfallFrameList(BaseModel):
    timestamps: List[str]
    frames_summary: List[TimestampSummary]
    n_frames: int
    default_timestamp: str


# ---------------------------------------------------------------------------
# /api/rainfall/map/{timestamp}
# ---------------------------------------------------------------------------

class RainfallMapResponse(BaseModel):
    """
    Complete spatial grid data for a specific timestamp.
    Provides everything the frontend Leaflet map needs to render
    geographically accurate rainfall layers.
    """

    timestamp: str
    region_name: str
    unit: str = "mm"
    bounds: List[List[float]]  # [[lat_min, lon_min], [lat_max, lon_max]]
    center: List[float]  # [lat_center, lon_center]
    zoom: int = 8
    lat_resolution: float
    lon_resolution: float
    n_lat: int
    n_lon: int
    latitudes: List[float]
    longitudes: List[float]
    stats: RainfallStats
    cells: List[GridCell]
    available_timestamps: List[str]


# ---------------------------------------------------------------------------
# /api/rainfall/frame/{timestamp}
# ---------------------------------------------------------------------------

class RainfallFrame(BaseModel):
    """
    2-D rainfall grid matrix representation.
    """

    timestamp: str
    latitudes: List[float]
    longitudes: List[float]
    rainfall_mm: List[List[Optional[float]]]
    unit: str = "mm"
    n_lat: int
    n_lon: int
    stats: RainfallStats
