"""
ml/rainfall_model.py
---------------------
Rainfall nowcasting models:
1. PersistenceBaselineModel: Predicted(t+1) = rainfall(t) benchmark.
2. SpatioTemporalNowcasterModel: Spatio-Temporal Convolutional ML nowcasting
   incorporating learned temporal decay, spatial advection-diffusion kernel,
   and storm velocity momentum.
"""

from __future__ import annotations

import copy
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


class PersistenceBaselineModel:
    """
    Phase 1 Baseline Benchmark:
    Predicts that future rainfall equals the most recent observed rainfall frame:
    Predicted(t+1) = rainfall(t)
    """

    def __init__(self):
        self.name = "Persistence Baseline"
        self.type = "persistence_baseline"

    def predict(self, input_grids: List[List[List[float]]]) -> List[List[float]]:
        """
        Input: [t-3, t-2, t-1, t]
        Output: grid at t
        """
        if not input_grids:
            raise ValueError("input_grids must not be empty.")
        # Return deep copy of the most recent frame
        latest = input_grids[-1]
        return [[val for val in row] for row in latest]


class SpatioTemporalNowcasterModel:
    """
    Phase 2 ML Nowcaster:
    Spatio-temporal convolutional ML model with learnable weights for:
    - Temporal decay weights across sequence frames [t-3, t-2, t-1, t]
    - Spatial 3x3 advection-diffusion kernel
    - Storm motion momentum gradient
    - Orographic decay & conservation
    """

    def __init__(self, sequence_length: int = 4):
        self.name = "Spatio-Temporal Conv-ML Nowcaster"
        self.type = "spatio_temporal_nowcaster"
        self.sequence_length = sequence_length

        # Initial weights (can be tuned/trained via least-squares / gradient descent)
        self.temporal_weights = [0.05, 0.10, 0.25, 0.60]  # weights for t-3, t-2, t-1, t
        self.spatial_kernel = [
            [0.02, 0.05, 0.02],
            [0.05, 0.72, 0.05],
            [0.02, 0.05, 0.02],
        ]
        self.momentum_weight = 0.25
        self.decay_factor = 0.96
        self.bias = 0.0
        self.is_trained = False

    def fit(self, train_samples: List[Dict[str, Any]], val_samples: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Train parameters on the historical sequence samples minimizing MAE.
        """
        if not train_samples:
            self.is_trained = True
            return {"status": "default_weights_applied"}

        best_mae = float("inf")
        best_temp_weights = self.temporal_weights[:]
        best_momentum = self.momentum_weight
        best_decay = self.decay_factor
        best_center_k = 0.72

        # Grid search optimization for temporal, momentum, decay, and spatial kernel parameters
        for w_latest in [0.55, 0.65, 0.75, 0.85]:
            rem = 1.0 - w_latest
            w_prev1 = rem * 0.65
            w_prev2 = rem * 0.25
            w_prev3 = rem * 0.10
            temp_w = [w_prev3, w_prev2, w_prev1, w_latest]

            for mom_w in [0.05, 0.15, 0.25, 0.35]:
                for decay in [0.94, 0.98, 1.00, 1.02]:
                    for center_k in [0.70, 0.80, 0.90]:
                        side_k = (1.0 - center_k) / 8.0
                        self.spatial_kernel = [
                            [side_k, side_k, side_k],
                            [side_k, center_k, side_k],
                            [side_k, side_k, side_k],
                        ]
                        self.temporal_weights = temp_w
                        self.momentum_weight = mom_w
                        self.decay_factor = decay

                        total_err = 0.0
                        n_count = 0
                        for s in train_samples:
                            pred = self.predict(s["input_grids"])
                            act = s["target_grid"]
                            for r_act, r_pred in zip(act, pred):
                                for a, p in zip(r_act, r_pred):
                                    if a is not None and p is not None:
                                        total_err += abs(a - p)
                                        n_count += 1

                        avg_err = total_err / n_count if n_count > 0 else float("inf")
                        if avg_err < best_mae:
                            best_mae = avg_err
                            best_temp_weights = temp_w
                            best_momentum = mom_w
                            best_decay = decay
                            best_center_k = center_k

        self.temporal_weights = best_temp_weights
        self.momentum_weight = best_momentum
        self.decay_factor = best_decay
        side_k = (1.0 - best_center_k) / 8.0
        self.spatial_kernel = [
            [side_k, side_k, side_k],
            [side_k, best_center_k, side_k],
            [side_k, side_k, side_k],
        ]
        self.is_trained = True

        return {
            "status": "trained",
            "train_mae": round(best_mae, 4),
            "temporal_weights": self.temporal_weights,
            "momentum_weight": self.momentum_weight,
            "decay_factor": self.decay_factor,
        }

    def predict(self, input_grids: List[List[List[float]]]) -> List[List[float]]:
        """
        Generate spatial rainfall nowcast [t+1] from [t-3, t-2, t-1, t].
        """
        if len(input_grids) < self.sequence_length:
            # Pad with earliest frame if sequence is shorter
            pad_count = self.sequence_length - len(input_grids)
            padded = [input_grids[0]] * pad_count + list(input_grids)
        else:
            padded = input_grids[-self.sequence_length :]

        n_lat = len(padded[0])
        n_lon = len(padded[0][0])

        # 1. Temporal combination
        temp_grid = [[0.0 for _ in range(n_lon)] for _ in range(n_lat)]
        for k, weight in enumerate(self.temporal_weights):
            g = padded[k]
            for i in range(n_lat):
                for j in range(n_lon):
                    val = g[i][j] if g[i][j] is not None else 0.0
                    temp_grid[i][j] += weight * val

        # 2. Storm motion momentum from (t - t-1)
        latest = padded[-1]
        prev = padded[-2]
        momentum_grid = [[0.0 for _ in range(n_lon)] for _ in range(n_lat)]
        for i in range(n_lat):
            for j in range(n_lon):
                v_lat = latest[i][j] if latest[i][j] is not None else 0.0
                v_prev = prev[i][j] if prev[i][j] is not None else 0.0
                delta = v_lat - v_prev
                # Dampen high-frequency noise
                momentum_grid[i][j] = delta * self.momentum_weight

        # 3. 2D Spatial Convolution (Advection-Diffusion smoothing)
        conv_grid = [[0.0 for _ in range(n_lon)] for _ in range(n_lat)]
        for i in range(n_lat):
            for j in range(n_lon):
                val_sum = 0.0
                weight_sum = 0.0
                for di in (-1, 0, 1):
                    for dj in (-1, 0, 1):
                        ni, nj = i + di, j + dj
                        kw = self.spatial_kernel[di + 1][dj + 1]
                        if 0 <= ni < n_lat and 0 <= nj < n_lon:
                            v = temp_grid[ni][nj] + momentum_grid[ni][nj]
                            val_sum += kw * v
                            weight_sum += kw
                if weight_sum > 0:
                    out_val = (val_sum / weight_sum) * self.decay_factor + self.bias
                    # Physically valid non-negative precipitation
                    conv_grid[i][j] = round(max(0.0, out_val), 1) if out_val >= 0.1 else 0.0

        return conv_grid

    def predict_multi_step(
        self, input_grids: List[List[List[float]]], steps: int = 3
    ) -> List[List[List[float]]]:
        """
        Autoregressive multi-step nowcasting for horizons (+1h, +2h, +3h).
        Recursively feeds predicted grids into sequence buffer.
        """
        history = [copy.deepcopy(g) for g in input_grids]
        predictions = []

        for step in range(steps):
            pred_grid = self.predict(history)
            predictions.append(pred_grid)
            history.append(pred_grid)
            if len(history) > self.sequence_length:
                history.pop(0)

        return predictions

    def save(self, filepath: Path) -> None:
        """Save model parameters to JSON file."""
        filepath.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "name": self.name,
            "type": self.type,
            "sequence_length": self.sequence_length,
            "temporal_weights": self.temporal_weights,
            "spatial_kernel": self.spatial_kernel,
            "momentum_weight": self.momentum_weight,
            "decay_factor": self.decay_factor,
            "bias": self.bias,
            "is_trained": self.is_trained,
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def load(cls, filepath: Path) -> SpatioTemporalNowcasterModel:
        """Load model parameters from JSON file."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        model = cls(sequence_length=data.get("sequence_length", 4))
        model.name = data.get("name", model.name)
        model.type = data.get("type", model.type)
        model.temporal_weights = data.get("temporal_weights", model.temporal_weights)
        model.spatial_kernel = data.get("spatial_kernel", model.spatial_kernel)
        model.momentum_weight = data.get("momentum_weight", model.momentum_weight)
        model.decay_factor = data.get("decay_factor", model.decay_factor)
        model.bias = data.get("bias", model.bias)
        model.is_trained = data.get("is_trained", True)
        return model
