/**
 * RainfallMap.jsx — Reusable interactive Leaflet map component for gridded rainfall visualization.
 *
 * Keeps map rendering completely separate from data-fetching logic.
 * Renders spatial cells with exact coordinates, dynamic IMD color coding,
 * interactive hover tooltips, click popups, and basemap layers.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import "./RainfallMap.css";

// ── Tile Layer Configurations ───────────────────────────────────────────────
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

// ── Helper Component to smoothly re-center map when bounds change ──────────
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

export default function RainfallMap({
  mapData = null,
  stations = [],
  filterLevel = null,
  selectedCell = null,
  onCellSelect = () => {},
  loading = false,
  customHeight = "560px",
}) {
  const [basemap, setBasemap] = useState("dark");
  const [showStations, setShowStations] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.85);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [recenterKey, setRecenterKey] = useState(0);

  // Default region center: Kerala & Western Ghats [10.5, 76.2]
  const defaultCenter = useMemo(() => {
    if (mapData?.center && mapData.center.length === 2) {
      return mapData.center;
    }
    return [10.35, 76.25];
  }, [mapData]);

  const defaultBounds = useMemo(() => {
    if (mapData?.bounds && mapData.bounds.length === 2) {
      return mapData.bounds;
    }
    return [
      [8.15, 74.75],
      [12.85, 77.65],
    ];
  }, [mapData]);

  // Filter cells if an IMD intensity category is selected in the legend
  const visibleCells = useMemo(() => {
    if (!mapData?.cells) return [];
    if (!filterLevel) return mapData.cells;
    return mapData.cells.filter((c) => c.level === filterLevel);
  }, [mapData, filterLevel]);

  const stats = mapData?.stats || {};
  const peakLoc = stats.peak_location;

  return (
    <div className="rainfall-map-wrapper" style={{ height: customHeight }}>
      {/* ── Floating Controls Bar ────────────────────────────────────────── */}
      <div className="rainfall-map__controls-bar">
        {/* Basemap Toggle */}
        <div className="map-control-group">
          <span className="map-control-label">Basemap:</span>
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

        {/* Stations Overlay Toggle */}
        <div className="map-control-group">
          <button
            className={`map-toggle-btn ${showStations ? "active" : ""}`}
            onClick={() => setShowStations((v) => !v)}
            title="Toggle Rain Gauge / Weather Stations"
          >
            <span className="map-toggle-icon">📍</span>
            <span>Stations ({stations.length})</span>
          </button>
        </div>

        {/* Opacity Slider */}
        <div className="map-control-group opacity-control">
          <span className="map-control-label">Opacity: {Math.round(gridOpacity * 100)}%</span>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={gridOpacity}
            onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
            className="map-opacity-slider"
            title="Adjust Rainfall Grid Layer Opacity"
          />
        </div>

        {/* Reset View Button */}
        <button
          className="map-action-btn"
          onClick={() => setRecenterKey((k) => k + 1)}
          title="Fit to Kerala & Western Ghats Region"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
          </svg>
          <span>Fit Region</span>
        </button>
      </div>

      {/* ── Active Cell Inspector Floating Card ─────────────────────────── */}
      {(hoveredCell || selectedCell) && (
        <div className="rainfall-map__inspector-card">
          <div className="inspector-card__header">
            <span className="inspector-card__icon">🌧️</span>
            <div className="inspector-card__title-box">
              <div className="inspector-card__title">
                {(hoveredCell || selectedCell).rainfall_mm.toFixed(1)} mm
              </div>
              <div className="inspector-card__subtitle">
                {(hoveredCell || selectedCell).level_label}
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
              <span className="metric-label">Grid Box:</span>
              <span className="metric-value">0.1° (~121 km²)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading Overlay ─────────────────────────────────────────────── */}
      {loading && (
        <div className="rainfall-map__loading-overlay">
          <div className="map-spinner" />
          <span>Rendering Spatial Rainfall Grid...</span>
        </div>
      )}

      {/* ── Leaflet Interactive Map Container ───────────────────────────── */}
      <MapContainer
        center={defaultCenter}
        zoom={8}
        minZoom={6}
        maxZoom={14}
        scrollWheelZoom={true}
        className="rainfall-leaflet-container"
      >
        <MapController
          center={defaultCenter}
          bounds={defaultBounds}
          shouldRecenter={recenterKey > 0}
        />

        {/* Selected Basemap TileLayer */}
        <TileLayer
          key={basemap}
          url={TILE_PROVIDERS[basemap].url}
          attribution={TILE_PROVIDERS[basemap].attribution}
          maxZoom={18}
        />

        {/* ── Rainfall Grid Layer (Exact Bounding Rectangles) ───────────── */}
        {visibleCells.map((cell, idx) => {
          const isSelected =
            selectedCell?.lat === cell.lat && selectedCell?.lon === cell.lon;
          const isHovered =
            hoveredCell?.lat === cell.lat && hoveredCell?.lon === cell.lon;

          return (
            <Rectangle
              key={`${cell.lat}-${cell.lon}-${idx}`}
              bounds={cell.bounds}
              pathOptions={{
                color: isSelected ? "#ffffff" : isHovered ? "#38bdf8" : cell.color,
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
                    <strong>{cell.rainfall_mm.toFixed(1)} mm</strong>
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

        {/* ── Peak Storm Center Marker (Pulsing Highlight) ─────────────── */}
        {peakLoc && (
          <CircleMarker
            center={[peakLoc.lat, peakLoc.lon]}
            radius={14}
            pathOptions={{
              color: "#a855f7",
              weight: 3,
              fillColor: "#7e22ce",
              fillOpacity: 0.9,
              dashArray: "4, 4",
            }}
          >
            <Popup className="rainfall-station-popup">
              <div className="station-popup-box">
                <div className="station-popup-title">⚡ Storm Peak Epicenter</div>
                <div className="station-popup-name">{peakLoc.name}</div>
                <div className="station-popup-val">
                  <strong>{peakLoc.value.toFixed(1)} mm</strong> precipitation
                </div>
                <div className="station-popup-coords">
                  {peakLoc.lat.toFixed(3)}°N, {peakLoc.lon.toFixed(3)}°E
                </div>
              </div>
            </Popup>
            <Tooltip direction="bottom" permanent={false}>
              ⚡ Peak: {peakLoc.name} ({peakLoc.value.toFixed(1)} mm)
            </Tooltip>
          </CircleMarker>
        )}

        {/* ── Weather Station & Rain Gauge Markers ─────────────────────── */}
        {showStations &&
          stations.map((st) => (
            <CircleMarker
              key={st.name}
              center={[st.lat, st.lon]}
              radius={6}
              pathOptions={{
                color: "#60a5fa",
                weight: 2,
                fillColor: "#0f172a",
                fillOpacity: 0.9,
              }}
            >
              <Popup className="rainfall-station-popup">
                <div className="station-popup-box">
                  <div className="station-popup-type">IMD / AWS Station</div>
                  <div className="station-popup-name">{st.name}</div>
                  <div className="station-popup-district">District: {st.district}</div>
                  <div className="station-popup-coords">
                    Coordinates: {st.lat.toFixed(2)}°N, {st.lon.toFixed(2)}°E
                  </div>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -6]}>
                📍 {st.name}
              </Tooltip>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
