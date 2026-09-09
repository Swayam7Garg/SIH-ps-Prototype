/**
 * RainfallTimeline.jsx — interactive temporal controls for navigating
 * historical GPM IMERG rainfall time frames, storm progression, and playback.
 */

import React from "react";
import "./RainfallTimeline.css";

export default function RainfallTimeline({
  timestamps = [],
  framesSummary = [],
  currentIndex = 0,
  currentTimestamp = "",
  isPlaying = false,
  playbackSpeed = 1500,
  onSelectIndex = () => {},
  onTogglePlay = () => {},
  onNext = () => {},
  onPrev = () => {},
  onSpeedChange = () => {},
}) {
  if (timestamps.length === 0) return null;

  const currentSummary = framesSummary[currentIndex] || {};

  // Formatted date and time strings
  const parseTime = (ts) => {
    if (!ts) return { utc: "—", ist: "—" };
    try {
      const d = new Date(ts);
      const utcStr = d.toUTCString().replace(" GMT", " UTC");
      // Indian Standard Time is UTC + 5:30
      const istStr = d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return { utc: utcStr, ist: `${istStr} IST` };
    } catch {
      return { utc: ts, ist: ts };
    }
  };

  const { utc, ist } = parseTime(currentTimestamp);

  // Maximum value among all frames for the sparkline normalisation
  const maxAcrossAll = Math.max(...framesSummary.map((f) => f.max_rainfall || 1), 100);

  return (
    <div className="rainfall-timeline" aria-label="Rainfall Timeline Control">
      {/* ── Top Row: Playback Controls & Timestamp display ───────────────── */}
      <div className="rainfall-timeline__header">
        <div className="rainfall-timeline__playback-btns">
          <button
            className="timeline-btn timeline-btn--nav"
            onClick={onPrev}
            title="Previous Frame (Left Arrow)"
            aria-label="Previous Frame"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            className={`timeline-btn timeline-btn--play ${isPlaying ? "is-playing" : ""}`}
            onClick={onTogglePlay}
            title={isPlaying ? "Pause Timeline Animation" : "Play Timeline Animation"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            className="timeline-btn timeline-btn--nav"
            onClick={onNext}
            title="Next Frame (Right Arrow)"
            aria-label="Next Frame"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          {/* Speed Selector */}
          <div className="timeline-speed">
            <button
              className={`timeline-speed__btn ${playbackSpeed === 2000 ? "active" : ""}`}
              onClick={() => onSpeedChange(2000)}
              title="1x Speed"
            >
              1x
            </button>
            <button
              className={`timeline-speed__btn ${playbackSpeed === 1000 ? "active" : ""}`}
              onClick={() => onSpeedChange(1000)}
              title="2x Speed"
            >
              2x
            </button>
            <button
              className={`timeline-speed__btn ${playbackSpeed === 500 ? "active" : ""}`}
              onClick={() => onSpeedChange(500)}
              title="3x Speed"
            >
              3x
            </button>
          </div>
        </div>

        {/* Formatted Timestamps */}
        <div className="rainfall-timeline__timestamp-box">
          <div className="timestamp-box__ist">
            <span className="timestamp-box__badge">IST</span>
            <span className="timestamp-box__text">{ist}</span>
          </div>
          <div className="timestamp-box__utc">
            <span className="timestamp-box__label">UTC:</span>
            <span>{utc}</span>
          </div>
        </div>

        {/* Current Frame Stats Badge */}
        <div className="rainfall-timeline__stat-pill">
          <span className="stat-pill__label">Peak Intensity</span>
          <span className="stat-pill__val">{currentSummary.max_rainfall?.toFixed(1) || "0.0"} mm</span>
          <span className={`stat-pill__alert stat-pill__alert--${(currentSummary.active_alert || "").toLowerCase().includes("red") || (currentSummary.active_alert || "").toLowerCase().includes("purple") ? "high" : "med"}`}>
            {currentSummary.active_alert || "Normal"}
          </span>
        </div>
      </div>

      {/* ── Middle: Interactive Sparkline & Slider Track ─────────────────── */}
      <div className="rainfall-timeline__track-container">
        {/* Visual Bar Graph showing storm peak curve */}
        <div className="timeline-bars" role="region" aria-label="Rainfall curve over time">
          {framesSummary.map((f, idx) => {
            const heightPct = Math.max((f.max_rainfall / maxAcrossAll) * 100, 10);
            const isCurrent = idx === currentIndex;
            const isSevere = (f.max_rainfall || 0) >= 64.5;

            return (
              <div
                key={f.timestamp}
                className={`timeline-bar-col ${isCurrent ? "is-active" : ""}`}
                onClick={() => onSelectIndex(idx)}
                title={`${f.formatted_time}: Peak ${f.max_rainfall} mm (${f.peak_area})`}
              >
                <div
                  className={`timeline-bar ${isSevere ? "timeline-bar--severe" : ""}`}
                  style={{ height: `${heightPct}%` }}
                />
                {isCurrent && <div className="timeline-bar-indicator" />}
              </div>
            );
          })}
        </div>

        {/* Range Slider Scrubber */}
        <input
          type="range"
          min="0"
          max={timestamps.length - 1}
          value={currentIndex}
          onChange={(e) => onSelectIndex(Number(e.target.value))}
          className="timeline-slider"
          aria-label="Timestamp Scrubber"
        />
      </div>

      {/* ── Bottom: Step Ticks with Dates ───────────────────────────────── */}
      <div className="rainfall-timeline__ticks">
        {timestamps.map((ts, idx) => {
          // Show ticks at start, middle, peak, end
          const isKeyTick =
            idx === 0 ||
            idx === timestamps.length - 1 ||
            idx === Math.floor(timestamps.length / 2) ||
            idx === 7;

          const isCurrent = idx === currentIndex;
          let label = "";
          try {
            const d = new Date(ts);
            label = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getHours().toString().padStart(2, "0")}:00`;
          } catch {
            label = ts.slice(5, 13);
          }

          return (
            <button
              key={ts}
              className={`timeline-tick ${isCurrent ? "is-active" : ""} ${
                isKeyTick ? "is-key" : ""
              }`}
              onClick={() => onSelectIndex(idx)}
              title={`Jump to ${ts}`}
            >
              <div className="timeline-tick__dot" />
              {isKeyTick && <span className="timeline-tick__label">{label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
