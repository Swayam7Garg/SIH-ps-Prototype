"""
ml/predict.py
--------------
Inference engine for spatial rainfall nowcasting (+1h, +2h, +3h).
Formats predictions with exact Leaflet bounding boxes, IMD color classifications,
and comparison against baseline and actual observations (when available).
"""

from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.ml.metrics import evaluate_prediction
from app.ml.rainfall_model import PersistenceBaselineModel, SpatioTemporalNowcasterModel
from app.schemas.rainfall import GridCell, PeakLocation, RainfallStats
from app.services.rainfall_service import (
    WEATHER_STATIONS,
    classify_rainfall,
    rainfall_service,
)
from app.utils.config import BASE_DIR

MODELS_DIR = BASE_DIR.parent / "models" if (BASE_DIR.parent / "models").exists() else BASE_DIR / "models"


class RainfallPredictor:
    """
    Manages loading the trained ML model and generating multi-horizon spatial forecasts.
    """

    def __init__(self):
        self.model: Optional[SpatioTemporalNowcasterModel] = None
        self.baseline_model = PersistenceBaselineModel()
        self._ensure_model_loaded()

    def _ensure_model_loaded(self) -> None:
        model_path = MODELS_DIR / "rainfall_nowcast_model.json"
        if model_path.exists():
            try:
                self.model = SpatioTemporalNowcasterModel.load(model_path)
                return
            except Exception as e:
                print(f"[RainfallPredictor] Error loading model from {model_path}: {e}")

        # Train / initialize default
        from app.ml.train import run_training_pipeline
        run_training_pipeline()
        self.model = SpatioTemporalNowcasterModel.load(model_path)

    def predict_future(
        self, start_timestamp: str, horizon_steps: int = 3, model_choice: str = "spatiotemporal"
    ) -> Dict[str, Any]:
        """
        Generate predictions for horizons (+1, +2, +3 steps) starting from `start_timestamp`.
        """
        self._ensure_model_loaded()
        rainfall_service._ensure_dataset_loaded()
        data = rainfall_service._dataset_cache
        timestamps = list(data["frames"].keys())

        if start_timestamp not in data["frames"]:
            start_timestamp = timestamps[7] if len(timestamps) > 7 else timestamps[-1]

        start_idx = timestamps.index(start_timestamp)

        # 1. Build input sequence of 4 frames [t-3, t-2, t-1, t]
        seq_len = 4
        input_grids = []
        for offset in range(seq_len - 1, -1, -1):
            idx = max(0, start_idx - offset)
            ts = timestamps[idx]
            input_grids.append(data["frames"][ts])

        # 2. Generate multi-step forecast
        if model_choice == "baseline":
            # Persistence baseline predicts constant frame
            pred_grids = [self.baseline_model.predict(input_grids) for _ in range(horizon_steps)]
            model_name = "Persistence Baseline Model"
            model_type = "baseline"
        else:
            pred_grids = self.model.predict_multi_step(input_grids, steps=horizon_steps)
            model_name = self.model.name
            model_type = self.model.type

        # 3. Format predicted frames
        latitudes = data["latitudes"]
        longitudes = data["longitudes"]
        dlat = data.get("lat_resolution", 0.1)
        dlon = data.get("lon_resolution", 0.1)
        half_dlat = dlat / 2.0
        half_dlon = dlon / 2.0

        # Determine step time interval (default 1 to 4 hours based on dataset timestamps)
        try:
            d0 = datetime.fromisoformat(start_timestamp.replace("Z", "+00:00"))
        except Exception:
            d0 = datetime.now(timezone.utc)

        predicted_frames = []

        for step_idx, grid in enumerate(pred_grids):
            horizon_hour = step_idx + 1
            pred_dt = d0 + timedelta(hours=horizon_hour)
            pred_ts_str = pred_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            formatted_time = pred_dt.strftime("%d %b %Y, %H:%M UTC")

            # Build spatial grid cells
            cells: List[GridCell] = []
            flat_vals = []
            heavy_count = 0
            max_val = 0.0
            peak_lat, peak_lon = latitudes[0], longitudes[0]

            for i, lat in enumerate(latitudes):
                for j, lon in enumerate(longitudes):
                    val = grid[i][j]
                    if val is None or val < 0.1:
                        continue

                    flat_vals.append(val)
                    if val > max_val:
                        max_val = val
                        peak_lat = lat
                        peak_lon = lon

                    if val >= 35.6:
                        heavy_count += 1

                    cls_info = classify_rainfall(val)
                    cell_bounds = [
                        [round(lat - half_dlat, 4), round(lon - half_dlon, 4)],
                        [round(lat + half_dlat, 4), round(lon + half_dlon, 4)],
                    ]

                    cells.append(
                        GridCell(
                            lat=round(lat, 4),
                            lon=round(lon, 4),
                            rainfall_mm=round(val, 1),
                            level=cls_info["level"],
                            level_label=cls_info["label"],
                            alert=cls_info["alert"],
                            color=cls_info["color"],
                            opacity=cls_info["opacity"],
                            bounds=cell_bounds,
                        )
                    )

            mean_val = round(sum(flat_vals) / len(flat_vals), 1) if flat_vals else 0.0
            min_val = round(min(flat_vals), 1) if flat_vals else 0.0
            heavy_area = round(heavy_count * 121.0, 1)

            peak_station = rainfall_service._find_nearest_station_to_peak(grid, latitudes, longitudes)
            peak_loc = None
            if peak_station:
                peak_loc = PeakLocation(
                    name=peak_station["name"],
                    lat=peak_lat,
                    lon=peak_lon,
                    value=max_val,
                )

            stats = RainfallStats(
                min_rainfall=min_val,
                max_rainfall=max_val,
                mean_rainfall=mean_val,
                active_cells_count=len(cells),
                heavy_rain_area_km2=heavy_area,
                peak_location=peak_loc,
            )

            # Check if ground truth actual exists for comparison
            actual_idx = start_idx + horizon_hour
            has_actual = actual_idx < len(timestamps)
            step_eval = None
            actual_ts_str = timestamps[actual_idx] if has_actual else None

            if has_actual:
                actual_grid = data["frames"][actual_ts_str]
                step_eval = evaluate_prediction(actual_grid, grid)

            predicted_frames.append({
                "horizon_step": step_idx + 1,
                "horizon_label": f"+{horizon_hour} Hour Forecast",
                "timestamp": pred_ts_str,
                "formatted_time": formatted_time,
                "has_actual_ground_truth": has_actual,
                "actual_timestamp": actual_ts_str,
                "stats": stats.model_dump(),
                "cells": [c.model_dump() for c in cells],
                "evaluation_against_actual": step_eval,
            })

        lat_min, lat_max = min(latitudes), max(latitudes)
        lon_min, lon_max = min(longitudes), max(longitudes)

        return {
            "start_timestamp": start_timestamp,
            "prediction_horizon_steps": horizon_steps,
            "model_name": model_name,
            "model_type": model_type,
            "region_name": data.get("region_name", "Kerala & Western Ghats Basin"),
            "unit": "mm",
            "bounds": [
                [round(lat_min - half_dlat, 4), round(lon_min - half_dlon, 4)],
                [round(lat_max + half_dlat, 4), round(lon_max + half_dlon, 4)],
            ],
            "center": [round((lat_min + lat_max) / 2.0, 4), round((lon_min + lon_max) / 2.0, 4)],
            "lat_resolution": dlat,
            "lon_resolution": dlon,
            "n_lat": len(latitudes),
            "n_lon": len(longitudes),
            "latitudes": latitudes,
            "longitudes": longitudes,
            "frames": predicted_frames,
            "scientific_disclaimer": (
                "EXPERIMENTAL AI NOWCAST: Model utilizes spatio-temporal convolution "
                "on preceding 4 satellite frames for short-term nowcasting. "
                "Not certified for official disaster evacuation."
            ),
        }


# Global singleton predictor
rainfall_predictor = RainfallPredictor()
