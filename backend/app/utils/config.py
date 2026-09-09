"""
Application configuration loaded from environment variables (with sensible defaults).
Use a .env file (copied from .env.example) for local overrides — never commit secrets.
"""

import os
from pathlib import Path

# Absolute path to the repo root (two levels up from this file)
BASE_DIR: Path = Path(__file__).resolve().parents[2]

# Paths to pre-downloaded data directories
DATA_DIR: Path = BASE_DIR.parent / "data"
RAINFALL_DIR: Path = DATA_DIR / "rainfall"
DEM_DIR: Path = DATA_DIR / "dem"
OBSERVATIONS_DIR: Path = DATA_DIR / "observations"

# FastAPI server settings (used when running with uvicorn programmatically)
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
RELOAD: bool = os.getenv("RELOAD", "true").lower() == "true"
