/**
 * PredictionTimeline.jsx — Forecast horizon step selector (+1h, +2h, +3h)
 * with predicted peak intensity, IST/UTC forecast times, and validation metrics.
 */

import React from "react";
import "./PredictionTimeline.css";

export default function PredictionTimeline({
  frames = [],
  selectedHorizonIndex = 0,
  onSelectHorizon = () => {},
  startFormattedTime = "",
  modelName = "Spatio-Temporal Conv-ML Nowcaster",
}) {
  if (!frames || frames.length === 0) return null;

  return (
    <div className="prediction-timeline" aria-label="Forecast Horizon Timeline">
      <div className="prediction-timeline__header">
        <div className="timeline-title-box">
          <span className="timeline-pulse-icon">🔮</span>
          <div>
            <h3 className="timeline-title">AI Forecast Horizon Timeline</h3>
            <span className="timeline-subtitle">
              Initialized from: <strong>{startFormattedTime}</strong> · Model: {modelName}
            </span>
          </div>
        </div>
      </div>

      {/* ── Horizon Step Cards Grid ──────────────────────────────────────── */}
      <div className="horizon-cards-grid">
        {frames.map((frame, idx) => {
          const isSelected = idx === selectedHorizonIndex;
          const stats = frame.stats || {};
          const peakVal = stats.max_rainfall?.toFixed(1) || "0.0";
          const peakArea = stats.peak_location?.name || "Western Ghats";
          const evalScore = frame.evaluation_against_actual;

          // Convert forecast timestamp to IST
          let istStr = "";
          try {
            const d = new Date(frame.timestamp);
            istStr = d.toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "short",
              hour12: true,
            }) + " IST";
          } catch {
            istStr = frame.timestamp;
          }

          return (
            <div
              key={frame.horizon_step}
              className={`horizon-card ${isSelected ? "is-selected" : ""}`}
              onClick={() => onSelectHorizon(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectHorizon(idx);
              }}
            >
              <div className="horizon-card__header">
                <span className="horizon-badge">{frame.horizon_label}</span>
                <span className="horizon-time">{istStr}</span>
              </div>

              <div className="horizon-card__body">
                <div className="horizon-metric">
                  <span className="metric-label">Predicted Peak:</span>
                  <span className="metric-val">{peakVal} mm</span>
                </div>
                <div className="horizon-peak-area">
                  <span>📍 {peakArea}</span>
                </div>
              </div>

              {/* Evaluation score against ground truth if available */}
              {evalScore ? (
                <div className="horizon-eval-tag">
                  <span className="eval-icon">✓</span>
                  <span>Validation MAE: {evalScore.mae_mm?.toFixed(1)} mm</span>
                </div>
              ) : (
                <div className="horizon-eval-tag horizon-eval-tag--blind">
                  <span>Forecast Projection</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
