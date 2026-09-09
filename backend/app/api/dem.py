"""
api/dem.py
-----------
FastAPI router for SRTM Digital Elevation Model (DEM) data, terrain slope grids, and topographic landmarks.
"""

from fastapi import APIRouter, HTTPException

from app.flood.dem_service import dem_service
from app.schemas.flood import (
    DEMElevationResponse,
    DEMMetadata,
    DEMSlopeResponse,
)

router = APIRouter(prefix="/dem", tags=["DEM Terrain"])


@router.get("/metadata", response_model=DEMMetadata)
def get_dem_metadata() -> DEMMetadata:
    """
    Get SRTM DEM metadata: spatial bounds, resolution, coordinate system,
    elevation range (min/max/mean), slope range, and key geographic peaks.
    """
    try:
        data = dem_service.get_metadata()
        return DEMMetadata(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch DEM metadata: {str(e)}")


@router.get("/elevation", response_model=DEMElevationResponse)
def get_dem_elevation() -> DEMElevationResponse:
    """
    Get 0.1° gridded SRTM elevation dataset aligned with the GPM IMERG rainfall coordinates.
    Includes hypsometric tinting color codes, cell bounding boxes, and landmark elevations.
    """
    try:
        data = dem_service.get_elevation_grid()
        return DEMElevationResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch elevation grid: {str(e)}")


@router.get("/slope", response_model=DEMSlopeResponse)
def get_dem_slope() -> DEMSlopeResponse:
    """
    Get gridded terrain slope calculations (in degrees) using central finite differences.
    Classified into water accumulation susceptibility categories (flat plains to steep escarpments).
    """
    try:
        data = dem_service.get_slope_grid()
        return DEMSlopeResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch terrain slope grid: {str(e)}")
