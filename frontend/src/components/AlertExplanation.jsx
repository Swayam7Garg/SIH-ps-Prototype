/**
 * AlertExplanation.jsx — Reusable Explainability Component for the Warning System.
 * 
 * Displays transparent Risk Factor Contributions (Rainfall %, Elevation %, Slope %)
 * and human-readable trigger reasons explaining WHY an alert level was generated.
 * 
 * IMPORTANT: Labeled as "Risk Factor Contributions" (not SHAP values).
 */

import React from "react";
import "./AlertExplanation.css";

export default function AlertExplanation({
  alertLevel = "RED",
  factors = [],
  reasons = [],
  disclaimer = "Risk factor contributions derived from transparent multi-criteria hazard formulation.",
}) {
  // Fallback factors if array is empty
  const activeFactors = factors.length > 0 ? factors : [
    { name: "rainfall", label: "Rainfall intensity", contribution: 0.55 },
    { name: "elevation", label: "Low elevation", contribution: 0.25 },
    { name: "slope", label: "Low slope (pooling)", contribution: 0.15 },
    { name: "other", label: "Other / Compound", contribution: 0.05 },
  ];

  // Fallback human-readable reasons if array is empty
  const activeReasons = reasons.length > 0 ? reasons : [
    "Predicted rainfall is high.",
    "The affected region contains low-elevation terrain.",
    "Several pixels have high inundation susceptibility.",
  ];

  const getFactorColor = (name) => {
    switch (name) {
      case "rainfall":
        return "#38bdf8"; // Sky Blue
      case "elevation":
        return "#facc15"; // Yellow
      case "slope":
        return "#34d399"; // Emerald Green
      default:
        return "#c084fc"; // Purple / Compound
    }
  };

  return (
    <div className={`alert-explanation-card alert-explanation--${alertLevel.toLowerCase()}`} aria-label="Alert Explanation">
      {/* ── Explanation Header ───────────────────────────────────────────── */}
      <div className="explanation-header">
        <div className="header-title-box">
          <span className="title-icon">🤔</span>
          <h3 className="explanation-title">
            WHY {alertLevel.toUpperCase()} ALERT?
          </h3>
        </div>
        <div className="explainability-badge" title={disclaimer}>
          <span className="badge-dot" />
          <span>Risk Factor Contributions</span>
        </div>
      </div>

      {/* ── Normalized Risk Factor Contributions Stack ───────────────────── */}
      <div className="factors-stack-section">
        <h4 className="section-label">Factor Contributions</h4>
        <div className="factors-list">
          {activeFactors.map((fact, idx) => {
            const pct = Math.round((fact.contribution || 0) * 100);
            const barColor = getFactorColor(fact.name);

            return (
              <div key={idx} className="factor-row">
                <div className="factor-meta">
                  <span className="factor-name">{fact.label || fact.name}</span>
                  <span className="factor-pct" style={{ color: barColor }}>
                    {pct}%
                  </span>
                </div>
                <div className="factor-track">
                  <div
                    className="factor-bar"
                    style={{
                      width: `${Math.min(100, Math.max(2, pct))}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Human-Readable Trigger Reasons ─────────────────────────────── */}
      <div className="reasons-section">
        <h4 className="section-label">Human-Readable Trigger Reasons</h4>
        <ul className="reasons-list">
          {activeReasons.map((reason, idx) => (
            <li key={idx} className="reason-item">
              <span className="reason-bullet">•</span>
              <span className="reason-text">{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Bottom Scientific Disclaimer ─────────────────────────────────── */}
      <div className="explanation-footer-disclaimer">
        <span>ℹ️ {disclaimer}</span>
      </div>
    </div>
  );
}
