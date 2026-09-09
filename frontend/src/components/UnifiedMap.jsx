/**
 * UnifiedMap.jsx — Single Master Leaflet Map for the Hackathon Dashboard.
 * Supports simultaneous / toggleable map layers:
 * ☑ Actual Rainfall (GPM IMERG Observed)
 * ☑ Predicted Rainfall (AI Nowcast +1–3h)
 * ☑ DEM Elevation (SRTM 30m Topography)
 * ☑ Flood Risk (Multi-Criteria Susceptibility Index)
 * ☑ Alert Zones (YELLOW / ORANGE / RED Operational Warning Cells)
 */

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./UnifiedMap.css";

export default function UnifiedMap({
  rainfallData = null,
  predictionFrame = null,
  elevationData = null,
  slopeData = null,
  floodPrediction = null,
  alertData = null,
  selectedCell = null,
  onCellClick = () => {},
  loading = false,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const landmarksGroupRef = useRef(null);

  // Active Map Layer Checkboxes State (All default enabled for full visibility)
  const [layers, setLayers] = useState({
    actualRainfall: true,
    predictedRainfall: false,
    demElevation: false,
    floodRisk: true,
    alertZones: true,
  });

  const [showLandmarks, setShowLandmarks] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [10.5, 76.2],
      zoom: 7,
      minZoom: 6,
      maxZoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    // ArcGIS Dark Gray Base canvas
    L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "&copy; Esri, OpenStreetMap contributors | NASA GPM IMERG & SRTM DEM",
        maxZoom: 16,
      }
    ).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    landmarksGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Toggle individual layer checkbox
  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  // 2. Render Layers onto Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Map lookup for combining cell properties
    const cellMap = new Map();

    const getKey = (lat, lon) => `${roundCoord(lat)},${roundCoord(lon)}`;

    // Helper: round lat/lon to match keys
    function roundCoord(val) {
      return (Math.round(val * 10) / 10).toFixed(1);
    }

    // Populate actual rainfall
    if (layers.actualRainfall && rainfallData?.cells) {
      rainfallData.cells.forEach((c) => {
        const k = getKey(c.lat, c.lon);
        cellMap.set(k, {
          lat: c.lat,
          lon: c.lon,
          bounds: c.bounds,
          rainfall_mm: c.rainfall_mm,
          rainColor: c.color,
          rainOpacity: c.opacity || (c.rainfall_mm > 0.1 ? 0.65 : 0.0),
        });
      });
    }

    // Populate predicted rainfall
    if (layers.predictedRainfall && predictionFrame?.cells) {
      predictionFrame.cells.forEach((c) => {
        const k = getKey(c.lat, c.lon);
        const existing = cellMap.get(k) || {
          lat: c.lat,
          lon: c.lon,
          bounds: c.bounds,
        };
        existing.pred_rainfall_mm = c.rainfall_mm;
        existing.predColor = c.color;
        existing.predOpacity = c.rainfall_mm > 0.1 ? 0.7 : 0.0;
        cellMap.set(k, existing);
      });
    }

    // Populate DEM Elevation
    if (layers.demElevation && elevationData?.cells) {
      elevationData.cells.forEach((c) => {
        const k = getKey(c.lat, c.lon);
        const existing = cellMap.get(k) || {
          lat: c.lat,
          lon: c.lon,
          bounds: c.bounds,
        };
        existing.elevation_m = c.elevation_m;
        existing.elevColor = c.color;
        cellMap.set(k, existing);
      });
    }

    // Populate Flood Risk
    if (layers.floodRisk && floodPrediction?.cells) {
      floodPrediction.cells.forEach((c) => {
        const k = getKey(c.lat, c.lon);
        const existing = cellMap.get(k) || {
          lat: c.lat,
          lon: c.lon,
          bounds: c.bounds,
        };
        existing.risk_score = c.risk_score;
        existing.risk_level = c.risk_level;
        existing.risk_label = c.risk_label;
        existing.riskColor = c.color;
        existing.elevation_m = c.elevation_m;
        existing.slope_deg = c.slope_deg;
        existing.rainfall_mm = c.rainfall_mm;
        cellMap.set(k, existing);
      });
    }

    // Populate Alert Zones
    if (layers.alertZones && alertData?.cell_alerts) {
      alertData.cell_alerts.forEach((c) => {
        const k = getKey(c.lat, c.lon);
        const existing = cellMap.get(k) || {
          lat: c.lat,
          lon: c.lon,
          bounds: c.bounds,
        };
        existing.alert_level = c.alert_level;
        existing.alert_label = c.alert_label;
        existing.alertColor = c.color;
        cellMap.set(k, existing);
      });
    }

    // Draw rectangles
    cellMap.forEach((c) => {
      if (!c.bounds) return;

      // Determine priority fill color and stroke
      let fillColor = "transparent";
      let fillOpacity = 0.0;
      let strokeColor = "rgba(255,255,255,0.06)";
      let weight = 0.6;

      if (layers.alertZones && c.alertColor && c.alert_level !== "NORMAL") {
        fillColor = c.alertColor;
        fillOpacity = c.alert_level === "RED" ? 0.75 : c.alert_level === "ORANGE" ? 0.65 : 0.5;
        strokeColor = c.alert_level === "RED" ? "#ffffff" : "rgba(255,255,255,0.3)";
        weight = c.alert_level === "RED" ? 1.5 : 1.0;
      } else if (layers.floodRisk && c.riskColor && c.risk_score > 0.3) {
        fillColor = c.riskColor;
        fillOpacity = 0.65;
        strokeColor = "rgba(255,255,255,0.15)";
      } else if (layers.predictedRainfall && c.predColor && c.pred_rainfall_mm > 0.1) {
        fillColor = c.predColor;
        fillOpacity = c.predOpacity;
        strokeColor = "rgba(255,255,255,0.2)";
      } else if (layers.actualRainfall && c.rainColor && c.rainfall_mm > 0.1) {
        fillColor = c.rainColor;
        fillOpacity = c.rainOpacity;
        strokeColor = "rgba(255,255,255,0.12)";
      } else if (layers.demElevation && c.elevColor) {
        fillColor = c.elevColor;
        fillOpacity = 0.65;
        strokeColor = "rgba(255,255,255,0.08)";
      }

      if (fillOpacity <= 0.0 && !layers.demElevation) return;

      const rect = L.rectangle(c.bounds, {
        color: strokeColor,
        weight: weight,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
      });

      rect.on("mouseover", () => setHoveredCell(c));
      rect.on("mouseout", () => setHoveredCell(null));
      rect.on("click", () => onCellClick(c));

      rect.addTo(layerGroup);
    });
  }, [layers, rainfallData, predictionFrame, elevationData, floodPrediction, alertData, onCellClick]);

  // 3. Render Landmark Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const landmarksGroup = landmarksGroupRef.current;
    if (!map || !landmarksGroup) return;

    landmarksGroup.clearLayers();

    if (!showLandmarks) return;

    const landmarks = alertData?.landmarks_alert || floodPrediction?.landmarks_status || elevationData?.landmarks || [];

    landmarks.forEach((lm) => {
      const isPeak = lm.type === "peak" || (lm.elevation_m && lm.elevation_m > 1500);
      const isDepression = lm.type === "depression" || (lm.elevation_m && lm.elevation_m < 10);
      const isRed = lm.alert_level === "RED";

      const iconHtml = `
        <div class="custom-landmark-pin ${isRed ? "pin--red-alert" : isPeak ? "pin--peak" : isDepression ? "pin--basin" : "pin--pass"}">
          <span class="pin-icon">${isRed ? "🚨" : isPeak ? "⛰️" : isDepression ? "🌊" : "📍"}</span>
          <span class="pin-label">${lm.name.split(" (")[0]}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "leaflet-landmark-wrapper",
        iconSize: [115, 32],
        iconAnchor: [57, 16],
      });

      const marker = L.marker([lm.lat, lm.lon], { icon: customIcon });

      const popupHtml = `
        <div class="landmark-popup-card">
          <div class="popup-title">${lm.name}</div>
          <div class="popup-metrics">
            <div><strong>Alert Level:</strong> <span style="color:${lm.color};font-weight:bold;">${lm.alert_label || lm.risk_label}</span></div>
            ${lm.rainfall_mm !== undefined ? `<div><strong>Rainfall:</strong> ${lm.rainfall_mm} mm</div>` : ""}
            ${lm.elevation_m !== undefined ? `<div><strong>Elevation:</strong> ${lm.elevation_m} m</div>` : ""}
            ${lm.slope_deg !== undefined ? `<div><strong>Slope:</strong> ${lm.slope_deg}°</div>` : ""}
            ${lm.flood_risk_score !== undefined ? `<div><strong>Flood Risk:</strong> ${lm.flood_risk_score}</div>` : ""}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: "custom-leaflet-popup" });
      marker.addTo(landmarksGroup);
    });
  }, [showLandmarks, alertData, floodPrediction, elevationData]);

  const handleResetBounds = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([10.5, 76.2], 7);
  };

  return (
    <div className="unified-map-card">
      {/* ── Layer Checkboxes Control Bar ──────────────────────────────────── */}
      <div className="unified-map-controls-bar">
        <div className="map-layer-checkboxes">
          <span className="checkboxes-title">Map Layers:</span>
          
          <label className={`layer-checkbox-item ${layers.actualRainfall ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={layers.actualRainfall}
              onChange={() => toggleLayer("actualRainfall")}
            />
            <span className="cb-indicator cb--actual" />
            <span>Actual Rainfall</span>
          </label>

          <label className={`layer-checkbox-item ${layers.predictedRainfall ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={layers.predictedRainfall}
              onChange={() => toggleLayer("predictedRainfall")}
            />
            <span className="cb-indicator cb--predicted" />
            <span>Predicted Rainfall</span>
          </label>

          <label className={`layer-checkbox-item ${layers.demElevation ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={layers.demElevation}
              onChange={() => toggleLayer("demElevation")}
            />
            <span className="cb-indicator cb--dem" />
            <span>DEM Elevation</span>
          </label>

          <label className={`layer-checkbox-item ${layers.floodRisk ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={layers.floodRisk}
              onChange={() => toggleLayer("floodRisk")}
            />
            <span className="cb-indicator cb--flood" />
            <span>Flood Risk</span>
          </label>

          <label className={`layer-checkbox-item ${layers.alertZones ? "checked" : ""}`}>
            <input
              type="checkbox"
              checked={layers.alertZones}
              onChange={() => toggleLayer("alertZones")}
            />
            <span className="cb-indicator cb--alerts" />
            <span>Alert Zones</span>
          </label>
        </div>

        <div className="map-aux-tools">
          <label className="landmarks-toggle">
            <input
              type="checkbox"
              checked={showLandmarks}
              onChange={(e) => setShowLandmarks(e.target.checked)}
            />
            <span>Landmarks</span>
          </label>

          <button className="recenter-btn" onClick={handleResetBounds} title="Reset Center">
            🎯 Recenter
          </button>
        </div>
      </div>

      {/* ── Leaflet Viewport ──────────────────────────────────────────────── */}
      <div className="unified-map-viewport-wrapper">
        <div ref={mapContainerRef} className="unified-map-viewport" />

        {/* Loading Overlay */}
        {loading && (
          <div className="unified-map-loading">
            <div className="loading-spinner" />
            <span>Synchronizing Map Layers &amp; Multi-Hazard Spatial Grid...</span>
          </div>
        )}

        {/* Hover Inspector Tooltip */}
        {hoveredCell && (
          <div className="floating-inspector-tooltip">
            <div className="inspector-header">
              📍 Cell [{hoveredCell.lat.toFixed(2)}°N, {hoveredCell.lon.toFixed(2)}°E]
            </div>
            <div className="inspector-grid">
              {hoveredCell.alert_level && (
                <div className="inspector-row inspector-row--highlight">
                  <span className="ins-lbl">Alert Level:</span>
                  <span className="ins-val" style={{ color: hoveredCell.alertColor || "#f87171" }}>
                    {hoveredCell.alert_label || hoveredCell.alert_level}
                  </span>
                </div>
              )}
              {hoveredCell.rainfall_mm !== undefined && (
                <div className="inspector-row">
                  <span className="ins-lbl">Rainfall:</span>
                  <span className="ins-val">{hoveredCell.rainfall_mm} mm</span>
                </div>
              )}
              {hoveredCell.elevation_m !== undefined && (
                <div className="inspector-row">
                  <span className="ins-lbl">Elevation:</span>
                  <span className="ins-val">{hoveredCell.elevation_m} m</span>
                </div>
              )}
              {hoveredCell.slope_deg !== undefined && (
                <div className="inspector-row">
                  <span className="ins-lbl">Slope:</span>
                  <span className="ins-val">{hoveredCell.slope_deg}°</span>
                </div>
              )}
              {hoveredCell.risk_score !== undefined && (
                <div className="inspector-row">
                  <span className="ins-lbl">Flood Susceptibility:</span>
                  <span className="ins-val" style={{ color: hoveredCell.riskColor || "#eab308" }}>
                    {hoveredCell.risk_score} ({hoveredCell.risk_label || "Score"})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
