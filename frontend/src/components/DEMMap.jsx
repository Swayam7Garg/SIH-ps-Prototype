/**
 * DEMMap.jsx — Multi-layer Terrain & Inundation Risk Interactive Leaflet Map.
 * Allows toggling between:
 * 1. Rainfall (GPM IMERG Observations / Predictions)
 * 2. DEM Elevation (SRTM Hypsometric Tinting 0m–2695m)
 * 3. Terrain Slope (Central Finite Difference 0°–25°+)
 * 4. Simplified Inundation Risk (Multi-Criteria Index: Rain + Elev + Slope)
 */

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./DEMMap.css";

export default function DEMMap({
  activeLayer = "rainfall", // 'rainfall' | 'elevation' | 'slope' | 'inundation'
  onLayerChange = () => {},
  rainfallData = null,
  elevationData = null,
  slopeData = null,
  floodPrediction = null,
  selectedCell = null,
  onCellClick = () => {},
  isLoading = false,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const landmarksGroupRef = useRef(null);

  const [opacity, setOpacity] = useState(0.75);
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

    // High-contrast dark topographic basemap
    L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: '&copy; Esri, OpenStreetMap contributors | NASA GPM IMERG & SRTM DEM',
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

  // 2. Render Selected Grid Layer (Rainfall / Elevation / Slope / Inundation)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    let cellsToRender = [];

    if (activeLayer === "rainfall" && rainfallData?.cells) {
      cellsToRender = rainfallData.cells.map((c) => ({
        lat: c.lat,
        lon: c.lon,
        bounds: c.bounds,
        color: c.color,
        opacity: c.rainfall_mm > 0.1 ? opacity : 0.0,
        fillOpacity: c.rainfall_mm > 0.1 ? opacity : 0.0,
        strokeColor: c.rainfall_mm > 0.1 ? "rgba(255,255,255,0.15)" : "transparent",
        type: "rainfall",
        raw: c,
      }));
    } else if (activeLayer === "elevation" && elevationData?.cells) {
      cellsToRender = elevationData.cells.map((c) => ({
        lat: c.lat,
        lon: c.lon,
        bounds: c.bounds,
        color: c.color,
        opacity: opacity,
        fillOpacity: opacity,
        strokeColor: "rgba(255,255,255,0.08)",
        type: "elevation",
        raw: c,
      }));
    } else if (activeLayer === "slope" && slopeData?.cells) {
      cellsToRender = slopeData.cells.map((c) => ({
        lat: c.lat,
        lon: c.lon,
        bounds: c.bounds,
        color: c.color,
        opacity: opacity,
        fillOpacity: opacity,
        strokeColor: "rgba(255,255,255,0.08)",
        type: "slope",
        raw: c,
      }));
    } else if (activeLayer === "inundation" && floodPrediction?.cells) {
      cellsToRender = floodPrediction.cells.map((c) => ({
        lat: c.lat,
        lon: c.lon,
        bounds: c.bounds,
        color: c.color,
        opacity: opacity,
        fillOpacity: opacity,
        strokeColor: c.risk_score > 0.3 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)",
        type: "inundation",
        raw: c,
      }));
    }

    cellsToRender.forEach((item) => {
      if (item.opacity <= 0.0) return;

      const rect = L.rectangle(item.bounds, {
        color: item.strokeColor,
        weight: 0.7,
        fillColor: item.color,
        fillOpacity: item.fillOpacity,
      });

      rect.on("mouseover", () => setHoveredCell(item.raw));
      rect.on("mouseout", () => setHoveredCell(null));
      rect.on("click", () => onCellClick(item.raw));

      rect.addTo(layerGroup);
    });
  }, [activeLayer, rainfallData, elevationData, slopeData, floodPrediction, opacity, onCellClick]);

  // 3. Render Topographic Landmarks & Peaks
  useEffect(() => {
    const map = mapInstanceRef.current;
    const landmarksGroup = landmarksGroupRef.current;
    if (!map || !landmarksGroup) return;

    landmarksGroup.clearLayers();

    if (!showLandmarks) return;

    const landmarks = floodPrediction?.landmarks_status || elevationData?.landmarks || [];

    landmarks.forEach((lm) => {
      const isPeak = lm.type === "peak" || (lm.elevation_m && lm.elevation_m > 1500);
      const isDepression = lm.type === "depression" || (lm.elevation_m && lm.elevation_m < 10);

      const iconHtml = `
        <div class="custom-landmark-pin ${isPeak ? "pin--peak" : isDepression ? "pin--basin" : "pin--pass"}">
          <span class="pin-icon">${isPeak ? "⛰️" : isDepression ? "🌊" : "📍"}</span>
          <span class="pin-label">${lm.name.split(" (")[0]}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "leaflet-landmark-wrapper",
        iconSize: [110, 32],
        iconAnchor: [55, 16],
      });

      const marker = L.marker([lm.lat, lm.lon], { icon: customIcon });

      const popupHtml = `
        <div class="landmark-popup-card">
          <div class="popup-title">${lm.name}</div>
          <div class="popup-metrics">
            <div><strong>Elevation:</strong> ${lm.elevation_m !== undefined ? lm.elevation_m + " m" : "N/A"}</div>
            ${lm.slope_deg !== undefined ? `<div><strong>Slope:</strong> ${lm.slope_deg}°</div>` : ""}
            ${lm.rainfall_mm !== undefined ? `<div><strong>Rainfall:</strong> ${lm.rainfall_mm} mm</div>` : ""}
            ${lm.risk_score !== undefined ? `<div><strong>Inundation Risk:</strong> <span style="color:${lm.color};font-weight:bold;">${lm.risk_label} (${lm.risk_score})</span></div>` : ""}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: "custom-leaflet-popup" });
      marker.addTo(landmarksGroup);
    });
  }, [showLandmarks, floodPrediction, elevationData]);

  const handleResetBounds = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([10.5, 76.2], 7);
  };

  return (
    <div className="dem-map-card">
      {/* ── Layer Switcher & Map Bar ────────────────────────────────────────── */}
      <div className="dem-map-header">
        <div className="layer-switcher-group">
          <span className="layer-switcher-label">Terrain &amp; Flood Layers:</span>
          <div className="layer-pill-buttons">
            <button
              className={`layer-btn ${activeLayer === "rainfall" ? "active active--rainfall" : ""}`}
              onClick={() => onLayerChange("rainfall")}
              title="GPM IMERG Satellite Precipitation"
            >
              <span className="layer-dot layer-dot--rainfall" />
              <span>🌧️ Rainfall</span>
            </button>

            <button
              className={`layer-btn ${activeLayer === "elevation" ? "active active--elevation" : ""}`}
              onClick={() => onLayerChange("elevation")}
              title="SRTM Digital Elevation Model (0–2695m)"
            >
              <span className="layer-dot layer-dot--elevation" />
              <span>⛰️ DEM Elevation</span>
            </button>

            <button
              className={`layer-btn ${activeLayer === "slope" ? "active active--slope" : ""}`}
              onClick={() => onLayerChange("slope")}
              title="Terrain Slope Gradient (Water Accumulation)"
            >
              <span className="layer-dot layer-dot--slope" />
              <span>📐 Slope Gradient</span>
            </button>

            <button
              className={`layer-btn ${activeLayer === "inundation" ? "active active--inundation" : ""}`}
              onClick={() => onLayerChange("inundation")}
              title="Simplified Multi-Criteria Flood Inundation Risk Index"
            >
              <span className="layer-dot layer-dot--inundation" />
              <span>🌊 Inundation Risk</span>
            </button>
          </div>
        </div>

        {/* Controls: Opacity & Landmarks */}
        <div className="map-aux-controls">
          <label className="toggle-landmarks-btn">
            <input
              type="checkbox"
              checked={showLandmarks}
              onChange={(e) => setShowLandmarks(e.target.checked)}
            />
            <span>Landmarks</span>
          </label>

          <div className="opacity-slider-box" title="Layer Opacity">
            <span className="slider-label">Opacity:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="opacity-slider"
            />
          </div>

          <button className="reset-view-btn" onClick={handleResetBounds} title="Reset Map Center">
            🎯 Reset
          </button>
        </div>
      </div>

      {/* ── Leaflet Map Container ─────────────────────────────────────────── */}
      <div className="dem-map-viewport-wrapper">
        <div ref={mapContainerRef} className="dem-map-viewport" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="map-loading-overlay">
            <div className="map-spinner" />
            <span>Processing Spatial Terrain &amp; Inundation Models...</span>
          </div>
        )}

        {/* Floating Cell Inspector Tooltip */}
        {hoveredCell && (
          <div className="floating-cell-tooltip">
            <div className="tooltip-header">
              📍 Cell [{hoveredCell.lat.toFixed(2)}°N, {hoveredCell.lon.toFixed(2)}°E]
            </div>
            <div className="tooltip-grid">
              {hoveredCell.rainfall_mm !== undefined && (
                <div className="tooltip-item">
                  <span className="tooltip-lbl">Rainfall:</span>
                  <span className="tooltip-val" style={{ color: hoveredCell.color }}>
                    {hoveredCell.rainfall_mm} mm
                  </span>
                </div>
              )}
              {hoveredCell.elevation_m !== undefined && (
                <div className="tooltip-item">
                  <span className="tooltip-lbl">Elevation:</span>
                  <span className="tooltip-val">{hoveredCell.elevation_m} m</span>
                </div>
              )}
              {hoveredCell.slope_deg !== undefined && (
                <div className="tooltip-item">
                  <span className="tooltip-lbl">Slope:</span>
                  <span className="tooltip-val">{hoveredCell.slope_deg}°</span>
                </div>
              )}
              {hoveredCell.risk_score !== undefined && (
                <div className="tooltip-item tooltip-item--full">
                  <span className="tooltip-lbl">Risk Score:</span>
                  <span className="tooltip-val tooltip-risk" style={{ color: hoveredCell.color }}>
                    {hoveredCell.risk_label} ({hoveredCell.risk_score})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Layer Badge in Bottom Left */}
        <div className="active-layer-indicator">
          <span className="badge-pulse" />
          <span className="badge-text">
            Active: <strong>{activeLayer.toUpperCase()}</strong> ({rainfallData?.spatial_resolution || "0.1° Grid / ~11km"})
          </span>
        </div>
      </div>
    </div>
  );
}
