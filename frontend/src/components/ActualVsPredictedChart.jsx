/**
 * ActualVsPredictedChart.jsx — Recharts comparison of Observed Historical Rainfall
 * vs. AI Conv-ML Nowcast vs. Persistence Baseline.
 */

import React from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import "./ActualVsPredictedChart.css";

export default function ActualVsPredictedChart({
  chartData = [],
  currentTimestamp = "",
  startFormattedTime = "",
}) {
  if (!chartData || chartData.length === 0) return null;

  return (
    <div className="actual-vs-pred-chart" aria-label="Actual vs Predicted Time Series Chart">
      <div className="chart-header">
        <div className="chart-title-box">
          <h3 className="chart-title">Observed vs. AI Predicted Rainfall Trajectory</h3>
          <span className="chart-subtitle">
            Comparing Observed ground-truth against AI Spatio-Temporal Nowcast and Persistence Baseline
          </span>
        </div>
        <div className="chart-legend-pills">
          <span className="legend-pill legend-pill--actual">
            <span className="pill-dot pill-dot--actual" />
            <span>Observed Historical</span>
          </span>
          <span className="legend-pill legend-pill--pred">
            <span className="pill-dot pill-dot--pred" />
            <span>AI Nowcast (+1–3h)</span>
          </span>
          <span className="legend-pill legend-pill--baseline">
            <span className="pill-dot pill-dot--baseline" />
            <span>Baseline Benchmark</span>
          </span>
        </div>
      </div>

      <div className="chart-body">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.75} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" mm" />

            <ChartTooltip
              contentStyle={{
                backgroundColor: "#1a1d27",
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: "8px",
                color: "#f1f5f9",
                boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
              }}
              formatter={(val, name) => {
                if (val === null || val === undefined) return ["—", name];
                const labels = {
                  actualPeak: "Observed Peak",
                  predPeak: "AI Nowcast Peak",
                  baselinePeak: "Baseline Benchmark",
                };
                return [`${val.toFixed(1)} mm`, labels[name] || name];
              }}
            />

            {/* Observed Area */}
            <Area
              type="monotone"
              dataKey="actualPeak"
              stroke="#38bdf8"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#actualGrad)"
              name="actualPeak"
              connectNulls
            />

            {/* AI Predicted Area */}
            <Area
              type="monotone"
              dataKey="predPeak"
              stroke="#a855f7"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#predGrad)"
              name="predPeak"
              connectNulls
            />

            {/* Baseline Line */}
            <Line
              type="stepAfter"
              dataKey="baselinePeak"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              dot={false}
              name="baselinePeak"
              connectNulls
            />

            {/* Nowcast Start Reference Line */}
            {currentTimestamp && (
              <ReferenceLine
                x={startFormattedTime}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: "Nowcast Trigger (t=0)",
                  position: "insideTopLeft",
                  fill: "#f59e0b",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
