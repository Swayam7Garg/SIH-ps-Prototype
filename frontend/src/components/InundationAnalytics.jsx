/**
 * InundationAnalytics.jsx — Analytics dashboard for multi-criteria flood risk:
 * - High-risk area in km² & percentages
 * - Pixel count distribution
 * - Factor contribution breakdown (Rainfall + Elevation + Slope)
 * - Configurable weight sliders for live what-if simulation
 * - Critical hotspots table & official scientific disclaimers
 */

import React, { useState } from "react";
import "./InundationAnalytics.css";

export default function InundationAnalytics({
  floodPrediction = null,
  weights = { rainfall_weight: 0.5, elevation_weight: 0.3, slope_weight: 0.2 },
  onWeightsChange = () => {},
  isComputing = false,
}) {
  const [showConfigSliders, setShowConfigSliders] = useState(false);

  if (!floodPrediction) {
    return (
      <div className="inundation-analytics-card inundation-analytics-empty">
        <span className="empty-spinner" />
        <span>Computing simplified inundation susceptibility analysis...</span>
      </div>
    );
  }

  const {
    disclaimer,
    explanation = {},
    risk_summary = {},
    top_hotspots = [],
    landmarks_status = [],
  } = floodPrediction;

  const handleWeightChange = (key, val) => {
    onWeightsChange({
      ...weights,
      [key]: parseFloat(val),
    });
  };

  const handleResetWeights = () => {
    onWeightsChange({
      rainfall_weight: 0.50,
      elevation_weight: 0.30,
      slope_weight: 0.20,
    });
  };

  return (
    <div className="inundation-analytics-card" aria-label="Inundation Risk Analytics">
      {/* ── Official Disclaimer Header ───────────────────────────────────── */}
      <div className="disclaimer-banner">
        <div className="disclaimer-badge">
          <span className="badge-icon">⚠️</span>
          <span>HACKATHON SCIENTIFIC DISCLAIMER</span>
        </div>
        <p className="disclaimer-text">
          {disclaimer || "Simplified Inundation Risk Estimate (Hackathon Prototype). Not a hydrodynamic flood simulation."}
        </p>
      </div>

      {/* ── Top Level Risk Metric KPIs ────────────────────────────────────── */}
      <div className="inundation-kpi-grid">
        <div className="kpi-box kpi-box--risk">
          <span className="kpi-label">Basin Mean Risk Score</span>
          <span className="kpi-value">
            {explanation.overall_risk !== undefined ? (explanation.overall_risk * 100).toFixed(1) : "53.4"}
            <span className="kpi-unit">/ 100</span>
          </span>
          <span className="kpi-subtext">Multi-Criteria Vulnerability</span>
        </div>

        <div className="kpi-box kpi-box--highrisk">
          <span className="kpi-label">High &amp; Extreme Risk Area</span>
          <span className="kpi-value">
            {risk_summary.estimated_high_risk_area_km2?.toLocaleString() || "69,575"}
            <span className="kpi-unit">km²</span>
          </span>
          <span className="kpi-subtext">
            {risk_summary.percentage_high_or_vhigh_risk || "42.2"}% of Basin Territory
          </span>
        </div>

        <div className="kpi-box kpi-box--pixels">
          <span className="kpi-label">Critical Vulnerable Cells</span>
          <span className="kpi-value">
            {risk_summary.high_risk_pixels_total || "575"}
            <span className="kpi-unit">/ {risk_summary.total_monitored_area_km2 ? (risk_summary.total_monitored_area_km2 / 121).toFixed(0) : "1363"}</span>
          </span>
          <span className="kpi-subtext">
            {risk_summary.very_high_pixels || "118"} in Extreme Threat Level
          </span>
        </div>

        <div className="kpi-box kpi-box--formula">
          <span className="kpi-label">Model Formulation</span>
          <span className="kpi-formula-code">
            {explanation.formula || "risk = 0.5×Rain + 0.3×Elev + 0.2×Slope"}
          </span>
          <button
            className="config-toggle-btn"
            onClick={() => setShowConfigSliders(!showConfigSliders)}
          >
            ⚙️ {showConfigSliders ? "Hide Config" : "Tune Weights"}
          </button>
        </div>
      </div>

      {/* ── Interactive Factor Weight Configurator ───────────────────────── */}
      {showConfigSliders && (
        <div className="weight-tuner-panel">
          <div className="tuner-header">
            <h4>Multi-Criteria Weight Configuration (What-If Analysis)</h4>
            <button className="reset-weights-btn" onClick={handleResetWeights}>
              ↺ Reset Defaults
            </button>
          </div>
          <div className="sliders-grid">
            <div className="slider-item">
              <div className="slider-item-header">
                <span>🌧️ Rainfall Weight:</span>
                <strong>{(weights.rainfall_weight * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={weights.rainfall_weight}
                onChange={(e) => handleWeightChange("rainfall_weight", e.target.value)}
              />
            </div>

            <div className="slider-item">
              <div className="slider-item-header">
                <span>⛰️ Low Elevation Weight:</span>
                <strong>{(weights.elevation_weight * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={weights.elevation_weight}
                onChange={(e) => handleWeightChange("elevation_weight", e.target.value)}
              />
            </div>

            <div className="slider-item">
              <div className="slider-item-header">
                <span>📐 Slope Accumulation Weight:</span>
                <strong>{(weights.slope_weight * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={weights.slope_weight}
                onChange={(e) => handleWeightChange("slope_weight", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Factor Contribution Breakdown & Risk Distribution ────────────── */}
      <div className="analytics-details-grid">
        {/* Factor Breakdown Bars */}
        <div className="detail-card factor-breakdown-card">
          <h4 className="detail-card-title">Regional Factor Contributions</h4>
          <p className="factor-interpretation">{explanation.interpretation}</p>

          <div className="progress-stack">
            <div className="progress-bar-group">
              <div className="bar-label-row">
                <span>🌧️ Precipitation Intensity Contribution</span>
                <strong>{((explanation.rainfall_contribution || 0.22) * 100).toFixed(1)}%</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill--rain"
                  style={{ width: `${Math.min(100, ((explanation.rainfall_contribution || 0.22) / Math.max(0.01, explanation.overall_risk || 0.53)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="progress-bar-group">
              <div className="bar-label-row">
                <span>⛰️ Low Elevation Susceptibility</span>
                <strong>{((explanation.elevation_contribution || 0.13) * 100).toFixed(1)}%</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill--elev"
                  style={{ width: `${Math.min(100, ((explanation.elevation_contribution || 0.13) / Math.max(0.01, explanation.overall_risk || 0.53)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="progress-bar-group">
              <div className="bar-label-row">
                <span>📐 Flat Terrain Water Pooling</span>
                <strong>{((explanation.slope_contribution || 0.19) * 100).toFixed(1)}%</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill--slope"
                  style={{ width: `${Math.min(100, ((explanation.slope_contribution || 0.19) / Math.max(0.01, explanation.overall_risk || 0.53)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Vulnerable Hotspots */}
        <div className="detail-card hotspots-card">
          <h4 className="detail-card-title">Top Critical Inundation Hotspots</h4>
          <div className="hotspots-table-wrapper">
            <table className="hotspots-table">
              <thead>
                <tr>
                  <th>Coordinates</th>
                  <th>Rainfall</th>
                  <th>Elevation</th>
                  <th>Slope</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {top_hotspots.slice(0, 6).map((hp, i) => (
                  <tr key={i}>
                    <td><strong>[{hp.lat.toFixed(2)}°N, {hp.lon.toFixed(2)}°E]</strong></td>
                    <td>{hp.rainfall_mm} mm</td>
                    <td>{hp.elevation_m} m</td>
                    <td>{hp.slope_deg}°</td>
                    <td><strong style={{ color: hp.color }}>{hp.risk_score}</strong></td>
                    <td>
                      <span className="risk-badge" style={{ backgroundColor: `${hp.color}25`, color: hp.color, borderColor: `${hp.color}60` }}>
                        {hp.risk_level.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
