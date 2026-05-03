"use client";

import CircularProgress from "@mui/material/CircularProgress";
import { useInsertingChart } from "../state/EditorContext";

/**
 * Transient bottom-left pill shown while a chart is being inserted.
 * Matches the Google Slides "Inserting chart…" feedback pattern so the
 * user gets instant visual confirmation even when the canvas re-render
 * lands a beat later.
 */
export function InsertingChartToast() {
  const kind = useInsertingChart();
  if (!kind) return null;
  const label = kind === "pie" ? "Inserting pie chart…" : "Inserting bar chart…";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 1400,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        background: "#202124",
        color: "#fff",
        borderRadius: 20,
        fontSize: 13,
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <CircularProgress size={14} thickness={5} sx={{ color: "#8ab4f8" }} />
      <span>{label}</span>
    </div>
  );
}
