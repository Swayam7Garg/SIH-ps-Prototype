/**
 * useAlerts.js — Custom hook to fetch and evaluate multi-hazard rainfall
 * and inundation prototype operational alerts.
 */

import { useState, useEffect, useCallback } from "react";
import { fetchAlertEvaluation } from "../services/api";

export function useAlerts(currentTimestamp = null, rainfallGrid = null, floodRiskGrid = null) {
  const [alertData, setAlertData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const evaluateAlerts = useCallback(
    async (ts = currentTimestamp, rGrid = rainfallGrid, fGrid = floodRiskGrid) => {
      setIsLoading(true);
      try {
        const res = await fetchAlertEvaluation(ts, rGrid, fGrid);
        setAlertData(res);
        setError(null);
      } catch (err) {
        console.error("[useAlerts] Failed to evaluate alerts:", err);
        setError("Failed to fetch alert engine evaluation.");
      } finally {
        setIsLoading(false);
      }
    },
    [currentTimestamp, rainfallGrid, floodRiskGrid]
  );

  useEffect(() => {
    if (currentTimestamp) {
      evaluateAlerts(currentTimestamp, rainfallGrid, floodRiskGrid);
    }
  }, [currentTimestamp, rainfallGrid, floodRiskGrid, evaluateAlerts]);

  return {
    alertData,
    isLoading,
    error,
    refreshAlerts: evaluateAlerts,
  };
}
