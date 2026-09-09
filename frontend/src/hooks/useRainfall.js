/**
 * useRainfall.js — custom hook for managing rainfall map state,
 * timestamp timeline progression, caching, and station metadata.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchRainfallFrames,
  fetchRainfallMap,
  fetchWeatherStations,
} from "../services/api";

export function useRainfall() {
  const [framesSummary, setFramesSummary] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [currentTimestamp, setCurrentTimestamp] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [mapData, setMapData] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1500); // ms per step

  const [selectedCell, setSelectedCell] = useState(null);
  const [filterLevel, setFilterLevel] = useState(null); // filter by IMD level

  // Cache to avoid refetching already loaded frames during timeline playback
  const cacheRef = useRef(new Map());

  // 1. Initial load: fetch timeline frames & stations
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setLoading(true);
        setError(null);

        const [framesRes, stationsRes] = await Promise.all([
          fetchRainfallFrames(),
          fetchWeatherStations().catch(() => []),
        ]);

        if (!isMounted) return;

        setTimestamps(framesRes.timestamps || []);
        setFramesSummary(framesRes.frames_summary || []);
        setStations(stationsRes || []);

        const initialTs = framesRes.default_timestamp || framesRes.timestamps?.[0];
        if (initialTs) {
          setCurrentTimestamp(initialTs);
          const initialIdx = (framesRes.timestamps || []).indexOf(initialTs);
          setCurrentIndex(initialIdx >= 0 ? initialIdx : 0);

          // Fetch map data for the initial timestamp
          const initialMap = await fetchRainfallMap(initialTs);
          if (isMounted) {
            setMapData(initialMap);
            cacheRef.current.set(initialTs, initialMap);
          }
        }
      } catch (err) {
        console.error("Failed to initialize rainfall data:", err);
        if (isMounted) {
          setError(err.response?.data?.detail || err.message || "Failed to load rainfall data");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load map data when currentTimestamp changes
  const loadMapForTimestamp = useCallback(async (ts) => {
    if (!ts) return;

    if (cacheRef.current.has(ts)) {
      setMapData(cacheRef.current.get(ts));
      return;
    }

    try {
      setMapLoading(true);
      const data = await fetchRainfallMap(ts);
      cacheRef.current.set(ts, data);
      setMapData(data);
    } catch (err) {
      console.error(`Failed to fetch map for ${ts}:`, err);
    } finally {
      setMapLoading(false);
    }
  }, []);

  // 3. Timestamp selection handler
  const selectTimestamp = useCallback((ts) => {
    setCurrentTimestamp(ts);
    const idx = timestamps.indexOf(ts);
    if (idx >= 0) setCurrentIndex(idx);
    setSelectedCell(null);
    loadMapForTimestamp(ts);
  }, [timestamps, loadMapForTimestamp]);

  // 4. Index-based navigation (Next / Prev / Slider)
  const selectIndex = useCallback((idx) => {
    if (idx < 0 || idx >= timestamps.length) return;
    const ts = timestamps[idx];
    setCurrentIndex(idx);
    setCurrentTimestamp(ts);
    setSelectedCell(null);
    loadMapForTimestamp(ts);
  }, [timestamps, loadMapForTimestamp]);

  const nextFrame = useCallback(() => {
    selectIndex((currentIndex + 1) % timestamps.length);
  }, [currentIndex, timestamps.length, selectIndex]);

  const prevFrame = useCallback(() => {
    selectIndex((currentIndex - 1 + timestamps.length) % timestamps.length);
  }, [currentIndex, timestamps.length, selectIndex]);

  // 5. Automated playback animation
  useEffect(() => {
    if (!isPlaying || timestamps.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIdx) => {
        const nextIdx = (prevIdx + 1) % timestamps.length;
        const nextTs = timestamps[nextIdx];
        setCurrentTimestamp(nextTs);
        loadMapForTimestamp(nextTs);
        return nextIdx;
      });
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, timestamps, playbackSpeed, loadMapForTimestamp]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return {
    loading,
    mapLoading,
    error,
    timestamps,
    framesSummary,
    currentTimestamp,
    currentIndex,
    mapData,
    stations,
    selectedCell,
    setSelectedCell,
    filterLevel,
    setFilterLevel,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    selectTimestamp,
    selectIndex,
    nextFrame,
    prevFrame,
  };
}
