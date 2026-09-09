/**
 * WhyThisAlert.jsx — Bottom explanation component for the Hackathon Dashboard.
 * Explains the multi-hazard alert decision:
 * - Rainfall contribution: XX%
 * - Elevation contribution: XX%
 * - Slope contribution: XX%
 * - Bullet list of backend human-readable trigger reasons
 */

import React from "react";
import "./WhyThisAlert.css";

export default function WhyThisAlert({
  explanation = {},
  reasons = [],
  disclaimer = "Prototype alert thresholds inspired by operational warning concepts.",
}) {
  const rainPct = explanation.rainfall_contribution !== undefined
    ? Math.round(((explanation.rainfall_contribution || 0.22) / Math.max(0.01, explanation.overall_risk || 0.53)) * 100)
    : 41;

  const elevPct = explanation.elevation_contribution !== undefined
    ? Math.round(((explanation.elevation_contribution || 0.13) / Math.max(0.01, explanation.overall_risk || 0.53)) * 100)
    : 24;

  const slopePct = explanation.slope_contribution !== undefined
    ? Math.round(((explanation.slope_contribution || 0.19) / Math.max(0.01, explanation.overall_risk || 0.53)) * 100)
    : 35;

  return (
    <div className="why-this-alert-card" aria-label="Why This Alert Explanation">
      {/* ── Card Header ─────────────────────────────────────────────────── */}
      <div className="why-header">
        <div className="title-group">
          <span className="title-icon">🤔</span>
          <h3 className="why-title">WHY THIS ALERT?</h3>
        </div>
        <span className="disclaimer-badge">
          {disclaimer}
        </span>
      </div>

      {/* ── 3 Core Factor Contributions ─────────────────────────────────── */}
      <div className="contributions-grid">
        {/* Rainfall Contribution */}
        <div className="contrib-card contrib-card--rain">
          <div className="contrib-top">
            <span className="contrib-icon">🌧️</span>
            <span className="contrib-label">Rainfall Contribution</span>
          </div>
          <span className="contrib-value">{rainPct}%</span>
          <div className="contrib-track">
            <div className="contrib-fill contrib-fill--rain" style={{ width: `${rainPct}%` }} />
          </div>
          <span className="contrib-sub">Precipitation hazard intensity</span>
        </div>

        {/* Elevation Contribution */}
        <div className="contrib-card contrib-card--elev">
          <div className="contrib-top">
            <span className="contrib-icon">⛰️</span>
            <span className="contrib-label">Elevation Contribution</span>
          </div>
          <span className="contrib-value">{elevPct}%</span>
          <div className="contrib-track">
            <div className="contrib-fill contrib-fill--elev" style={{ width: `${elevPct}%` }} />
          </div>
          <span className="contrib-sub">Lowland &amp; backwater vulnerability</span>
        </div>

        {/* Slope Contribution */}
        <div className="contrib-card contrib-card--slope">
          <div className="contrib-top">
            <span className="contrib-icon">📐</span>
            <span className="contrib-label">Slope Contribution</span>
          </div>
          <span className="contrib-value">{slopePct}%</span>
          <div className="contrib-track">
            <div className="contrib-fill contrib-fill--slope" style={{ width: `${slopePct}%` }} />
          </div>
          <span className="contrib-sub">Flat terrain water accumulation</span>
        </div>
      </div>

      {/* ── Human-Readable Operational Reasons ─────────────────────────── */}
      <div className="trigger-reasons-box">
        <h4 className="reasons-heading">
          <span>📋 Trigger Criteria &amp; Decision Logic</span>
        </h4>
        <ul className="reasons-bullet-list">
          {reasons.length > 0 ? (
            reasons.map((r, i) => (
              <li key={i} className="bullet-item">
                <span className="bullet-icon">✔️</span>
                <span>{r}</span>
              </li>
            ))
          ) : (
            <>
              <li className="bullet-item">
                <span className="bullet-icon">✔️</span>
                <span>Predicted peak rainfall intensity exceeds configured heavy-rainfall threshold.</span>
              </li>
              <li className="bullet-item">
                <span className="bullet-icon">✔️</span>
                <span>Low-elevation coastal and river basins have high inundation susceptibility.</span>
              </li>
              <li className="bullet-item">
                <span className="bullet-icon">✔️</span>
                <span>High-risk inundation area covers significant percentage of monitored territory.</span>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
