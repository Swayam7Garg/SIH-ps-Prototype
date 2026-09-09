"""
flood/inundation_service.py
----------------------------
Simplified multi-criteria rainfall and terrain-based inundation susceptibility estimation engine.

DISCLAIMER / SCIENTIFIC INTEGRITY:
This service provides a transparent, configurable multi-criteria index for early warning prototypes.
It is explicitly labeled as a "Simplified Inundation Risk Estimate" and NOT a hydrodynamic
flood simulation or Navier-Stokes hydraulic routing solver.

Risk Model Formulation:
-----------------------
1. rainfall_score  = min(1.0, rain_mm / rainfall_max_norm_mm)
2. elevation_score = max(0.0, (elevation_max_norm_m - elev_m) / elevation_max_norm_m)
3. slope_score     = max(0.0, (slope_max_norm_deg - slope_deg) / slope_max_norm_deg)

Combined Flood Risk Score:
--------------------------
flood_risk_score = (w_rain * rainfall_score) + (w_elev * elevation_score) + (w_slope * slope_score)

Risk Categories:
----------------
0.0 - 0.3 : Low Risk (Green)
0.3 - 0.6 : Moderate Risk (Yellow)
0.6 - 0.8 : High Risk (Orange)
0.8 - 1.0 : Very High Inundation Risk (Red)
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

from app.flood.config import flood_config_manager
from app.flood.dem_service import dem_service
from app.services.rainfall_service import rainfall_service


def classify_risk_score(score: float, thresholds: Dict[str, Any]) -> Dict[str, Any]:
    """Classify risk score into Low, Moderate, High, or Very High."""
    score = max(0.0, min(1.0, score))
    if score < thresholds["low"]["max"]:
        return {
            "level": "low",
            "label": thresholds["low"]["label"],
            "color": thresholds["low"]["color"],
            "alert": thresholds["low"]["alert"],
            "score": round(score, 3),
        }
    elif score < thresholds["moderate"]["max"]:
        return {
            "level": "moderate",
            "label": thresholds["moderate"]["label"],
            "color": thresholds["moderate"]["color"],
            "alert": thresholds["moderate"]["alert"],
            "score": round(score, 3),
        }
    elif score < thresholds["high"]["max"]:
        return {
            "level": "high",
            "label": thresholds["high"]["label"],
            "color": thresholds["high"]["color"],
            "alert": thresholds["high"]["alert"],
            "score": round(score, 3),
        }
    else:
        return {
            "level": "very_high",
            "label": thresholds["very_high"]["label"],
            "color": thresholds["very_high"]["color"],
            "alert": thresholds["very_high"]["alert"],
            "score": round(score, 3),
        }


class InundationService:
    """
    Computes spatial inundation susceptibility by combining predicted or historical
    rainfall with SRTM DEM elevation and slope gradients.
    """

    def __init__(self):
        pass

    def compute_inundation_risk(
        self,
        timestamp: Optional[str] = None,
        rainfall_grid: Optional[List[List[float]]] = None,
        custom_weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Calculates the simplified inundation risk grid and regional analytics.
        
        Parameters:
        - timestamp: Target ISO timestamp (used if rainfall_grid is not provided).
        - rainfall_grid: 2D array of rainfall values (mm) matching or resampled to DEM grid.
        - custom_weights: Optional override for weights (e.g. {"rainfall_weight": 0.5, ...}).
        """
        config = flood_config_manager.get_config()
        weights = dict(config["weights"])
        if custom_weights:
            weights.update({k: v for k, v in custom_weights.items() if v is not None})
            # Normalize weights to sum to 1.0 if needed
            total_w = sum(weights.values())
            if total_w > 0:
                weights = {k: v / total_w for k, v in weights.items()}

        w_rain = weights.get("rainfall_weight", 0.50)
        w_elev = weights.get("elevation_weight", 0.30)
        w_slope = weights.get("slope_weight", 0.20)

        norm = config["normalization"]
        rain_norm_max = norm.get("rainfall_max_norm_mm", 150.0)
        elev_norm_max = norm.get("elevation_max_norm_m", 400.0)
        slope_norm_max = norm.get("slope_max_norm_deg", 12.0)
        thresholds = config["thresholds"]
        cell_area_km2 = config.get("cell_area_km2", 121.0)

        # 1. Obtain DEM data
        dem_data = dem_service._dem_cache
        if dem_data is None:
            dem_service._ensure_dem_loaded()
            dem_data = dem_service._dem_cache

        dem_elev_grid = dem_data["elevation_grid"]
        dem_slope_grid = dem_data["slope_grid"]
        latitudes = dem_data["latitudes"]
        longitudes = dem_data["longitudes"]
        n_lat = len(latitudes)
        n_lon = len(longitudes)
        dlat = dem_data["lat_resolution"]
        dlon = dem_data["lon_resolution"]
        half_dlat, half_dlon = dlat / 2.0, dlon / 2.0

        # 2. Obtain / align rainfall grid
        resolved_timestamp = timestamp or "latest"
        rain_2d: List[List[float]] = []

        if rainfall_grid is not None and len(rainfall_grid) > 0:
            # Check dimensions
            if len(rainfall_grid) == n_lat and len(rainfall_grid[0]) == n_lon:
                rain_2d = rainfall_grid
            else:
                # Resample grid to (n_lat, n_lon)
                rain_2d = self._resample_grid(rainfall_grid, n_lat, n_lon)
        else:
            # Fetch from rainfall service
            try:
                map_res = rainfall_service.get_map_data(resolved_timestamp)
                resolved_timestamp = map_res.timestamp
                rain_2d = self._cells_to_grid(map_res.cells, latitudes, longitudes)
            except Exception as e:
                # Fallback zero or baseline
                print(f"[InundationService] Fallback reading rainfall: {e}")
                rain_2d = [[0.0 for _ in range(n_lon)] for _ in range(n_lat)]

        # 3. Compute pixel-by-pixel multi-criteria risk
        cells: List[Dict[str, Any]] = []
        risk_matrix: List[List[float]] = []
        
        low_count = 0
        mod_count = 0
        high_count = 0
        vhigh_count = 0

        sum_rain_contrib = 0.0
        sum_elev_contrib = 0.0
        sum_slope_contrib = 0.0
        sum_overall_risk = 0.0
        total_cells = n_lat * n_lon

        for i, lat in enumerate(latitudes):
            risk_row: List[float] = []
            for j, lon in enumerate(longitudes):
                rain_val = max(0.0, float(rain_2d[i][j]))
                elev_m = float(dem_elev_grid[i][j])
                slope_deg = float(dem_slope_grid[i][j])

                # Normalization
                rain_score = min(1.0, max(0.0, rain_val / rain_norm_max))
                # Low elevation has higher flood susceptibility
                elev_score = max(0.0, min(1.0, (elev_norm_max - max(0.0, elev_m)) / elev_norm_max))
                # Flat terrain (low slope) has higher water accumulation susceptibility
                slope_score = max(0.0, min(1.0, (slope_norm_max - min(slope_norm_max, max(0.0, slope_deg))) / slope_norm_max))

                # Weighted sum
                r_contrib = w_rain * rain_score
                e_contrib = w_elev * elev_score
                s_contrib = w_slope * slope_score
                risk_score = round(r_contrib + e_contrib + s_contrib, 3)

                risk_row.append(risk_score)
                cls_info = classify_risk_score(risk_score, thresholds)

                if cls_info["level"] == "low":
                    low_count += 1
                elif cls_info["level"] == "moderate":
                    mod_count += 1
                elif cls_info["level"] == "high":
                    high_count += 1
                elif cls_info["level"] == "very_high":
                    vhigh_count += 1

                sum_rain_contrib += r_contrib
                sum_elev_contrib += e_contrib
                sum_slope_contrib += s_contrib
                sum_overall_risk += risk_score

                cell_bounds = [
                    [round(lat - half_dlat, 4), round(lon - half_dlon, 4)],
                    [round(lat + half_dlat, 4), round(lon + half_dlon, 4)],
                ]

                cells.append({
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "rainfall_mm": round(rain_val, 1),
                    "elevation_m": round(elev_m, 1),
                    "slope_deg": round(slope_deg, 2),
                    "rainfall_score": round(rain_score, 3),
                    "elevation_score": round(elev_score, 3),
                    "slope_score": round(slope_score, 3),
                    "risk_score": risk_score,
                    "risk_level": cls_info["level"],
                    "risk_label": cls_info["label"],
                    "color": cls_info["color"],
                    "alert": cls_info["alert"],
                    "bounds": cell_bounds,
                })

            risk_matrix.append(risk_row)

        # 4. Regional Statistics & Area Calculations
        high_risk_pixels = high_count + vhigh_count
        pct_high_risk = round((high_risk_pixels / total_cells) * 100.0, 2)
        pct_vhigh_risk = round((vhigh_count / total_cells) * 100.0, 2)
        pct_mod_risk = round((mod_count / total_cells) * 100.0, 2)
        pct_low_risk = round((low_count / total_cells) * 100.0, 2)

        high_risk_area_km2 = round(high_risk_pixels * cell_area_km2, 1)
        vhigh_risk_area_km2 = round(vhigh_count * cell_area_km2, 1)
        total_monitored_area_km2 = round(total_cells * cell_area_km2, 1)

        # Mean regional factor contributions
        mean_rain_contrib = round(sum_rain_contrib / total_cells, 3)
        mean_elev_contrib = round(sum_elev_contrib / total_cells, 3)
        mean_slope_contrib = round(sum_slope_contrib / total_cells, 3)
        mean_overall_risk = round(sum_overall_risk / total_cells, 3)

        # Top critical hotspots
        sorted_cells = sorted(cells, key=lambda c: c["risk_score"], reverse=True)
        top_hotspots = sorted_cells[:8]

        # Topographic landmarks status
        from app.flood.dem_service import TOPOGRAPHIC_LANDMARKS
        landmarks_status = []
        for lm in TOPOGRAPHIC_LANDMARKS:
            lm_lat, lm_lon = lm["lat"], lm["lon"]
            # Find closest cell
            closest = min(cells, key=lambda c: (c["lat"] - lm_lat) ** 2 + (c["lon"] - lm_lon) ** 2)
            landmarks_status.append({
                "name": lm["name"],
                "lat": lm_lat,
                "lon": lm_lon,
                "type": lm.get("type", "landmark"),
                "elevation_m": closest["elevation_m"],
                "slope_deg": closest["slope_deg"],
                "rainfall_mm": closest["rainfall_mm"],
                "risk_score": closest["risk_score"],
                "risk_label": closest["risk_label"],
                "color": closest["color"],
                "alert": closest["alert"],
            })

        meta = dem_service.get_metadata()

        return {
            "model_type": "Simplified Multi-Criteria Inundation Susceptibility Model",
            "disclaimer": config.get("disclaimer", "Simplified Inundation Risk Estimate (Hackathon Prototype) - Not a Hydrodynamic Flood Simulation"),
            "model_category": "Multi-Criteria Evaluation (MCE)",
            "timestamp": resolved_timestamp,
            "bounds": meta["bounds"],
            "center": meta["center"],
            "grid_dimensions": {"n_lat": n_lat, "n_lon": n_lon, "total_pixels": total_cells},
            "cell_area_km2": cell_area_km2,
            "weights": {
                "rainfall_weight": w_rain,
                "elevation_weight": w_elev,
                "slope_weight": w_slope,
            },
            "explanation": {
                "disclaimer": config.get("disclaimer", "Simplified Inundation Risk Estimate (Hackathon Prototype) - Not a Hydrodynamic Flood Simulation"),
                "rainfall_contribution": mean_rain_contrib,
                "elevation_contribution": mean_elev_contrib,
                "slope_contribution": mean_slope_contrib,
                "overall_risk": mean_overall_risk,
                "formula": f"risk = ({w_rain} * rainfall_score) + ({w_elev} * elevation_score) + ({w_slope} * slope_score)",
                "interpretation": (
                    f"Overall basin flood risk is {mean_overall_risk:.2f}. "
                    f"Rainfall accounts for {mean_rain_contrib / max(0.001, mean_overall_risk) * 100:.1f}% of total risk, "
                    f"low elevation accounts for {mean_elev_contrib / max(0.001, mean_overall_risk) * 100:.1f}%, and "
                    f"flat terrain slope accounts for {mean_slope_contrib / max(0.001, mean_overall_risk) * 100:.1f}%."
                ),
            },
            "risk_summary": {
                "low_pixels": low_count,
                "moderate_pixels": mod_count,
                "high_pixels": high_count,
                "very_high_pixels": vhigh_count,
                "high_risk_pixels_total": high_risk_pixels,
                "percentage_high_or_vhigh_risk": pct_high_risk,
                "percentage_very_high_risk": pct_vhigh_risk,
                "percentage_moderate_risk": pct_mod_risk,
                "percentage_low_risk": pct_low_risk,
                "estimated_high_risk_area_km2": high_risk_area_km2,
                "estimated_very_high_risk_area_km2": vhigh_risk_area_km2,
                "total_monitored_area_km2": total_monitored_area_km2,
            },
            "risk_matrix": risk_matrix,
            "cells": cells,
            "top_hotspots": top_hotspots,
            "landmarks_status": landmarks_status,
        }

    def _cells_to_grid(self, cells: List[Any], latitudes: List[float], longitudes: List[float]) -> List[List[float]]:
        """Map list of GridCell objects to a 2D float array matching DEM coordinates."""
        n_lat, n_lon = len(latitudes), len(longitudes)
        grid = [[0.0 for _ in range(n_lon)] for _ in range(n_lat)]

        # Map lookup
        lookup: Dict[Tuple[float, float], float] = {}
        for c in cells:
            if hasattr(c, "lat"):
                c_lat = round(float(c.lat), 2)
                c_lon = round(float(c.lon), 2)
                c_val = float(getattr(c, "rainfall_mm", getattr(c, "value", 0.0)))
            else:
                c_lat = round(float(c.get("lat", 0.0)), 2)
                c_lon = round(float(c.get("lon", 0.0)), 2)
                c_val = float(c.get("rainfall_mm", c.get("value", 0.0)))
            lookup[(c_lat, c_lon)] = c_val

        for i, lat in enumerate(latitudes):
            for j, lon in enumerate(longitudes):
                key = (round(lat, 2), round(lon, 2))
                if key in lookup:
                    grid[i][j] = lookup[key]
                else:
                    # Find nearest key in lookup
                    closest_val = 0.0
                    min_d = float("inf")
                    for (klat, klon), val in lookup.items():
                        d = (lat - klat) ** 2 + (lon - klon) ** 2
                        if d < min_d:
                            min_d = d
                            closest_val = val
                    grid[i][j] = closest_val

        return grid

    def _resample_grid(self, src_grid: List[List[float]], target_n_lat: int, target_n_lon: int) -> List[List[float]]:
        """Simple bilinear resampling if incoming grid dimensions differ from target."""
        src_n_lat = len(src_grid)
        src_n_lon = len(src_grid[0])
        resampled = [[0.0 for _ in range(target_n_lon)] for _ in range(target_n_lat)]

        for ti in range(target_n_lat):
            si = ti * (src_n_lat - 1) / max(1, target_n_lat - 1)
            i0 = int(math.floor(si))
            i1 = min(src_n_lat - 1, i0 + 1)
            fi = si - i0

            for tj in range(target_n_lon):
                sj = tj * (src_n_lon - 1) / max(1, target_n_lon - 1)
                j0 = int(math.floor(sj))
                j1 = min(src_n_lon - 1, j0 + 1)
                fj = sj - j0

                val = (
                    (1 - fi) * (1 - fj) * src_grid[i0][j0]
                    + fi * (1 - fj) * src_grid[i1][j0]
                    + (1 - fi) * fj * src_grid[i0][j1]
                    + fi * fj * src_grid[i1][j1]
                )
                resampled[ti][tj] = round(val, 2)

        return resampled


inundation_service = InundationService()
