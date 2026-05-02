"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CaretDown } from "@phosphor-icons/react";
import { ReportsSidebar } from "@/features/reports/components/ReportsSidebar";
import { getReportById } from "@/features/reports/reports-data";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";
const PRIMARY_COLOR = "#260559";
const LINK_COLOR = "#4C00FF";

const DATE_RANGES = ["This Month", "Last 7 Days", "Last 30 Days", "Last 90 Days", "Custom Range"];
const DATE_TYPES = ["Sent Date", "Completed Date", "Last Activity Date", "Expiration Date"];

function getToday() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function getMonthStart() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/01/${d.getFullYear()}`;
}

export default function ReportRunPage() {
  const params = useParams();
  const reportId = params.id as string;
  const report = getReportById(reportId);

  const [dateRange, setDateRange] = useState("This Month");
  const [dateType, setDateType] = useState("Sent Date");
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  if (!report) {
    return (
      <div className="flex flex-1 overflow-hidden min-h-0">
        <ReportsSidebar activeView="all" activeType="all" />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: SECONDARY_TEXT, fontFamily: DS_FONT }}>Report not found.</p>
        </main>
      </div>
    );
  }

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 800);
  };

  return (
    <div className="flex flex-1 overflow-hidden min-h-0" style={{ fontFamily: DS_FONT }}>
      <ReportsSidebar activeView="all" activeType={report.category} activeReportId={reportId} />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "white",
          fontFamily: DS_FONT,
        }}
      >
        <div style={{ maxWidth: "1000px", padding: "28px 32px" }}>
          {/* Header */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: 600,
                    color: PRIMARY_TEXT,
                    fontFamily: DS_FONT,
                    margin: "0 0 4px",
                  }}
                >
                  {report.name}
                </h1>
                <p style={{ fontSize: "13px", color: SECONDARY_TEXT, fontFamily: DS_FONT, margin: 0 }}>
                  {report.description}{" "}
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: LINK_COLOR,
                      fontSize: "13px",
                      cursor: "pointer",
                      padding: 0,
                      fontFamily: DS_FONT,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    View Documentation
                  </button>
                </p>
              </div>
              {/* Star + data limits */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, marginLeft: "16px" }}>
                <button
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: MUTED_TEXT }}
                  title="Add to favorites"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </button>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: LINK_COLOR,
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: DS_FONT,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  What are my data limits?
                </button>
              </div>
            </div>

            {/* Filtered by / Time zone */}
            <div style={{ marginTop: "12px", fontSize: "13px", color: SECONDARY_TEXT, fontFamily: DS_FONT }}>
              <span style={{ fontWeight: 600, color: PRIMARY_TEXT }}>Filtered by:</span>{" "}
              Date ({dateRange}), Envelope Date Type ({dateType}), Envelope Status (Any), and Sent By (Any)
            </div>
            <div style={{ marginTop: "4px", fontSize: "13px", color: SECONDARY_TEXT, fontFamily: DS_FONT }}>
              <span style={{ fontWeight: 600, color: PRIMARY_TEXT }}>Time Zone:</span>{" "}
              (UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi
            </div>
          </div>

          {/* Filter row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "12px",
              flexWrap: "wrap",
              padding: "16px 0",
              borderTop: `1px solid ${BORDER_COLOR}`,
            }}
          >
            {/* Date Range */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: MUTED_TEXT, marginBottom: "4px", fontFamily: DS_FONT }}>
                Date Range
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  style={{
                    fontFamily: DS_FONT,
                    fontSize: "13px",
                    color: PRIMARY_TEXT,
                    background: "white",
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: "3px",
                    padding: "7px 28px 7px 10px",
                    appearance: "none",
                    WebkitAppearance: "none",
                    cursor: "pointer",
                    outline: "none",
                    minWidth: "130px",
                  }}
                >
                  {DATE_RANGES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <CaretDown size={14} color={MUTED_TEXT} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* From */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: MUTED_TEXT, marginBottom: "4px", fontFamily: DS_FONT }}>
                From
              </label>
              <input
                type="text"
                defaultValue={getMonthStart()}
                style={{
                  fontFamily: DS_FONT,
                  fontSize: "13px",
                  color: PRIMARY_TEXT,
                  background: "white",
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: "3px",
                  padding: "7px 10px",
                  outline: "none",
                  width: "110px",
                }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY_COLOR)}
                onBlur={(e) => (e.target.style.borderColor = BORDER_COLOR)}
              />
            </div>

            {/* To */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: MUTED_TEXT, marginBottom: "4px", fontFamily: DS_FONT }}>
                To
              </label>
              <input
                type="text"
                defaultValue={getToday()}
                style={{
                  fontFamily: DS_FONT,
                  fontSize: "13px",
                  color: PRIMARY_TEXT,
                  background: "white",
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: "3px",
                  padding: "7px 10px",
                  outline: "none",
                  width: "110px",
                }}
                onFocus={(e) => (e.target.style.borderColor = PRIMARY_COLOR)}
                onBlur={(e) => (e.target.style.borderColor = BORDER_COLOR)}
              />
            </div>

            {/* Envelope Date Type */}
            {report.category === "envelope" && (
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: MUTED_TEXT, marginBottom: "4px", fontFamily: DS_FONT }}>
                  Envelope Date Type
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    value={dateType}
                    onChange={(e) => setDateType(e.target.value)}
                    style={{
                      fontFamily: DS_FONT,
                      fontSize: "13px",
                      color: PRIMARY_TEXT,
                      background: "white",
                      border: `1px solid ${BORDER_COLOR}`,
                      borderRadius: "3px",
                      padding: "7px 28px 7px 10px",
                      appearance: "none",
                      WebkitAppearance: "none",
                      cursor: "pointer",
                      outline: "none",
                      minWidth: "130px",
                    }}
                  >
                    {DATE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <CaretDown size={14} color={MUTED_TEXT} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              </div>
            )}

            {/* Edit Filters */}
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "white",
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: "3px",
                padding: "7px 14px",
                fontSize: "13px",
                color: PRIMARY_TEXT,
                cursor: "pointer",
                fontFamily: DS_FONT,
                fontWeight: 500,
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
              </svg>
              Edit Filters
            </button>

            {/* Edit Columns */}
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "white",
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: "3px",
                padding: "7px 14px",
                fontSize: "13px",
                color: PRIMARY_TEXT,
                cursor: "pointer",
                fontFamily: DS_FONT,
                fontWeight: 500,
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
              Edit Columns
            </button>
          </div>

          {/* Action row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderTop: `1px solid ${BORDER_COLOR}`,
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={handleRun}
                disabled={isRunning}
                style={{
                  background: PRIMARY_COLOR,
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  padding: "9px 22px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: isRunning ? "not-allowed" : "pointer",
                  fontFamily: DS_FONT,
                  opacity: isRunning ? 0.7 : 1,
                }}
                onMouseOver={(e) => { if (!isRunning) (e.currentTarget.style.background = "#3a0878"); }}
                onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
              >
                {isRunning ? "Running..." : "Run report"}
              </button>
              <button
                style={{
                  background: "white",
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: "3px",
                  padding: "8px 18px",
                  fontSize: "14px",
                  color: PRIMARY_TEXT,
                  cursor: "pointer",
                  fontFamily: DS_FONT,
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "white")}
              >
                Save As
              </button>
            </div>

            {/* Icon actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {[
                { title: "Schedule", path: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" },
                { title: "Email", path: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" },
                { title: "Download", path: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" },
              ].map(({ title, path }) => (
                <button
                  key={title}
                  title={title}
                  style={{
                    background: "white",
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: "3px",
                    padding: "7px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: PRIMARY_TEXT,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "white")}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d={path} />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "3px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: DS_FONT }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER_COLOR}`, background: "rgba(19,0,50,0.02)" }}>
                  {(report.columns ?? []).map((col, i) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: MUTED_TEXT,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                        borderRight: i < (report.columns?.length ?? 0) - 1 ? `1px solid ${BORDER_COLOR}` : "none",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {col}
                        {i === 0 && (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ opacity: 0.5 }}>
                            <path d="M7 10l5 5 5-5H7z" />
                          </svg>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={report.columns?.length ?? 1}
                    style={{ padding: "60px 24px", textAlign: "center", color: SECONDARY_TEXT, fontFamily: DS_FONT, fontSize: "14px" }}
                  >
                    {hasRun
                      ? "No results found for the selected filters."
                      : "Click RUN REPORT to view your report data."}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
