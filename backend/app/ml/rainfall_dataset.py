"""
ml/rainfall_dataset.py
-----------------------
Dataset preprocessing, sequential sliding window generation,
and strict temporal train/validation/test splitting to prevent data leakage.
"""

from __future__ import annotations

import copy
from typing import Any, Dict, List, Tuple, Optional
from pathlib import Path
import json


class RainfallDataset:
    """
    Handles spatial grid sequence generation:
    Input:  [t-3, t-2, t-1, t]  (4 sequential time frames)
    Target: [t+1]               (next time frame)
    """

    def __init__(
        self,
        frames_dict: Dict[str, List[List[float]]],
        latitudes: List[float],
        longitudes: List[float],
        sequence_length: int = 4,
    ):
        self.sequence_length = sequence_length
        self.latitudes = latitudes
        self.longitudes = longitudes
        self.n_lat = len(latitudes)
        self.n_lon = len(longitudes)

        # Sort timestamps chronologically to enforce strict temporal ordering
        self.timestamps = sorted(list(frames_dict.keys()))
        self.raw_grids = [frames_dict[ts] for ts in self.timestamps]

        self.samples = self._create_sequences()

    def _create_sequences(self) -> List[Dict[str, Any]]:
        """
        Creates sliding window sequences of length `sequence_length` -> target `t+1`.
        """
        samples = []
        n_frames = len(self.raw_grids)

        for i in range(n_frames - self.sequence_length):
            input_grids = [self.raw_grids[i + j] for j in range(self.sequence_length)]
            target_grid = self.raw_grids[i + self.sequence_length]

            input_timestamps = [self.timestamps[i + j] for j in range(self.sequence_length)]
            target_timestamp = self.timestamps[i + self.sequence_length]

            samples.append({
                "input_grids": input_grids,
                "target_grid": target_grid,
                "input_timestamps": input_timestamps,
                "target_timestamp": target_timestamp,
                "start_index": i,
            })

        return samples

    def temporal_train_val_test_split(
        self, train_ratio: float = 0.6, val_ratio: float = 0.15
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Strict temporal train/validation/test split based on time sequence.
        NEVER shuffles data across time to strictly prevent temporal leakage.
        """
        n = len(self.samples)
        if n < 3:
            # If dataset is small, split minimally
            return self.samples[:max(1, n - 2)], self.samples[-2:-1] if n >= 2 else [], self.samples[-1:]

        n_train = max(1, int(round(n * train_ratio)))
        n_val = max(1, int(round(n * val_ratio)))
        if n_train + n_val >= n:
            n_train = max(1, n - 2)
            n_val = 1

        train_samples = self.samples[:n_train]
        val_samples = self.samples[n_train : n_train + n_val]
        test_samples = self.samples[n_train + n_val :]

        if not test_samples and val_samples:
            test_samples = [val_samples.pop()]

        return train_samples, val_samples, test_samples
