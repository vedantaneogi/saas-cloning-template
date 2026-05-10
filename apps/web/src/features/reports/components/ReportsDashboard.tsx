"use client";

import { useState } from "react";

interface ReportsDashboardProps {
  dashboardId: string;
  activeType: string;
}

const TIME_PERIODS = [
  "Last 30 Days",
  "Last 7 Days",
  "Last 90 Days",
  "Last 12 Months",
  "Custom Range",
];

const DASHBOARD_LABELS: Record<string, string> = {
  "my-dashboard": "My dashboard",
  "administrator-dashboard": "Administrator dashboard",
};

const font = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const textPrimary = "rgba(19, 0, 50, 0.9)";
const textSecondary = "rgba(19, 0, 50, 0.6)";
const border = "rgba(19, 0, 50, 0.1)";
const activeAccent = "#4C00FF";

// Info icon (circled i)
function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={textSecondary}
      width="18"
      height="18"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  );
}

function TimePeriodDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <label
        style={{
          fontSize: "13px",
          color: textSecondary,
          fontFamily: font,
          whiteSpace: "nowrap",
        }}
      >
        Time Period
      </label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            fontFamily: font,
            fontSize: "13px",
            color: textPrimary,
            background: "#fff",
            border: `1px solid ${border}`,
            borderRadius: "3px",
            padding: "5px 28px 5px 10px",
            appearance: "none",
            WebkitAppearance: "none",
            cursor: "pointer",
            outline: "none",
            minWidth: "140px",
          }}
        >
          {TIME_PERIODS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {/* dropdown caret */}
        <svg
          viewBox="0 0 24 24"
          fill={textSecondary}
          width="14"
          height="14"
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: "8px",
      }}
    >
      <p
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: textPrimary,
          fontFamily: font,
          margin: 0,
        }}
      >
        No results.
      </p>
      <p
        style={{
          fontSize: "13px",
          color: textSecondary,
          fontFamily: font,
          margin: 0,
          textAlign: "center",
        }}
      >
        There are no matching results. Try adjusting your filters.
      </p>
      <button
        onClick={onReset}
        style={{
          marginTop: "12px",
          padding: "7px 18px",
          background: "transparent",
          border: `1px solid ${border}`,
          borderRadius: "3px",
          fontSize: "13px",
          fontFamily: font,
          color: textPrimary,
          cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = activeAccent;
          (e.currentTarget as HTMLButtonElement).style.color = activeAccent;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = border;
          (e.currentTarget as HTMLButtonElement).style.color = textPrimary;
        }}
      >
        Reset Filters
      </button>
    </div>
  );
}

interface ChartSectionProps {
  title: string;
  timePeriod: string;
  onTimePeriodChange: (v: string) => void;
  onReset: () => void;
}

function ChartSection({ title, timePeriod, onTimePeriodChange, onReset }: ChartSectionProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${border}`,
        borderRadius: "4px",
        marginBottom: "20px",
        overflow: "hidden",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 400,
            color: textPrimary,
            fontFamily: font,
            margin: 0,
          }}
        >
          {title}
        </h2>
        <TimePeriodDropdown value={timePeriod} onChange={onTimePeriodChange} />
      </div>
      {/* Empty state body */}
      <EmptyState onReset={onReset} />
    </div>
  );
}

export function ReportsDashboard({ dashboardId, activeType: _activeType }: ReportsDashboardProps) {
  const [envelopeUsagePeriod, setEnvelopeUsagePeriod] = useState("Last 30 Days");
  const [envelopeSuccessPeriod, setEnvelopeSuccessPeriod] = useState("Last 30 Days");

  const dashboardLabel = DASHBOARD_LABELS[dashboardId] ?? "Dashboard";

  return (
    <main
      style={{
        flex: 1,
        overflowY: "auto",
        background: "#f6f4f9",
        fontFamily: font,
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "28px 32px" }}>
        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 400,
                color: textPrimary,
                fontFamily: font,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {dashboardLabel}
            </h1>
            <button
              title="Dashboard information"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                borderRadius: "50%",
              }}
            >
              <InfoIcon />
            </button>
          </div>

        </div>

        {/* Envelope Usage section */}
        <ChartSection
          title="Envelope Usage"
          timePeriod={envelopeUsagePeriod}
          onTimePeriodChange={setEnvelopeUsagePeriod}
          onReset={() => setEnvelopeUsagePeriod("Last 30 Days")}
        />

        {/* Envelope Success section */}
        <ChartSection
          title="Envelope Success"
          timePeriod={envelopeSuccessPeriod}
          onTimePeriodChange={setEnvelopeSuccessPeriod}
          onReset={() => setEnvelopeSuccessPeriod("Last 30 Days")}
        />
      </div>
    </main>
  );
}
