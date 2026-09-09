/**
 * useHealth.js — React hook that polls GET /api/health once on mount
 * and exposes { status, loading, error } to any component that needs it.
 */

import { useState, useEffect } from "react";
import { fetchHealth } from "../services/api";

export function useHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const result = await fetchHealth();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
