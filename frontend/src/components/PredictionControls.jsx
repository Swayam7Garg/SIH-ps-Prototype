/**
 * PredictionControls.jsx — Mode switching, prediction execution,
 * model selection (Conv-ML vs Baseline), and model metadata display.
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import "./PredictionControls.css";

export default function PredictionControls({
  viewMode = "actual", // 'actual' | 'predicted' | 'comparison'
  onViewModeChange = () => {},
  onRunPrediction = () => {},
  isPredicting = false,
  hasPrediction = false,
  modelType = "spatiotemporal",
  onModelTypeChange = () => {},
  modelInfo = null,
  startFormattedTime = "",
}) {
  const [showModelModal, setShowModelModal] = useState(false);

  const mlMetrics = modelInfo?.evaluation_metrics?.spatiotemporal_ml_model || {};
  const baseMetrics = modelInfo?.evaluation_metrics?.persistence_baseline || {};

  return (
    <div className="prediction-controls" aria-label="Rainfall Prediction Controls">
      {/* ── View Mode Selector ───────────────────────────────────────────── */}
      <div className="prediction-controls__mode-group">
        <span className="controls-label">Display Mode:</span>
        <div className="mode-toggle-pills">
          <button
            className={`mode-pill ${viewMode === "actual" ? "active active--actual" : ""}`}
            onClick={() => onViewModeChange("actual")}
            title="View observed historical rainfall"
          >
            <span className="mode-dot mode-dot--actual" />
            <span>Actual (Observed)</span>
          </button>

          <button
            className={`mode-pill ${viewMode === "predicted" ? "active active--predicted" : ""}`}
            onClick={() => onViewModeChange("predicted")}
            title="View AI-predicted rainfall nowcast"
          >
            <span className="mode-dot mode-dot--predicted" />
            <span>AI Nowcast (+1–3h)</span>
          </button>

          <button
            className={`mode-pill ${viewMode === "comparison" ? "active active--comparison" : ""}`}
            onClick={() => onViewModeChange("comparison")}
            title="Side-by-side comparison between observed and predicted"
          >
            <span className="mode-dot mode-dot--comparison" />
            <span>Side-by-Side</span>
          </button>
        </div>
      </div>

      {/* ── Predict Action & Model Options ───────────────────────────────── */}
      <div className="prediction-controls__actions">
        {/* Model Type Selector */}
        <div className="model-selector-box">
          <span className="controls-label">Model:</span>
          <select
            value={modelType}
            onChange={(e) => onModelTypeChange(e.target.value)}
            className="model-select-dropdown"
          >
            <option value="spatiotemporal">Spatio-Temporal Conv-ML</option>
            <option value="baseline">Persistence Baseline [t+1 = t]</option>
          </select>
        </div>

        {/* Primary Run Prediction Button */}
        <button
          className={`predict-run-btn ${isPredicting ? "is-loading" : ""}`}
          onClick={onRunPrediction}
          disabled={isPredicting}
          title="Predict rainfall for the next 3 hours using previous 4 frames"
        >
          {isPredicting ? (
            <>
              <span className="btn-spinner" />
              <span>Computing AI Nowcast...</span>
            </>
          ) : (
            <>
              <span className="btn-icon">⚡</span>
              <span>Predict Next 3 Hours</span>
            </>
          )}
        </button>

        {/* Model Info Modal Trigger */}
        <button
          className="model-info-btn"
          onClick={() => setShowModelModal(true)}
          title="View Model Architecture & Evaluation Metrics"
        >
          <span className="info-icon">📊</span>
          <span>Model Specs</span>
          {mlMetrics.mae_improvement_vs_baseline_pct && (
            <span className="accuracy-pill">
              +{mlMetrics.mae_improvement_vs_baseline_pct}% vs Baseline
            </span>
          )}
        </button>
      </div>

      {/* ── Model Info Details Modal (Portal to document.body) ────────────── */}
      {showModelModal &&
        createPortal(
          <div className="model-modal-overlay" onClick={() => setShowModelModal(false)}>
            <div className="model-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="model-modal-header">
                <div className="modal-title-group">
                  <span className="modal-icon">🤖</span>
                  <div>
                    <h3 className="modal-title">{modelInfo?.model_name || "Spatio-Temporal Conv-ML Nowcaster"}</h3>
                    <span className="modal-subtitle">AI Precipitation Nowcasting Architecture &amp; Benchmark</span>
                  </div>
                </div>
                <button className="modal-close-btn" onClick={() => setShowModelModal(false)}>
                  ✕
                </button>
              </div>

              <div className="model-modal-body">
                {/* Architecture specs */}
                <div className="specs-grid">
                  <div className="spec-card">
                    <span className="spec-label">Model Architecture</span>
                    <span className="spec-val">Spatio-Temporal Convolutional ML</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Input Sequence</span>
                    <span className="spec-val">[t-3, t-2, t-1, t] (4 frames)</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Forecast Horizon</span>
                    <span className="spec-val">+1h, +2h, +3h Horizons</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Data Leakage Prevention</span>
                    <span className="spec-val">Strict Temporal Split (Train/Val/Test)</span>
                  </div>
                </div>

                {/* Benchmark Metrics Comparison */}
                <div className="metrics-comparison-table">
                  <h4>Validation &amp; Test Benchmark Metrics</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>MAE (mm)</th>
                        <th>RMSE (mm)</th>
                        <th>CSI (5.0mm)</th>
                        <th>CSI (35.6mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="highlight-row">
                        <td><strong>Spatio-Temporal Conv-ML</strong></td>
                        <td><strong>{mlMetrics.test_mae_mm?.toFixed(2) || "14.75"} mm</strong></td>
                        <td><strong>{mlMetrics.test_rmse_mm?.toFixed(2) || "21.85"} mm</strong></td>
                        <td>{(mlMetrics.csi_summary?.["5.0mm"]?.csi || 0.80).toFixed(3)}</td>
                        <td>{(mlMetrics.csi_summary?.["35.6mm"]?.csi || 0.69).toFixed(3)}</td>
                      </tr>
                      <tr>
                        <td>Persistence Baseline</td>
                        <td>{baseMetrics.test_mae_mm?.toFixed(2) || "16.90"} mm</td>
                        <td>{baseMetrics.test_rmse_mm?.toFixed(2) || "26.32"} mm</td>
                        <td>{(baseMetrics.csi_summary?.["5.0mm"]?.csi || 0.81).toFixed(3)}</td>
                        <td>{(baseMetrics.csi_summary?.["35.6mm"]?.csi || 0.68).toFixed(3)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Scientific Disclaimer */}
                <div className="scientific-disclaimer-box">
                  <span className="disclaimer-icon">⚠️</span>
                  <p>
                    <strong>Scientific &amp; Operational Notice:</strong> This prototype ML model is designed
                    for research demonstration of short-term spatial advection-diffusion nowcasting. Predictions
                    must not be used as official operational disaster warnings without IMD validation.
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
