"""
Health-check router.

GET /api/health  — returns a simple status payload confirming the backend is up.
This is the first endpoint consumed by the React frontend to verify connectivity.
"""

from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return service health status."""
    return HealthResponse(
        status="ok",
        service="rainfall-flood-warning-system",
    )
