/**
 * StatusBadge.jsx
 * Displays a pill-shaped badge reflecting backend connectivity.
 * Green  → backend is reachable and healthy
 * Red    → backend unreachable / returned an error
 * Yellow → request in progress
 */

import "./StatusBadge.css";

export default function StatusBadge({ loading, error, data }) {
  let label = "Checking…";
  let variant = "checking";

  if (!loading) {
    if (error) {
      label = "Backend Offline";
      variant = "error";
    } else if (data?.status === "ok") {
      label = "Backend Connected";
      variant = "ok";
    }
  }

  return (
    <span className={`status-badge status-badge--${variant}`}>
      <span className="status-badge__dot" />
      {label}
    </span>
  );
}
