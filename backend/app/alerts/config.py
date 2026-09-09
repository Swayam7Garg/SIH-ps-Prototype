"""
alerts/config.py
-----------------
Configurable prototype alert thresholds combining precipitation intensity
and multi-criteria flood inundation susceptibility scores.

DISCLAIMER:
Prototype alert thresholds inspired by operational warning concepts.
Not official IMD or NDMA disaster alerts.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict
from pydantic import BaseModel, Field

from app.utils.config import BASE_DIR

ALERTS_DIR = BASE_DIR.parent / "data" / "alerts" if (BASE_DIR.parent / "data").exists() else BASE_DIR / "data" / "alerts"

# ---------------------------------------------------------------------------
# Default Prototype Alert Configuration
# ---------------------------------------------------------------------------

DEFAULT_ALERT_CONFIG = {
    "engine_name": "Integrated Rainfall & Inundation Multi-Hazard Alert Engine",
    "disclaimer": "Prototype alert thresholds inspired by operational warning concepts.",
    "scientific_notice": (
        "This alert engine is a research prototype combining satellite/ML precipitation "
        "with topographic susceptibility. It does not replace official India Meteorological "
        "Department (IMD) or State Disaster Management Authority (SDMA) bulletins."
    ),
    "thresholds": {
        "YELLOW": {
            "label": "YELLOW (Advisory / Watch)",
            "color": "#eab308",
            "action": "Be updated on local weather & drainage conditions.",
            "rainfall_min_mm": 35.6,      # IMD Heavy Rain threshold
            "flood_risk_min": 0.30,       # Moderate inundation susceptibility
            "regional_pct_trigger": 5.0,  # 5% of basin
        },
        "ORANGE": {
            "label": "ORANGE (Alert / Be Prepared)",
            "color": "#f97316",
            "action": "Be prepared for localized inundation, waterlogging & runoff.",
            "rainfall_min_mm": 64.5,      # IMD Very Heavy Rain threshold
            "flood_risk_min": 0.60,       # High inundation susceptibility
            "regional_pct_trigger": 10.0, # 10% of basin
        },
        "RED": {
            "label": "RED (Warning / Take Action)",
            "color": "#ef4444",
            "action": "Take action for severe inundation threat in low-lying basins.",
            "rainfall_min_mm": 124.5,     # IMD Extremely Heavy Rain threshold
            "flood_risk_min": 0.80,       # Very High inundation susceptibility
            "compound_rain_min_mm": 64.5, # Compound trigger: heavy rain + very high flood risk
            "compound_risk_min": 0.60,
            "regional_pct_trigger": 5.0,  # 5% of basin in Red condition
        },
        "NORMAL": {
            "label": "NORMAL (Green / Safe)",
            "color": "#22c55e",
            "action": "No immediate severe rainfall or inundation alert active.",
        },
    },
    "cell_area_km2": 121.0,
}


class AlertConfigManager:
    """Manages reading and updating alert configuration from disk."""

    def __init__(self):
        self.config_path = ALERTS_DIR / "alert_thresholds_config.json"
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
                print(f"[AlertConfigManager] Error reading config: {e}")

        self._config_cache = DEFAULT_ALERT_CONFIG
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_ALERT_CONFIG, f, indent=2)
        except Exception:
            pass

        return self._config_cache


alert_config_manager = AlertConfigManager()
