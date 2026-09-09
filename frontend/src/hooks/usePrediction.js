/**
 * usePrediction.js — custom hook for executing and managing AI rainfall nowcasts,
 * horizon navigation, model metadata, and side-by-side comparisons.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchModelInfo, fetchRainfallPrediction } from "../services/api";

export function usePrediction(currentTimestamp) {
  const [viewMode, setViewMode] = useState("actual"); // 'actual' | 'predicted' | 'comparison'
  const [modelType, setModelType] = useState("spatiotemporal"); // 'spatiotemporal' | 'baseline'
  const [modelInfo, setModelInfo] = useState(null);

  const [predictionData, setPredictionData] = useState(null);
  const [selectedHorizonIndex, setSelectedHorizonIndex] = useState(0);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState(null);

  // Prediction cache keyed by `${timestamp}_${modelType}`
  const predictionCache = useRef(new Map());

  // 1. Fetch model info on mount
  useEffect(() => {
    let isMounted = true;
    async function loadModelInfo() {
      try {
        const info = await fetchModelInfo();
        if (isMounted) setModelInfo(info);
      } catch (err) {
        console.error("Failed to load model info:", err);
      }
    }
    loadModelInfo();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Run prediction for the current timestamp
  const runPrediction = useCallback(
    async (timestamp = currentTimestamp, horizonHours = 3, mType = modelType) => {
      if (!timestamp) return;

      const cacheKey = `${timestamp}_${mType}_${horizonHours}`;
      if (predictionCache.current.has(cacheKey)) {
        setPredictionData(predictionCache.current.get(cacheKey));
        setViewMode("predicted");
        return;
      }

      try {
        setIsPredicting(true);
        setPredictionError(null);
        const data = await fetchRainfallPrediction(timestamp, horizonHours, mType);
        predictionCache.current.set(cacheKey, data);
        setPredictionData(data);
        setSelectedHorizonIndex(0);
        setViewMode("predicted");
      } catch (err) {
        console.error("Prediction error:", err);
        setPredictionError(err.response?.data?.detail || err.message || "Prediction failed");
      } finally {
        setIsPredicting(false);
      }
    },
    [currentTimestamp, modelType]
  );

  const currentPredictedFrame = predictionData?.frames?.[selectedHorizonIndex] || null;

  return {
    viewMode,
    setViewMode,
    modelType,
    setModelType,
    modelInfo,
    predictionData,
    currentPredictedFrame,
    selectedHorizonIndex,
    setSelectedHorizonIndex,
    isPredicting,
    predictionError,
    runPrediction,
  };
}
