/**
 * AlertsBanner.jsx — Multi-hazard rainfall & flood operational warning banner.
 * Visualizes prototype alert levels (NORMAL, YELLOW, ORANGE, RED),
 * affected area estimates, component hazard alerts, and human-readable trigger reasons.
 */

import React, { useState } from "react";
import "./AlertsBanner.css";

export default function AlertsBanner({ alertData = null, isLoading = false }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!alertData) return null;

  const {
    overall_alert = "NORMAL",
    alert_color = "#22c55e",
    alert_label = "NORMAL (Green / Safe)",
    action_guidance = "",
    disclaimer = "Prototype alert thresholds inspired by operational warning concepts.",
    rainfall_alert = "NORMAL",
    flood_alert = "NORMAL",
    affected_area_km2 = 0,
    high_risk_percentage = 0,
    reasons = [],
  } = alertData;

  const isSevere = overall_alert === "RED" || overall_alert === "ORANGE";

  return (
    <div className={`alerts-banner-card alerts-banner--${overall_alert.toLowerCase()}`} aria-label="Operational Alert Banner">
      {/* ── Main Alert Header Row ────────────────────────────────────────── */}
      <div className="alerts-banner-header">
        <div className="alert-badge-group">
          <span className={`alert-status-badge badge--${overall_alert.toLowerCase()}`}>
            <span className="badge-pulse-dot" />
            <span>{alert_label}</span>
          </span>

          <div className="disclaimer-chip" title={disclaimer}>
            <span className="chip-icon">ℹ️</span>
            <span>{disclaimer}</span>
          </div>
        </div>

        {/* Expand / Collapse Trigger */}
        <button
          className="toggle-reasons-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? "Collapse Details" : "View Alert Reasons"}</span>
          <span className="btn-chevron">{isExpanded ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* ── Guidance & Metrics Summary Row ───────────────────────────────── */}
      <div className="alerts-summary-grid">
        <div className="summary-box summary-box--guidance">
          <span className="summary-lbl">Action Guidance</span>
          <span className="summary-guidance-text">
            {action_guidance || "No active warning guidance."}
          </span>
        </div>

        <div className="summary-box">
          <span className="summary-lbl">Rainfall Hazard</span>
          <span className={`summary-tag tag--${rainfall_alert.toLowerCase()}`}>
            {rainfall_alert}
          </span>
        </div>

        <div className="summary-box">
          <span className="summary-lbl">Inundation Hazard</span>
          <span className={`summary-tag tag--${flood_alert.toLowerCase()}`}>
            {flood_alert}
          </span>
        </div>

        <div className="summary-box">
          <span className="summary-lbl">Affected Territory</span>
          <span className="summary-val">
            {affected_area_km2 ? affected_area_km2.toLocaleString() : 0} <span className="unit">km²</span>
          </span>
        </div>

        <div className="summary-box">
          <span className="summary-lbl">High Risk Basin %</span>
          <span className="summary-val">
            {high_risk_percentage}%
          </span>
        </div>
      </div>

      {/* ── Human Readable Trigger Reasons List ─────────────────────────── */}
      {isExpanded && reasons.length > 0 && (
        <div className="alerts-reasons-panel">
          <h4 className="reasons-title">
            <span>📋 Operational Trigger Reasons</span>
            <span className="reasons-count">{reasons.length} Factors Active</span>
          </h4>
          <ul className="reasons-list">
            {reasons.map((reason, idx) => (
              <li key={idx} className="reason-item">
                <span className="reason-bullet">⚡</span>
                <span className="reason-text">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
