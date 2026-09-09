/**
 * api.js — thin wrapper around the backend API base URL.
 * All fetch calls go through this module so that a single env-var change
 * switches between dev (localhost:8000) and any future deployment URL.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export default api;

/**
 * Fetch system health from GET /api/health
 * @returns {Promise<{status: string, service: string}>}
 */
export async function fetchHealth() {
  const { data } = await api.get("/api/health");
  return data;
}

/**
 * Fetch rainfall dataset metadata from GET /api/rainfall/metadata
 */
export async function fetchRainfallMetadata() {
  const { data } = await api.get("/api/rainfall/metadata");
  return data;
}

/**
 * Fetch available rainfall timestamps and summaries from GET /api/rainfall/frames
 */
export async function fetchRainfallFrames() {
  const { data } = await api.get("/api/rainfall/frames");
  return data;
}

/**
 * Fetch complete spatial rainfall grid for a specific timestamp from GET /api/rainfall/map/{timestamp}
 * @param {string} timestamp - ISO timestamp string or 'latest'
 */
export async function fetchRainfallMap(timestamp = "latest") {
  const encoded = encodeURIComponent(timestamp);
  const { data } = await api.get(`/api/rainfall/map/${encoded}`);
  return data;
}

/**
 * Fetch reference weather station markers from GET /api/rainfall/stations
 */
export async function fetchWeatherStations() {
  const { data } = await api.get("/api/rainfall/stations");
  return data.stations;
}

/**
 * Generate AI rainfall nowcast from POST /api/prediction/rainfall
 * @param {string} startTimestamp
 * @param {number} horizonHours
 * @param {string} modelType ('spatiotemporal' | 'baseline')
 */
export async function fetchRainfallPrediction(
  startTimestamp,
  horizonHours = 3,
  modelType = "spatiotemporal"
) {
  const { data } = await api.post("/api/prediction/rainfall", {
    start_timestamp: startTimestamp,
    horizon_hours: horizonHours,
    model_type: modelType,
  });
  return data;
}

/**
 * Fetch model information and evaluation metrics from GET /api/prediction/model-info
 */
export async function fetchModelInfo() {
  const { data } = await api.get("/api/prediction/model-info");
  return data;
}

/**
 * Fetch SRTM DEM metadata from GET /api/dem/metadata
 */
export async function fetchDEMMetadata() {
  const { data } = await api.get("/api/dem/metadata");
  return data;
}

/**
 * Fetch gridded SRTM elevation dataset from GET /api/dem/elevation
 */
export async function fetchDEMElevation() {
  const { data } = await api.get("/api/dem/elevation");
  return data;
}

/**
 * Fetch gridded terrain slope dataset from GET /api/dem/slope
 */
export async function fetchDEMSlope() {
  const { data } = await api.get("/api/dem/slope");
  return data;
}

/**
 * Calculate simplified multi-criteria inundation susceptibility from POST /api/flood/predict
 * @param {string} timestamp
 * @param {Array<Array<number>>} rainfallGrid
 * @param {Object} customWeights
 */
export async function fetchFloodPrediction(
  timestamp = null,
  rainfallGrid = null,
  customWeights = null
) {
  const { data } = await api.post("/api/flood/predict", {
    predicted_rainfall_timestamp: timestamp,
    rainfall_grid: rainfallGrid,
    custom_weights: customWeights,
  });
  return data;
}

/**
 * Fetch flood risk configuration and weights from GET /api/flood/config
 */
export async function fetchFloodConfig() {
  const { data } = await api.get("/api/flood/config");
  return data;
}

/**
 * Evaluate multi-hazard alert engine from POST /api/alerts/evaluate
 * @param {string} timestamp
 * @param {Array<Array<number>>} rainfallGrid
 * @param {Array<Array<number>>} floodRiskGrid
 * @param {Object} customThresholds
 */
export async function fetchAlertEvaluation(
  timestamp = null,
  rainfallGrid = null,
  floodRiskGrid = null,
  customThresholds = null
) {
  const { data } = await api.post("/api/alerts/evaluate", {
    timestamp,
    rainfall_grid: rainfallGrid,
    flood_risk_grid: floodRiskGrid,
    custom_thresholds: customThresholds,
  });
  return data;
}

/**
 * Fetch alert thresholds config from GET /api/alerts/config
 */
export async function fetchAlertConfig() {
  const { data } = await api.get("/api/alerts/config");
  return data;
}


