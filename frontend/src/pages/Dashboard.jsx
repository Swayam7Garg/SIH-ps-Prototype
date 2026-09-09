/**
 * Dashboard.jsx — Master Hackathon Single-Page Dashboard.
 *
 * Story Narrative Pipeline:
 * OBSERVED RAINFALL ↓ AI PREDICTION ↓ PREDICTED RAINFALL ↓ TERRAIN ANALYSIS ↓ INUNDATION RISK ↓ EARLY WARNING
 */

import React, { useMemo, useState } from "react";
import StatusBadge from "../components/StatusBadge";
import UnifiedMap from "../components/UnifiedMap";
import RainfallTimeline from "../components/RainfallTimeline";
import PredictionControls from "../components/PredictionControls";
import ActualVsPredictedChart from "../components/ActualVsPredictedChart";
import CurrentEventPanel from "../components/CurrentEventPanel";
import AlertExplanation from "../components/AlertExplanation";

import { useHealth } from "../hooks/useHealth";
import { useRainfall } from "../hooks/useRainfall";
import { usePrediction } from "../hooks/usePrediction";
import { useFloodRisk } from "../hooks/useFloodRisk";
import { useAlerts } from "../hooks/useAlerts";
import "./Dashboard.css";

const HISTORICAL_EVENTS = [
  { label: "⚡ 30 Jul 2024 04:00 UTC (Wayanad Peak Disaster)", timestamp: "2024-07-30T04:00:00Z" },
  { label: "🌧️ 30 Jul 2024 01:00 UTC (Pre-Disaster Accumulation)", timestamp: "2024-07-30T01:00:00Z" },
  { label: "🌊 29 Jul 2024 12:00 UTC (Monsoon Surge Onset)", timestamp: "2024-07-29T12:00:00Z" },
  { label: "⛅ 31 Jul 2024 00:00 UTC (Post-Peak Subsiding Rain)", timestamp: "2024-07-31T00:00:00Z" },
];

