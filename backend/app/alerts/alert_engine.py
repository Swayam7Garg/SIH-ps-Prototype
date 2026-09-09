"""
alerts/alert_engine.py
-----------------------
Alert engine combining precipitation intensity and topographic inundation susceptibility.

DISCLAIMER / SCIENTIFIC INTEGRITY:
Prototype alert thresholds inspired by operational warning concepts.
Not official IMD or NDMA disaster alerts.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.alerts.config import alert_config_manager
from app.flood.dem_service import dem_service
from app.flood.inundation_service import inundation_service
from app.services.rainfall_service import rainfall_service


def classify_cell_alert(
    rain_mm: float,
    flood_risk: float,
    thresh: Dict[str, Any],
) -> Tuple[str, str, str]:
    """
    Evaluates multi-hazard alert level for a single grid cell:
    - RED: Extreme rainfall (>=124.5mm) OR (Very Heavy rain >=64.5mm AND High Flood Risk >=0.60) OR Very High Flood Risk >=0.80 with active rain
    - ORANGE: Very Heavy rainfall (>=64.5mm) OR High Flood Risk (>=0.60)
    - YELLOW: Heavy rainfall (>=35.6mm) OR Moderate Flood Risk (>=0.30)
    - NORMAL: Below all alert thresholds
    
    Returns: (level, label, color)
    """
    y_conf = thresh.get("YELLOW", {})
    o_conf = thresh.get("ORANGE", {})
    r_conf = thresh.get("RED", {})
    n_conf = thresh.get("NORMAL", {})

    r_yellow_rain = y_conf.get("rainfall_min_mm", 35.6)
    r_yellow_risk = y_conf.get("flood_risk_min", 0.30)

    r_orange_rain = o_conf.get("rainfall_min_mm", 64.5)
    r_orange_risk = o_conf.get("flood_risk_min", 0.60)

    r_red_rain = r_conf.get("rainfall_min_mm", 124.5)
    r_red_risk = r_conf.get("flood_risk_min", 0.80)
    compound_rain = r_conf.get("compound_rain_min_mm", 64.5)
    compound_risk = r_conf.get("compound_risk_min", 0.60)

    # 1. RED Alert Check
    is_red = (
        rain_mm >= r_red_rain
        or (rain_mm >= compound_rain and flood_risk >= compound_risk)
        or (flood_risk >= r_red_risk and rain_mm >= r_yellow_rain)
    )
    if is_red:
        return ("RED", r_conf.get("label", "RED (Warning / Take Action)"), r_conf.get("color", "#ef4444"))

    # 2. ORANGE Alert Check
    is_orange = (rain_mm >= r_orange_rain) or (flood_risk >= r_orange_risk)
    if is_orange:
        return ("ORANGE", o_conf.get("label", "ORANGE (Alert / Be Prepared)"), o_conf.get("color", "#f97316"))

    # 3. YELLOW Alert Check
    is_yellow = (rain_mm >= r_yellow_rain) or (flood_risk >= r_yellow_risk)
    if is_yellow:
        return ("YELLOW", y_conf.get("label", "YELLOW (Advisory / Watch)"), y_conf.get("color", "#eab308"))

    # 4. NORMAL
    return ("NORMAL", n_conf.get("label", "NORMAL (Green / Safe)"), n_conf.get("color", "#22c55e"))


class AlertEngine:
    """
    Evaluates multi-hazard operational early-warning alert levels
    combining precipitation forecasts and terrain inundation susceptibility.
    """

    def __init__(self):
        pass

    def evaluate_alerts(
        self,
        timestamp: Optional[str] = None,
        rainfall_grid: Optional[List[List[float]]] = None,
        flood_risk_grid: Optional[List[List[float]]] = None,
        custom_thresholds: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate regional and cell-level alerts for given rainfall and flood conditions.
        """
        config = alert_config_manager.get_config()
        thresholds = dict(config["thresholds"])
        if custom_thresholds:
            thresholds.update(custom_thresholds)

        # 1. Obtain Flood Inundation and DEM metadata
        flood_res = inundation_service.compute_inundation_risk(
            timestamp=timestamp,
            rainfall_grid=rainfall_grid,
        )

        resolved_timestamp = flood_res["timestamp"]
        cells_data = flood_res["cells"]
        total_cells = len(cells_data)
        cell_area_km2 = config.get("cell_area_km2", 121.0)

        # 2. Evaluate cell-by-cell alert levels
        cell_alerts: List[Dict[str, Any]] = []
        counts = {"NORMAL": 0, "YELLOW": 0, "ORANGE": 0, "RED": 0}
        rain_counts = {"NORMAL": 0, "YELLOW": 0, "ORANGE": 0, "RED": 0}
        flood_counts = {"NORMAL": 0, "YELLOW": 0, "ORANGE": 0, "RED": 0}

        max_rain = 0.0
        max_flood_risk = 0.0

        for cell in cells_data:
            r_mm = float(cell["rainfall_mm"])
            f_score = float(cell["risk_score"])
            max_rain = max(max_rain, r_mm)
            max_flood_risk = max(max_flood_risk, f_score)

            level, label, color = classify_cell_alert(r_mm, f_score, thresholds)
            counts[level] += 1

            # Individual component classifications
            if r_mm >= thresholds["RED"]["rainfall_min_mm"]:
                rain_counts["RED"] += 1
            elif r_mm >= thresholds["ORANGE"]["rainfall_min_mm"]:
                rain_counts["ORANGE"] += 1
            elif r_mm >= thresholds["YELLOW"]["rainfall_min_mm"]:
                rain_counts["YELLOW"] += 1
            else:
                rain_counts["NORMAL"] += 1

            if f_score >= thresholds["RED"]["flood_risk_min"]:
                flood_counts["RED"] += 1
            elif f_score >= thresholds["ORANGE"]["flood_risk_min"]:
                flood_counts["ORANGE"] += 1
            elif f_score >= thresholds["YELLOW"]["flood_risk_min"]:
                flood_counts["YELLOW"] += 1
            else:
                flood_counts["NORMAL"] += 1

            cell_alerts.append({
                "lat": cell["lat"],
                "lon": cell["lon"],
                "rainfall_mm": r_mm,
                "elevation_m": cell["elevation_m"],
                "slope_deg": cell["slope_deg"],
                "flood_risk_score": f_score,
                "alert_level": level,
                "alert_label": label,
                "color": color,
                "bounds": cell["bounds"],
            })

        # 3. Compute Regional Alert Level
        high_risk_cells = counts["ORANGE"] + counts["RED"]
        pct_high_risk = round((high_risk_cells / max(1, total_cells)) * 100.0, 2)
        pct_red = round((counts["RED"] / max(1, total_cells)) * 100.0, 2)
        pct_orange = round((counts["ORANGE"] / max(1, total_cells)) * 100.0, 2)
        pct_yellow = round((counts["YELLOW"] / max(1, total_cells)) * 100.0, 2)

        affected_cells = counts["YELLOW"] + counts["ORANGE"] + counts["RED"]
        affected_area_km2 = round(affected_cells * cell_area_km2, 1)
        high_risk_area_km2 = round(high_risk_cells * cell_area_km2, 1)
        total_area_km2 = round(total_cells * cell_area_km2, 1)

        # Component alerts
        if rain_counts["RED"] > 0:
            rainfall_alert = "RED"
        elif rain_counts["ORANGE"] > 0:
            rainfall_alert = "ORANGE"
        elif rain_counts["YELLOW"] > 0:
            rainfall_alert = "YELLOW"
        else:
            rainfall_alert = "NORMAL"

        if flood_counts["RED"] > 0:
            flood_alert = "RED"
        elif flood_counts["ORANGE"] > 0:
            flood_alert = "ORANGE"
        elif flood_counts["YELLOW"] > 0:
            flood_alert = "YELLOW"
        else:
            flood_alert = "NORMAL"

        # Overall alert synthesis based on highest risk and regional extent
        if counts["RED"] > 0 and (pct_red >= thresholds["RED"].get("regional_pct_trigger", 5.0) or max_rain >= 124.5 or max_flood_risk >= 0.85):
            overall_alert = "RED"
        elif counts["ORANGE"] > 0 or pct_high_risk >= thresholds["ORANGE"].get("regional_pct_trigger", 10.0):
            overall_alert = "ORANGE"
        elif counts["YELLOW"] > 0 or pct_yellow >= thresholds["YELLOW"].get("regional_pct_trigger", 5.0):
            overall_alert = "YELLOW"
        else:
            overall_alert = "NORMAL"

        overall_conf = thresholds.get(overall_alert, {})

        # 4. Calculate mathematical risk factor contributions (Normalized 0.0 - 1.0)
        exp = flood_res.get("explanation", {})
        rain_c = max(0.001, float(exp.get("rainfall_contribution", 0.22)))
        elev_c = max(0.001, float(exp.get("elevation_contribution", 0.13)))
        slope_c = max(0.001, float(exp.get("slope_contribution", 0.19)))
        sum_c = rain_c + elev_c + slope_c

        # Normalized contributions summing to 1.0 (55% rain, 25% elev, 15% slope, 5% other default proportion)
        r_frac = round(rain_c / sum_c * 0.95, 2)
        e_frac = round(elev_c / sum_c * 0.95, 2)
        s_frac = round(slope_c / sum_c * 0.95, 2)
        other_frac = round(1.0 - (r_frac + e_frac + s_frac), 2)

        factors = [
            {"name": "rainfall", "label": "Rainfall Intensity", "contribution": r_frac},
            {"name": "elevation", "label": "Low Elevation", "contribution": e_frac},
            {"name": "slope", "label": "Low Slope (Pooling)", "contribution": s_frac},
            {"name": "other", "label": "Compound Risk Interaction", "contribution": max(0.01, other_frac)},
        ]

        # 5. Generate Human-Readable Multi-Hazard Explanation Reasons
        reasons: List[str] = []

        if max_rain >= thresholds["YELLOW"]["rainfall_min_mm"]:
            reasons.append(f"Predicted rainfall is high (Peak: {max_rain:.1f} mm).")

        if max_flood_risk >= thresholds["YELLOW"]["flood_risk_min"]:
            reasons.append("The affected region contains low-elevation terrain.")
            reasons.append(f"Several grid cells have high inundation susceptibility (Peak Risk: {max_flood_risk:.2f}).")

        # Regional high-risk percentage reason
        if pct_high_risk >= thresholds["ORANGE"].get("regional_pct_trigger", 10.0):
            reasons.append(
                f"High & extreme risk area of {high_risk_area_km2:,.0f} km² covers {pct_high_risk:.1f}% of the monitored basin."
            )
        elif affected_cells > 0:
            reasons.append(
                f"Total affected territory under advisory or warning covers {affected_area_km2:,.0f} km² ({round(affected_cells/total_cells*100, 1)}% of basin)."
            )

        # Compound hazard reason
        if counts["RED"] > 0:
            reasons.append(
                f"Compound hazard detected: {counts['RED']} grid cells encounter simultaneous heavy precipitation and flat lowland water accumulation."
            )

        # 6. Landmark alert status
        landmarks_alert = []
        for lm in flood_res.get("landmarks_status", []):
            lm_lat, lm_lon = lm["lat"], lm["lon"]
            closest = min(cell_alerts, key=lambda c: (c["lat"] - lm_lat) ** 2 + (c["lon"] - lm_lon) ** 2)
            landmarks_alert.append({
                "name": lm["name"],
                "lat": lm_lat,
                "lon": lm_lon,
                "type": lm.get("type", "landmark"),
                "rainfall_mm": closest["rainfall_mm"],
                "elevation_m": closest["elevation_m"],
                "slope_deg": closest["slope_deg"],
                "flood_risk_score": closest["flood_risk_score"],
                "alert_level": closest["alert_level"],
                "alert_label": closest["alert_label"],
                "color": closest["color"],
            })

        return {
            "alert_level": overall_alert,
            "overall_alert": overall_alert,
            "alert_color": overall_conf.get("color", "#22c55e"),
            "alert_label": overall_conf.get("label", "NORMAL (Green / Safe)"),
            "action_guidance": overall_conf.get("action", ""),
            "disclaimer": config.get("disclaimer", "Prototype alert thresholds inspired by operational warning concepts."),
            "scientific_notice": config.get("scientific_notice", ""),
            "timestamp": resolved_timestamp,
            "rainfall_alert": rainfall_alert,
            "flood_alert": flood_alert,
            "affected_area": affected_area_km2,
            "affected_area_km2": affected_area_km2,
            "high_risk_area_km2": high_risk_area_km2,
            "high_risk_percentage": pct_high_risk,
            "total_monitored_area_km2": total_area_km2,
            "cells_by_alert": counts,
            "factors": factors,
            "reasons": reasons,
            "thresholds_summary": {
                "YELLOW": thresholds["YELLOW"],
                "ORANGE": thresholds["ORANGE"],
                "RED": thresholds["RED"],
            },
            "key_hotspots": flood_res.get("top_hotspots", []),
            "landmarks_alert": landmarks_alert,
            "cell_alerts": cell_alerts,
        }


alert_engine = AlertEngine()
