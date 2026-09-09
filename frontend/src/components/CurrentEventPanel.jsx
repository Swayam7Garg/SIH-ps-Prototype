/**
 * CurrentEventPanel.jsx — Right-side panel for the Hackathon Dashboard.
 * Displays real-time / active historical event status:
 * - Rainfall: XX mm/hr
 * - Predicted: XX mm/hr
 * - Flood Risk: HIGH / VERY HIGH
 * - Alert: RED / ORANGE
 * - Potential High-Risk Area: XX km²
 */

import React from "react";
import "./CurrentEventPanel.css";

export default function CurrentEventPanel({
  observedRainfall = 0,
  predictedRainfall = 0,
  floodRiskLabel = "MODERATE",
  floodRiskScore = 0.5,
  floodRiskColor = "#eab308",
  alertLevel = "YELLOW",
  alertLabel = "YELLOW (Advisory)",
  alertColor = "#eab308",
  highRiskAreaKm2 = 0,
  highRiskPercentage = 0,
  formattedTime = "",
  regionName = "Kerala & Western Ghats",
  peakLocation = "",
}) {
  return (
    <div className="current-event-card" aria-label="Current Event Overview">
      {/* ── Card Header ─────────────────────────────────────────────────── */}
      <div className="current-event-header">
        <div className="header-title-box">
          <span className="live-dot" />
          <h3 className="current-event-title">CURRENT EVENT</h3>
        </div>
        <span className="event-time-tag">{formattedTime || "Active Frame"}</span>
      </div>

      {/* ── Alert Status Banner Pill ────────────────────────────────────── */}
      <div
        className="event-alert-hero"
        style={{
          backgroundColor: `${alertColor}20`,
          borderColor: `${alertColor}60`,
          color: alertColor,
        }}
      >
        <span className="alert-hero-icon">🚨</span>
        <div className="alert-hero-text">
          <span className="hero-alert-level">{alertLevel} ALERT</span>
          <span className="hero-alert-sub">{alertLabel}</span>
        </div>
      </div>

      {/* ── Core Metric Rows ────────────────────────────────────────────── */}
      <div className="event-metrics-list">
        {/* Observed Rainfall */}
        <div className="metric-row">
          <div className="metric-info">
            <span className="metric-icon">🛰️</span>
            <div className="metric-text-group">
              <span className="metric-label">Observed Rain</span>
              <span className="metric-sub">GPM IMERG Peak</span>
            </div>
          </div>
          <span className="metric-value metric-value--observed">
            {observedRainfall ? observedRainfall.toFixed(1) : "0.0"} <span className="unit">mm/hr</span>
          </span>
        </div>

        {/* AI Predicted Rainfall */}
        <div className="metric-row">
          <div className="metric-info">
            <span className="metric-icon">⚡</span>
            <div className="metric-text-group">
              <span className="metric-label">AI Predicted</span>
              <span className="metric-sub">+1–3h ML Nowcast</span>
            </div>
          </div>
          <span className="metric-value metric-value--predicted">
            {predictedRainfall ? predictedRainfall.toFixed(1) : "0.0"} <span className="unit">mm/hr</span>
          </span>
        </div>

        {/* Flood Inundation Risk */}
        <div className="metric-row">
          <div className="metric-info">
            <span className="metric-icon">🌊</span>
            <div className="metric-text-group">
              <span className="metric-label">Flood Risk</span>
              <span className="metric-sub">Terrain Susceptibility</span>
            </div>
          </div>
          <span
            className="metric-badge"
            style={{
              backgroundColor: `${floodRiskColor}25`,
              color: floodRiskColor,
              borderColor: `${floodRiskColor}60`,
            }}
          >
            {floodRiskLabel.toUpperCase()} ({(floodRiskScore * 100).toFixed(0)}%)
          </span>
        </div>

        {/* Potential High Risk Area */}
        <div className="metric-row metric-row--area">
          <div className="metric-info">
            <span className="metric-icon">📐</span>
            <div className="metric-text-group">
              <span className="metric-label">High-Risk Area</span>
              <span className="metric-sub">Vulnerable Territory</span>
            </div>
          </div>
          <div className="metric-area-val-box">
            <span className="area-value">{highRiskAreaKm2 ? highRiskAreaKm2.toLocaleString() : 0} <span className="unit">km²</span></span>
            <span className="area-pct">{highRiskPercentage}% of Basin</span>
          </div>
        </div>
      </div>

      {/* ── Basin Context Footer ────────────────────────────────────────── */}
      <div className="event-panel-footer">
        <span>📍 {regionName}</span>
        {peakLocation && <span>Peak at {peakLocation}</span>}
      </div>
    </div>
  );
}