export default function Dashboard() {
  // 1. Backend health & rainfall dataset hooks
  const { data: healthData, loading: healthLoading, error: healthError } = useHealth();
  const {
    loading: rainfallLoading,
    mapLoading,
    timestamps,
    framesSummary,
    currentTimestamp,
    currentIndex,
    mapData,
    stations,
    selectedCell,
    setSelectedCell,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    selectIndex,
    nextFrame,
    prevFrame,
  } = useRainfall();

  // 2. AI Nowcasting hook
  const {
    viewMode,
    setViewMode,
    modelType,
    setModelType,
    modelInfo,
    predictionData,
    currentPredictedFrame,
    isPredicting,
    runPrediction,
  } = usePrediction(currentTimestamp);

  // 3. SRTM DEM & Flood Inundation Susceptibility hook
  const {
    elevationData,
    slopeData,
    floodPrediction,
    isLoadingTerrain,
    isLoadingFlood,
  } = useFloodRisk(currentTimestamp);

  // 4. Operational Multi-Hazard Alert Engine hook
  const { alertData, isLoading: isLoadingAlerts } = useAlerts(currentTimestamp);

  // Formatted date string for current historical timestamp
  const currentSummary = framesSummary[currentIndex] || {};
  const currentFormattedTime = currentSummary.formatted_time || currentTimestamp || "—";

  // Historical Event Selector Change Handler
  const handleEventSelect = (e) => {
    const targetTs = e.target.value;
    const foundIdx = timestamps.indexOf(targetTs);
    if (foundIdx !== -1) {
      selectIndex(foundIdx);
    }
  };

  // Peak metrics extraction from backend outputs
  const observedPeak = mapData?.stats?.max_rainfall || currentSummary.max_rainfall || 0.0;
  const predictedPeak = currentPredictedFrame?.stats?.max_rainfall || (predictionData?.frames?.[0]?.stats?.max_rainfall) || 0.0;
  const peakLocation = mapData?.stats?.peak_location?.name || "";

  // Combined chart data for Actual vs Predicted vs Baseline
  const chartData = useMemo(() => {
    const baseList = framesSummary.map((f, idx) => {
      let timeLabel = f.timestamp;
      try {
        const d = new Date(f.timestamp);
        timeLabel = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d
          .getHours()
          .toString()
          .padStart(2, "0")}:00`;
      } catch {
        timeLabel = f.timestamp.slice(5, 13);
      }

      return {
        timestamp: f.timestamp,
        timeLabel,
        actualPeak: f.max_rainfall,
        actualMean: f.mean_rainfall,
        predPeak: null,
        baselinePeak: null,
        isTrigger: idx === currentIndex,
      };
    });

    if (predictionData?.frames?.length && baseList[currentIndex]) {
      const triggerVal = framesSummary[currentIndex]?.max_rainfall || 0;
      baseList[currentIndex].predPeak = triggerVal;
      baseList[currentIndex].baselinePeak = triggerVal;

      predictionData.frames.forEach((pFrame) => {
        let pLabel = pFrame.timestamp;
        try {
          const d = new Date(pFrame.timestamp);
          pLabel = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d
            .getHours()
            .toString()
            .padStart(2, "0")}:00`;
        } catch {
          pLabel = pFrame.timestamp.slice(5, 13);
        }

        const existing = baseList.find((b) => b.timeLabel === pLabel);
        if (existing) {
          existing.predPeak = pFrame.stats?.max_rainfall;
          existing.baselinePeak = triggerVal;
        } else {
          baseList.push({
            timestamp: pFrame.timestamp,
            timeLabel: pLabel,
            actualPeak: null,
            actualMean: null,
            predPeak: pFrame.stats?.max_rainfall,
            baselinePeak: triggerVal,
            isTrigger: false,
          });
        }
      });
    }

    return baseList;
  }, [framesSummary, currentIndex, predictionData]);

  return (
    <div className="dashboard">
      {/* ── 1. TOP HEADER & STORY PIPELINE ───────────────────────────────── */}
      <header className="dashboard__header">
        <div className="dashboard__header-inner">
          <div className="dashboard__brand">
            <svg
              className="dashboard__icon"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M32 4 C32 4 8 32 8 44 a24 24 0 0 0 48 0 C56 32 32 4 32 4Z"
                fill="url(#drop)"
              />
              <defs>
                <linearGradient id="drop" x1="32" y1="4" x2="32" y2="68" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </svg>
            <div className="dashboard__brand-titles">
              <span className="dashboard__brand-text">FloodSense AI</span>
              <span className="dashboard__brand-tag">GPM IMERG · SRTM DEM · AI Nowcasting</span>
            </div>
          </div>

          <div className="dashboard__header-actions">
            <StatusBadge loading={healthLoading} error={healthError} data={healthData} />
          </div>
        </div>

        <h1 className="dashboard__title">
          AI/ML-Based Heavy Rainfall Early Warning &amp; Inundation Prediction System
        </h1>

        {/* Story Flow Breadcrumb Bar */}
        <div className="story-pipeline-bar">
          <div className="pipeline-step">
            <span className="step-num">1</span>
            <span className="step-icon">🛰️</span>
            <span className="step-text">OBSERVED RAINFALL</span>
          </div>
          <span className="pipeline-arrow">↓</span>

          <div className="pipeline-step">
            <span className="step-num">2</span>
            <span className="step-icon">🤖</span>
            <span className="step-text">AI PREDICTION</span>
          </div>
          <span className="pipeline-arrow">↓</span>

          <div className="pipeline-step">
            <span className="step-num">3</span>
            <span className="step-icon">⚡</span>
            <span className="step-text">PREDICTED RAINFALL</span>
          </div>
          <span className="pipeline-arrow">↓</span>

          <div className="pipeline-step">
            <span className="step-num">4</span>
            <span className="step-icon">⛰️</span>
            <span className="step-text">TERRAIN ANALYSIS</span>
          </div>
          <span className="pipeline-arrow">↓</span>

          <div className="pipeline-step">
            <span className="step-num">5</span>
            <span className="step-icon">🌊</span>
            <span className="step-text">INUNDATION RISK</span>
          </div>
          <span className="pipeline-arrow">↓</span>

          <div className="pipeline-step pipeline-step--highlight">
            <span className="step-num">6</span>
            <span className="step-icon">🚨</span>
            <span className="step-text">EARLY WARNING</span>
          </div>
        </div>
      </header>

      {/* ── 2. CONTROL BAR (Historical Selector, Timeline & Predict Button) ─ */}
      <section className="dashboard__controls-section">
        <div className="event-selector-box">
          <span className="control-lbl">Historical Event Selector:</span>
          <select
            value={currentTimestamp || ""}
            onChange={handleEventSelect}
            className="event-select-dropdown"
          >
            {HISTORICAL_EVENTS.map((ev, i) => (
              <option key={i} value={ev.timestamp}>
                {ev.label}
              </option>
            ))}
          </select>
        </div>

        <PredictionControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRunPrediction={() => runPrediction(currentTimestamp, 3, modelType)}
          isPredicting={isPredicting}
          hasPrediction={Boolean(predictionData?.frames?.length)}
          modelType={modelType}
          onModelTypeChange={setModelType}
          modelInfo={modelInfo}
          startFormattedTime={currentFormattedTime}
        />
      </section>

      {/* ── 3. TIMELINE SCRUBBER ─────────────────────────────────────────── */}
      <section className="dashboard__timeline-section">
        <RainfallTimeline
          timestamps={timestamps}
          framesSummary={framesSummary}
          currentIndex={currentIndex}
          currentTimestamp={currentTimestamp}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onSelectIndex={selectIndex}
          onTogglePlay={togglePlay}
          onNext={nextFrame}
          onPrev={prevFrame}
          onSpeedChange={setPlaybackSpeed}
        />
      </section>

      {/* ── 4. MAIN VISUAL GRID (Leaflet Map + Right CURRENT EVENT Panel) ──── */}
      <section className="dashboard__main-grid">
        <div className="map-column">
          <UnifiedMap
            rainfallData={mapData}
            predictionFrame={currentPredictedFrame || predictionData?.frames?.[0]}
            elevationData={elevationData}
            slopeData={slopeData}
            floodPrediction={floodPrediction}
            alertData={alertData}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
            loading={rainfallLoading || mapLoading || isPredicting || isLoadingTerrain}
          />
        </div>

        <div className="panel-column">
          <CurrentEventPanel
            observedRainfall={observedPeak}
            predictedRainfall={predictedPeak}
            floodRiskLabel={floodPrediction?.cells?.[0]?.risk_label || "HIGH"}
            floodRiskScore={floodPrediction?.explanation?.overall_risk || 0.53}
            floodRiskColor={floodPrediction?.cells?.[0]?.color || "#f97316"}
            alertLevel={alertData?.overall_alert || "RED"}
            alertLabel={alertData?.alert_label || "RED (Warning)"}
            alertColor={alertData?.alert_color || "#ef4444"}
            highRiskAreaKm2={alertData?.affected_area_km2 || floodPrediction?.risk_summary?.estimated_high_risk_area_km2 || 69575}
            highRiskPercentage={alertData?.high_risk_percentage || floodPrediction?.risk_summary?.percentage_high_or_vhigh_risk || 42.2}
            formattedTime={currentFormattedTime}
            regionName={mapData?.region_name || "Kerala & Western Ghats"}
            peakLocation={peakLocation}
          />
        </div>
      </section>

      {/* ── 5. BOTTOM GRID (Prediction Chart + WHY THIS ALERT?) ──────────── */}
      <section className="dashboard__bottom-grid">
        <div className="chart-column">
          <ActualVsPredictedChart
            chartData={chartData}
            currentTimestamp={currentTimestamp}
            startFormattedTime={currentFormattedTime}
          />
        </div>

        <div className="why-column">
          <AlertExplanation
            alertLevel={alertData?.alert_level || "RED"}
            factors={alertData?.factors || []}
            reasons={alertData?.reasons || []}
            disclaimer={alertData?.disclaimer || "Risk factor contributions derived from transparent multi-criteria hazard formulation."}
          />
        </div>
      </section>

      {/* ── 6. FOOTER ────────────────────────────────────────────────────── */}
      <footer className="dashboard__footer">
        <p>
          SIH 2024 Hackathon Prototype · AI/ML Heavy Rainfall Early Warning &amp; Inundation System · Team FloodSense · Data: GPM IMERG V07B &amp; SRTM DEM 30m
        </p>
      </footer>
    </div>
  );
}
