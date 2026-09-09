/**
 * useFloodRisk.js — Custom hook for SRTM DEM terrain layers and
 * simplified multi-criteria flood inundation susceptibility modeling.
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchDEMMetadata,
  fetchDEMElevation,
  fetchDEMSlope,
  fetchFloodPrediction,
} from "../services/api";

export function useFloodRisk(currentTimestamp = null, currentRainfallGrid = null) {
  const [activeLayer, setActiveLayer] = useState("rainfall"); // 'rainfall' | 'elevation' | 'slope' | 'inundation'
  const [demMetadata, setDemMetadata] = useState(null);
  const [elevationData, setElevationData] = useState(null);
  const [slopeData, setSlopeData] = useState(null);
  const [floodPrediction, setFloodPrediction] = useState(null);
  
  const [isLoadingTerrain, setIsLoadingTerrain] = useState(false);
  const [isLoadingFlood, setIsLoadingFlood] = useState(false);
  const [error, setError] = useState(null);

  const [weights, setWeights] = useState({
    rainfall_weight: 0.50,
    elevation_weight: 0.30,
    slope_weight: 0.20,
  });

  // 1. Initial load of DEM metadata, elevation, and slope grids
  useEffect(() => {
    let isMounted = true;
    async function loadDEMData() {
      setIsLoadingTerrain(true);
      try {
        const [meta, elev, slope] = await Promise.all([
          fetchDEMMetadata(),
          fetchDEMElevation(),
          fetchDEMSlope(),
        ]);
        if (isMounted) {
          setDemMetadata(meta);
          setElevationData(elev);
          setSlopeData(slope);
        }
      } catch (err) {
        console.error("[useFloodRisk] Error loading DEM data:", err);
        if (isMounted) setError("Failed to load SRTM DEM terrain data.");
      } finally {
        if (isMounted) setIsLoadingTerrain(false);
      }
    }

    loadDEMData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch or re-compute inundation prediction when timestamp or weights change
  const computeFloodRisk = useCallback(
    async (targetTimestamp = currentTimestamp, customW = weights, rGrid = currentRainfallGrid) => {
      setIsLoadingFlood(true);
      try {
        const data = await fetchFloodPrediction(targetTimestamp, rGrid, customW);
        setFloodPrediction(data);
      } catch (err) {
        console.error("[useFloodRisk] Error computing flood risk:", err);
      } finally {
        setIsLoadingFlood(false);
      }
    },
    [currentTimestamp, weights, currentRainfallGrid]
  );

  useEffect(() => {
    if (currentTimestamp) {
      computeFloodRisk(currentTimestamp, weights, currentRainfallGrid);
    }
  }, [currentTimestamp, currentRainfallGrid, weights, computeFloodRisk]);

  return {
    activeLayer,
    setActiveLayer,
    demMetadata,
    elevationData,
    slopeData,
    floodPrediction,
    isLoadingTerrain,
    isLoadingFlood,
    error,
    weights,
    setWeights,
    refreshFloodRisk: computeFloodRisk,
  };
}
