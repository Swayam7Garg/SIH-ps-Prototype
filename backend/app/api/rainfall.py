"""
api/rainfall.py
----------------
FastAPI router for rainfall grid data, map overlays, metadata, and timeline controls.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.schemas.rainfall import (
    RainfallFrameList,
    RainfallMapResponse,
    RainfallMetadata,
)
from app.services.rainfall_service import (
    WEATHER_STATIONS,
    rainfall_service,
)

router = APIRouter(prefix="/rainfall", tags=["Rainfall"])


@router.get("/metadata", response_model=RainfallMetadata)
def get_rainfall_metadata() -> RainfallMetadata:
    """
    Get summary metadata for the loaded rainfall dataset.
    """
    try:
        return rainfall_service.get_metadata()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/frames", response_model=RainfallFrameList)
def get_rainfall_frames() -> RainfallFrameList:
    """
    Get list of all available timestamps with stats summaries for timeline control.
    """
    try:
        return rainfall_service.get_available_timestamps()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/map/{timestamp:path}", response_model=RainfallMapResponse)
def get_rainfall_map_by_timestamp(timestamp: str) -> RainfallMapResponse:
    """
    Get the complete spatial rainfall grid for a specific timestamp (e.g. '2024-07-30T04:00:00Z' or 'latest').
    Returns exact geographic cell bounding boxes, IMD intensity levels, colors,
    and regional statistics for Leaflet map rendering.
    """
    try:
        return rainfall_service.get_map_data(timestamp)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rainfall map: {str(e)}")


@router.get("/stations")
def get_weather_stations():
    """
    Get reference meteorological station and rain-gauge locations for map overlay.
    """
    return {"stations": WEATHER_STATIONS}
