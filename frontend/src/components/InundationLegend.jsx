/**
 * InundationLegend.jsx — Multi-mode Dynamic Legend for Terrain, Rainfall & Flood Risk.
 */

import React from "react";
import "./InundationLegend.css";

const RAINFALL_LEGEND = [
  { label: "Light (0.1–7.5 mm)", color: "#38bdf8" },
  { label: "Moderate (7.6–35.5 mm)", color: "#3b82f6" },
  { label: "Heavy (35.6–64.4 mm)", color: "#f59e0b" },
  { label: "Very Heavy (64.5–124.4 mm)", color: "#ef4444" },
  { label: "Extremely Heavy (≥124.5 mm)", color: "#9333ea" },
];

const ELEVATION_LEGEND = [
  { label: "0–15m (Coast / Backwaters)", color: "#15803d" },
  { label: "15–80m (Lowland Plains)", color: "#22c55e" },
  { label: "80–250m (Midland Foothills)", color: "#84cc16" },
  { label: "250–600m (Upland Slopes)", color: "#eab308" },
  { label: "600–1200m (Ghats Plateau)", color: "#f97316" },
  { label: "1200–1900m (Mountain Ridge)", color: "#b45309" },
  { label: ">1900m (Anamudi / Peaks)", color: "#f1f5f9" },
];

const SLOPE_LEGEND = [
  { label: "0°–2° (Flat Basin / High Pooling)", color: "#3b82f6", hazard: "High Accumulation" },
  { label: "2°–6° (Gentle Slope / Slow Runoff)", color: "#22c55e", hazard: "Moderate" },
  { label: "6°–14° (Moderate Incline)", color: "#eab308", hazard: "Low" },
  { label: "14°–25° (Steep Escarpment)", color: "#f97316", hazard: "Very Low" },
  { label: ">25° (Cliff / Flash Drainage)", color: "#ef4444", hazard: "Negligible" },
];

const INUNDATION_LEGEND = [
  { label: "Low Risk (0.00 – 0.30)", color: "#22c55e", desc: "Safe / Good Drainage" },
  { label: "Moderate Risk (0.30 – 0.60)", color: "#eab308", desc: "Advisory / Water Stagnation" },
  { label: "High Risk (0.60 – 0.80)", color: "#f97316", desc: "Warning / Severe Inundation" },
  { label: "Very High Risk (0.80 – 1.00)", color: "#ef4444", desc: "Disaster Alert / Flash Inundation" },
];

export default function InundationLegend({ activeLayer = "rainfall", formula = "" }) {
  let title = "Rainfall Intensity Scale (IMD Standard)";
  let items = RAINFALL_LEGEND;
  let subtitle = "Precipitation in mm / 30-min frame";

  if (activeLayer === "elevation") {
    title = "SRTM Topography & Hypsometric Tinting";
    items = ELEVATION_LEGEND;
    subtitle = "Elevation in meters (WGS84 EPSG:4326)";
  } else if (activeLayer === "slope") {
    title = "Terrain Slope & Water Accumulation Index";
    items = SLOPE_LEGEND;
    subtitle = "Central finite difference slope gradient in degrees (°)";
  } else if (activeLayer === "inundation") {
    title = "Simplified Multi-Criteria Inundation Index";
    items = INUNDATION_LEGEND;
    subtitle = formula || "0.5×Rainfall + 0.3×Elevation + 0.2×Slope";
  }

  return (
    <div className="inundation-legend-card" aria-label="Map Layer Legend">
      <div className="legend-header">
        <span className="legend-title">{title}</span>
        <span className="legend-subtitle">{subtitle}</span>
      </div>

      <div className="legend-items-list">
        {items.map((item, idx) => (
          <div key={idx} className="legend-item">
            <span className="legend-swatch" style={{ background: item.color }} />
            <span className="legend-label">{item.label}</span>
            {item.desc && <span className="legend-extra">{item.desc}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
