"""
ml/metrics.py
--------------
Meteorological evaluation metrics for precipitation nowcasting:
- MAE (Mean Absolute Error in mm)
- RMSE (Root Mean Squared Error in mm)
- CSI (Critical Success Index / Threat Score)
- POD (Probability of Detection)
- FAR (False Alarm Ratio)
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple


def calculate_mae(actual_grid: List[List[float]], predicted_grid: List[List[float]]) -> float:
    """Calculate Mean Absolute Error (MAE) across all spatial grid cells."""
    total_diff = 0.0
    count = 0
    for r_act, r_pred in zip(actual_grid, predicted_grid):
        for act, pred in zip(r_act, r_pred):
            if act is not None and pred is not None:
                total_diff += abs(act - max(0.0, pred))
                count += 1
    return round(total_diff / count, 4) if count > 0 else 0.0


def calculate_rmse(actual_grid: List[List[float]], predicted_grid: List[List[float]]) -> float:
    """Calculate Root Mean Squared Error (RMSE) across all spatial grid cells."""
    total_sq_diff = 0.0
    count = 0
    for r_act, r_pred in zip(actual_grid, predicted_grid):
        for act, pred in zip(r_act, r_pred):
            if act is not None and pred is not None:
                p = max(0.0, pred)
                total_sq_diff += (act - p) ** 2
                count += 1
    return round(math.sqrt(total_sq_diff / count), 4) if count > 0 else 0.0


def calculate_contingency_table(
    actual_grid: List[List[float]], predicted_grid: List[List[float]], threshold: float = 5.0
) -> Dict[str, int]:
    """
    Compute 2x2 contingency table for precipitation occurrence above a threshold:
    - Hits (TP): Actual >= threshold & Pred >= threshold
    - False Alarms (FP): Actual < threshold & Pred >= threshold
    - Misses (FN): Actual >= threshold & Pred < threshold
    - Correct Negatives (TN): Actual < threshold & Pred < threshold
    """
    hits = 0
    false_alarms = 0
    misses = 0
    correct_negatives = 0

    for r_act, r_pred in zip(actual_grid, predicted_grid):
        for act, pred in zip(r_act, r_pred):
            if act is None or pred is None:
                continue
            p = max(0.0, pred)
            act_event = act >= threshold
            pred_event = p >= threshold

            if act_event and pred_event:
                hits += 1
            elif not act_event and pred_event:
                false_alarms += 1
            elif act_event and not pred_event:
                misses += 1
            else:
                correct_negatives += 1

    return {
        "hits": hits,
        "false_alarms": false_alarms,
        "misses": misses,
        "correct_negatives": correct_negatives,
    }


def calculate_csi_pod_far(contingency: Dict[str, int]) -> Dict[str, float]:
    """
    Calculate Critical Success Index (CSI), Probability of Detection (POD),
    and False Alarm Ratio (FAR).
    """
    hits = contingency["hits"]
    fa = contingency["false_alarms"]
    miss = contingency["misses"]

    denom_csi = hits + fa + miss
    csi = round(hits / denom_csi, 4) if denom_csi > 0 else 0.0

    denom_pod = hits + miss
    pod = round(hits / denom_pod, 4) if denom_pod > 0 else 0.0

    denom_far = hits + fa
    far = round(fa / denom_far, 4) if denom_far > 0 else 0.0

    return {
        "csi": csi,
        "pod": pod,
        "far": far,
        "hits": hits,
        "misses": miss,
        "false_alarms": fa,
    }


def evaluate_prediction(
    actual_grid: List[List[float]], predicted_grid: List[List[float]]
) -> Dict[str, Any]:
    """
    Comprehensive evaluation of a predicted grid against ground truth.
    """
    mae = calculate_mae(actual_grid, predicted_grid)
    rmse = calculate_rmse(actual_grid, predicted_grid)

    thresholds = [0.5, 5.0, 35.6, 64.5]
    csi_results = {}

    for th in thresholds:
        ct = calculate_contingency_table(actual_grid, predicted_grid, threshold=th)
        metrics = calculate_csi_pod_far(ct)
        csi_results[f"{th}mm"] = metrics

    return {
        "mae_mm": mae,
        "rmse_mm": rmse,
        "csi_summary": csi_results,
    }
