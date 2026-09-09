/**
 * RainfallLegend.jsx — reusable rainfall intensity legend component.
 * Clearly distinguishes standard IMD (India Meteorological Department)
 * precipitation thresholds, warning levels, and color codings.
 */

import React from "react";
import "./RainfallLegend.css";

const LEGEND_ITEMS = [
  {
    level: "extremely_heavy",
    label: "Extremely Heavy",
    range: "≥ 124.5 mm",
    alert: "Purple Alert",
    color: "#9333ea",
    badge: "Disaster Risk",
  },
  {
    level: "very_heavy",
    label: "Very Heavy",
    range: "64.5 - 124.4 mm",
    alert: "Red Alert",
    color: "#ef4444",
    badge: "Flash Flood Warning",
  },
  {
    level: "heavy",
    label: "Heavy",
    range: "35.6 - 64.4 mm",
    alert: "Orange Alert",
    color: "#f59e0b",
    badge: "High Inundation",
  },
  {
    level: "moderate",
    label: "Moderate",
    range: "7.6 - 35.5 mm",
    alert: "Yellow Watch",
    color: "#3b82f6",
    badge: "Waterlogging",
  },
  {
    level: "light",
    label: "Light",
    range: "0.1 - 7.5 mm",
    alert: "Green",
    color: "#38bdf8",
    badge: "Low Impact",
  },
];

export default function RainfallLegend({
  activeFilter = null,
  onSelectFilter = () => {},
  cellCounts = {},
  totalCells = 0,
}) {
  return (
    <div className="rainfall-legend" aria-label="Rainfall Intensity Legend">
      <div className="rainfall-legend__header">
        <div className="rainfall-legend__title-group">
          <span className="rainfall-legend__icon">🌧️</span>
          <h3 className="rainfall-legend__title">IMD Rainfall Intensity</h3>
        </div>
        {activeFilter && (
          <button
            className="rainfall-legend__clear-btn"
            onClick={() => onSelectFilter(null)}
            title="Reset filter"
          >
            Show All
          </button>
        )}
      </div>

      <div className="rainfall-legend__items">
        {LEGEND_ITEMS.map((item) => {
          const count = cellCounts[item.level] || 0;
          const isSelected = activeFilter === item.level;
          const isDimmed = activeFilter && !isSelected;

          return (
            <div
              key={item.level}
              className={`rainfall-legend__item ${isSelected ? "is-selected" : ""} ${
                isDimmed ? "is-dimmed" : ""
              }`}
              onClick={() => onSelectFilter(isSelected ? null : item.level)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectFilter(isSelected ? null : item.level);
                }
              }}
              title={`Click to filter by ${item.label}`}
            >
              <div
                className="rainfall-legend__swatch"
                style={{ backgroundColor: item.color }}
              />

              <div className="rainfall-legend__info">
                <div className="rainfall-legend__row">
                  <span className="rainfall-legend__label">{item.label}</span>
                  <span className="rainfall-legend__range">{item.range}</span>
                </div>
                <div className="rainfall-legend__meta">
                  <span
                    className="rainfall-legend__alert-badge"
                    style={{
                      borderColor: item.color,
                      color: item.color,
                    }}
                  >
                    {item.alert}
                  </span>
                  {count > 0 && (
                    <span className="rainfall-legend__count">
                      {count} grid cells
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rainfall-legend__footer">
        <span>Standard IMD 24h/Hourly Precipitation Classification</span>
      </div>
    </div>
  );
}
