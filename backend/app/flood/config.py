"""
flood/config.py
----------------
Configurable weights, normalization thresholds, and classification bands
for the simplified multi-criteria inundation susceptibility model.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict
from pydantic import BaseModel, Field

from app.utils.config import DEM_DIR

# ---------------------------------------------------------------------------
# Default Configuration Constants
# ---------------------------------------------------------------------------

DEFAULT_FLOOD_CONFIG = {
    "model_name": "Simplified Multi-Criteria Inundation Susceptibility Model",
    "disclaimer": (
        "Simplified Inundation Risk Estimate (Hackathon Prototype). "
        "Not a hydrodynamic flood simulation or hydraulic routing model."
    ),
    "weights": {
        "rainfall_weight": 0.50,
        "elevation_weight": 0.30,
        "slope_weight": 0.20,
    },
    "normalization": {
        "rainfall_max_norm_mm": 150.0,   # Rainfall above 150mm reaches max hazard score of 1.0
        "elevation_max_norm_m": 400.0,   # Elevations below 400m have flood vulnerability; higher terrain -> 0
        "slope_max_norm_deg": 12.0,      # Slopes < 12° have accumulation potential; flat plains (< 2°) have max score
    },
    "thresholds": {
        "low": {"min": 0.0, "max": 0.30, "label": "Low Risk", "color": "#22c55e", "alert": "Green"},
        "moderate": {"min": 0.30, "max": 0.60, "label": "Moderate Risk", "color": "#eab308", "alert": "Yellow"},
        "high": {"min": 0.60, "max": 0.80, "label": "High Risk", "color": "#f97316", "alert": "Orange"},
        "very_high": {"min": 0.80, "max": 1.00, "label": "Very High Inundation Risk", "color": "#ef4444", "alert": "Red"},
    },
    "cell_area_km2": 121.0,  # ~11km x 11km at ~10° latitude (0.1° resolution)
}


class FloodRiskWeights(BaseModel):
    rainfall_weight: float = Field(default=0.50, ge=0.0, le=1.0)
    elevation_weight: float = Field(default=0.30, ge=0.0, le=1.0)
    slope_weight: float = Field(default=0.20, ge=0.0, le=1.0)


class FloodConfigManager:
    """Manages reading and writing flood model configuration from disk."""

    def __init__(self):
        self.config_path = DEM_DIR / "flood_risk_config.json"
        self._config_cache = None

    def get_config(self) -> Dict[str, Any]:
        if self._config_cache is not None:
            return self._config_cache

        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self._config_cache = json.load(f)
                return self._config_cache
            except Exception as e:
                print(f"[FloodConfigManager] Error reading config: {e}")

        self._config_cache = DEFAULT_FLOOD_CONFIG
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_FLOOD_CONFIG, f, indent=2)
        except Exception:
            pass

        return self._config_cache


flood_config_manager = FloodConfigManager()
