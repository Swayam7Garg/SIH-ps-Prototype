/**
 * PredictionMap.jsx — Reusable interactive Leaflet map component for AI-predicted rainfall nowcasting.
 * Uses exact coordinate bounds, IMD color scales, forecast horizon indicators,
 * and scientific disclaimer overlays.
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Rectangle,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./PredictionMap.css";

const TILE_PROVIDERS = {
  dark: {
    name: "Dark Canvas",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, HERE, Garmin, (c) OpenStreetMap contributors",
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
  },
  streets: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

function MapController({ center, bounds, shouldRecenter }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (bounds && bounds.length === 2) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 9, animate: false });
    } else if (center) {
      map.setView(center, 8, { animate: false });
    }
  }, [bounds, center, shouldRecenter, map]);
  return null;
}

export default function PredictionMap({
  predictedFrame = null,
  bounds = null,
  center = null,
  stations = [],
  filterLevel = null,
  selectedCell = null,
  onCellSelect = () => {},
  loading = false,
  modelName = "Spatio-Temporal Conv-ML Nowcaster",
  customHeight = "560px",
  isSideBySide = false,
}) {
  const [basemap, setBasemap] = useState("dark");
  const [showStations, setShowStations] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.85);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [recenterKey, setRecenterKey] = useState(0);

  const defaultCenter = useMemo(() => center || [10.35, 76.25], [center]);
  const defaultBounds = useMemo(
    () =>
      bounds || [
        [8.15, 74.75],
        [12.85, 77.65],
      ],
    [bounds]
  );

  const cells = predictedFrame?.cells || [];
  const visibleCells = useMemo(() => {
    if (!filterLevel) return cells;
    return cells.filter((c) => c.level === filterLevel);
  }, [cells, filterLevel]);

  const stats = predictedFrame?.stats || {};
  const peakLoc = stats.peak_location;

  return (
    <div className={`prediction-map-wrapper ${isSideBySide ? "is-side-by-side" : ""}`} style={{ height: customHeight }}>
      {/* ── Forecast Banner Overlay ──────────────────────────────────────── */}
      <div className="prediction-map__banner">
        <div className="banner-badge">
          <span className="banner-icon">⚡</span>
          <span className="banner-title">
            {predictedFrame?.horizon_label || "+1 Hour AI Nowcast"}
          </span>
        </div>
        <span className="banner-disclaimer">EXPERIMENTAL MODEL FORECAST · NOT OPERATIONAL ALERT</span>
      </div>

      {/* ── Map Controls Floating Bar ────────────────────────────────────── */}
      <div className="prediction-map__controls-bar">
        <div className="map-control-group">
          <div className="map-btn-pills">
            {Object.entries(TILE_PROVIDERS).map(([key, provider]) => (
              <button
                key={key}
                className={`map-pill-btn ${basemap === key ? "active" : ""}`}
                onClick={() => setBasemap(key)}
                title={`Switch to ${provider.name}`}
              >
                {provider.name}
              </button>
            ))}
          </div>
        </div>

        <button
          className="map-action-btn"
          onClick={() => setRecenterKey((k) => k + 1)}
          title="Fit Region"
        >
          <span>Fit</span>
        </button>
      </div>

      {/* ── Active Cell Inspector Floating Card ─────────────────────────── */}
      {(hoveredCell || selectedCell) && (
        <div className="prediction-map__inspector-card">
          <div className="inspector-card__header">
            <span className="inspector-card__icon">🔮</span>
            <div className="inspector-card__title-box">
              <div className="inspector-card__title">
                {(hoveredCell || selectedCell).rainfall_mm.toFixed(1)} mm
              </div>
              <div className="inspector-card__subtitle">
                Predicted: {(hoveredCell || selectedCell).level_label}
              </div>
            </div>
            <span
              className="inspector-card__alert"
              style={{
                backgroundColor: `${(hoveredCell || selectedCell).color}33`,
                borderColor: (hoveredCell || selectedCell).color,
                color: (hoveredCell || selectedCell).color,
              }}
            >
              {(hoveredCell || selectedCell).alert}
            </span>
          </div>
          <div className="inspector-card__grid">
            <div className="inspector-metric">
              <span className="metric-label">Lat / Lon:</span>
              <span className="metric-value">
                {(hoveredCell || selectedCell).lat.toFixed(2)}°N,{" "}
                {(hoveredCell || selectedCell).lon.toFixed(2)}°E
              </span>
            </div>
            <div className="inspector-metric">
              <span className="metric-label">Forecast Horizon:</span>
              <span className="metric-value">{predictedFrame?.horizon_label || "+1h"}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading Overlay ─────────────────────────────────────────────── */}
      {loading && (
        <div className="prediction-map__loading-overlay">
          <div className="map-spinner" />
          <span>Computing Spatio-Temporal Nowcast...</span>
        </div>
      )}

      {/* ── Leaflet Container ───────────────────────────────────────────── */}
      <MapContainer
        center={defaultCenter}
        zoom={8}
        minZoom={6}
        maxZoom={14}
        scrollWheelZoom={true}
        className="prediction-leaflet-container"
      >
        <MapController
          center={defaultCenter}
          bounds={defaultBounds}
          shouldRecenter={recenterKey > 0}
        />

        <TileLayer
          key={basemap}
          url={TILE_PROVIDERS[basemap].url}
          attribution={TILE_PROVIDERS[basemap].attribution}
          maxZoom={18}
        />

        {/* ── Predicted Rainfall Grid Rectangles ────────────────────────── */}
        {visibleCells.map((cell, idx) => {
          const isSelected =
            selectedCell?.lat === cell.lat && selectedCell?.lon === cell.lon;
          const isHovered =
            hoveredCell?.lat === cell.lat && hoveredCell?.lon === cell.lon;

          return (
            <Rectangle
              key={`pred-${cell.lat}-${cell.lon}-${idx}`}
              bounds={cell.bounds}
              pathOptions={{
                color: isSelected ? "#ffffff" : isHovered ? "#c084fc" : cell.color,
                weight: isSelected ? 2.5 : isHovered ? 1.5 : 0.4,
                fillColor: cell.color,
                fillOpacity: isSelected ? 0.95 : gridOpacity * cell.opacity,
              }}
              eventHandlers={{
                mouseover: () => setHoveredCell(cell),
                mouseout: () => setHoveredCell(null),
                click: () => onCellSelect(cell),
              }}
            >
              <Tooltip sticky direction="top" className="rainfall-cell-tooltip">
                <div className="tooltip-content">
                  <div className="tooltip-header">
                    <strong>🔮 Predicted: {cell.rainfall_mm.toFixed(1)} mm</strong>
                    <span style={{ color: cell.color, fontWeight: 700 }}>
                      {cell.alert}
                    </span>
                  </div>
                  <div className="tooltip-coords">
                    {cell.lat.toFixed(2)}°N, {cell.lon.toFixed(2)}°E
                  </div>
                  <div className="tooltip-desc">{cell.level_label}</div>
                </div>
              </Tooltip>
            </Rectangle>
          );
        })}

        {/* ── Peak Predicted Storm Center ───────────────────────────────── */}
        {peakLoc && (
          <CircleMarker
            center={[peakLoc.lat, peakLoc.lon]}
            radius={14}
            pathOptions={{
              color: "#c084fc",
              weight: 3,
              fillColor: "#9333ea",
              fillOpacity: 0.9,
              dashArray: "4, 4",
            }}
          >
            <Popup className="rainfall-station-popup">
              <div className="station-popup-box">
                <div className="station-popup-title">🔮 Predicted Storm Peak</div>
                <div className="station-popup-name">{peakLoc.name}</div>
                <div className="station-popup-val">
                  <strong>{peakLoc.value.toFixed(1)} mm</strong> forecast
                </div>
                <div className="station-popup-coords">
                  {peakLoc.lat.toFixed(3)}°N, {peakLoc.lon.toFixed(3)}°E
                </div>
              </div>
            </Popup>
            <Tooltip direction="bottom">
              🔮 Predicted Peak: {peakLoc.name} ({peakLoc.value.toFixed(1)} mm)
            </Tooltip>
          </CircleMarker>
        )}

        {/* ── Station Markers ──────────────────────────────────────────── */}
        {showStations &&
          stations.map((st) => (
            <CircleMarker
              key={st.name}
              center={[st.lat, st.lon]}
              radius={5}
              pathOptions={{
                color: "#a855f7",
                weight: 1.5,
                fillColor: "#0f172a",
                fillOpacity: 0.85,
              }}
            >
              <Tooltip direction="top" offset={[0, -5]}>
                📍 {st.name}
              </Tooltip>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
