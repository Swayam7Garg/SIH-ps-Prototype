"""
Main entry point for the AI Rainfall & Flood Warning System backend.
Initialises the FastAPI app, includes routers, and configures CORS
so the React frontend can communicate during development.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import alerts, dem, flood, health, prediction, rainfall  # API router modules

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    app = FastAPI(
        title="AI Rainfall & Flood Warning System",
        description=(
            "AI/ML-Based Integrated Heavy Rainfall Early Warning and "
            "Inundation Prediction System"
        ),
        version="0.1.0",
    )

    # Allow the React dev server (port 5173) to hit the API without CORS errors.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health.router, prefix="/api")
    app.include_router(rainfall.router, prefix="/api")
    app.include_router(prediction.router, prefix="/api")
    app.include_router(dem.router, prefix="/api")
    app.include_router(flood.router, prefix="/api")
    app.include_router(alerts.router, prefix="/api")

    return app


app = create_app()
