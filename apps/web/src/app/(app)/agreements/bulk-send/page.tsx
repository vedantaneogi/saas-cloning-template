"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, DotsThree } from "@phosphor-icons/react";
import { getBulkBatches } from "@/features/envelopes/api";

// ── Design tokens (matching agreements list page) ─────────────────────────────
const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

type BatchRow = {
  batch_id: string;
  name: string;
  total: number;
  sent: number;
  completed: number;
  failed: number;
  status: string;
  submitted: string;
};

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  let bg = "rgba(0,0,0,0.07)";
  let color = SECONDARY_TEXT;

  if (status === "Processed") {
    bg = "rgba(0, 184, 81, 0.12)";
    color = "#00874A";
  } else if (status === "Processing") {
    bg = "rgba(0, 112, 210, 0.12)";
    color = "#0070D2";
  } else if (status === "Partial" || status === "Failed") {
    bg = "rgba(217, 48, 37, 0.10)";
    color = "#D93025";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        background: bg,
        color,
        fontFamily: DS_FONT,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressCell({ batch }: { batch: BatchRow }) {
  const done = batch.sent + batch.completed;
  const pct = batch.total > 0 ? Math.round((done / batch.total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "120px" }}>
      <span
        style={{
          fontSize: "13px",
          color: PRIMARY_TEXT,
          fontFamily: DS_FONT,
        }}
      >
        {done} of {batch.total} sent
      </span>
      <div
        style={{
          height: "4px",
          background: BORDER_COLOR,
          borderRadius: "2px",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: batch.failed > 0 ? "#D93025" : "#4C00FF",
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BulkSendBatchPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [sharedAccessOpen, setSharedAccessOpen] = useState(false);
  const [kebabOpen, setKebabOpen] = useState<string | null>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["bulk-batches"],
    queryFn: getBulkBatches,
  });

  // ── Filter client-side ────────────────────────────────────────────────────
  const filtered = batches.filter((b) => {
    const matchSearch =
      search.trim() === "" ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.batch_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" || b.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const closeAll = () => {
    setStatusDropdownOpen(false);
    setSharedAccessOpen(false);
    setKebabOpen(null);
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-y-auto"
      style={{ background: "#fff", fontFamily: DS_FONT }}
      onClick={closeAll}
    >
      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "20px 24px 0",
          borderBottom: `1px solid ${BORDER_COLOR}`,
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ paddingBottom: "16px" }}
        >
          {/* Left: title */}
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: PRIMARY_TEXT,
              fontFamily: DS_FONT,
              margin: 0,
            }}
          >
            Bulk Send
          </h1>

          {/* Right: Shared Access dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSharedAccessOpen((o) => !o)}
              className="flex items-center gap-2"
              style={{
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: "4px",
                padding: "7px 14px",
                fontSize: "13px",
                fontWeight: 500,
                color: PRIMARY_TEXT,
                background: "white",
                cursor: "pointer",
                fontFamily: DS_FONT,
              }}
            >
              Shared Access
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {sharedAccessOpen && (
              <div
                className="absolute right-0 mt-1 bg-white rounded shadow-lg z-10 py-1"
                style={{ border: `1px solid ${BORDER_COLOR}`, minWidth: "180px", top: "100%" }}
              >
                <button
                  className="w-full text-left hover:bg-gray-50"
                  style={{ padding: "9px 16px", fontSize: "13px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}
                >
                  My Envelopes
                </button>
                <button
                  className="w-full text-left hover:bg-gray-50"
                  style={{ padding: "9px 16px", fontSize: "13px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}
                >
                  Shared With Me
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center flex-wrap"
          style={{ gap: "8px", paddingBottom: "12px" }}
        >
          {/* Search */}
          <div
            className="flex items-center"
            style={{
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: "4px",
              padding: "6px 12px",
              gap: "8px",
              background: "white",
              minWidth: "240px",
            }}
          >
            <MagnifyingGlass size={15} color={MUTED_TEXT} />
            <input
              type="text"
              placeholder="Search by Batch Name or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                border: "none",
                outline: "none",
                fontSize: "13px",
                color: PRIMARY_TEXT,
                fontFamily: DS_FONT,
                background: "transparent",
                width: "100%",
              }}
            />
          </div>

          {/* Status dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setStatusDropdownOpen((o) => !o)}
              className="flex items-center gap-2"
              style={{
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: "4px",
                padding: "7px 12px",
                fontSize: "13px",
                color: statusFilter !== "all" ? "#4C00FF" : PRIMARY_TEXT,
                fontWeight: statusFilter !== "all" ? 600 : 400,
                background: "white",
                cursor: "pointer",
                fontFamily: DS_FONT,
              }}
            >
              {statusFilter === "all" ? "Status" : statusFilter}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {statusDropdownOpen && (
              <div
                className="absolute left-0 mt-1 bg-white rounded shadow-lg z-10 py-1"
                style={{ border: `1px solid ${BORDER_COLOR}`, minWidth: "160px", top: "100%" }}
              >
                {["all", "Processed", "Processing", "Partial"].map((s) => (
                  <button
                    key={s}
                    className="w-full text-left hover:bg-gray-50"
                    style={{
                      padding: "9px 16px",
                      fontSize: "13px",
                      color: statusFilter === s ? "#4C00FF" : PRIMARY_TEXT,
                      fontWeight: statusFilter === s ? 600 : 400,
                      fontFamily: DS_FONT,
                    }}
                    onClick={() => {
                      setStatusFilter(s);
                      setStatusDropdownOpen(false);
                    }}
                  >
                    {s === "all" ? "All Statuses" : s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date chip */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: "4px",
              padding: "6px 12px",
              fontSize: "13px",
              color: SECONDARY_TEXT,
              background: "rgba(19,0,50,0.03)",
              fontFamily: DS_FONT,
              userSelect: "none",
            }}
          >
            Date: Last 6 months
          </span>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {isLoading ? (
          <div
            className="flex items-center justify-center"
            style={{ padding: "80px 24px", color: MUTED_TEXT, fontSize: "14px", fontFamily: DS_FONT }}
          >
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{ padding: "80px 24px", gap: "12px" }}
          >
            <p style={{ fontSize: "16px", color: SECONDARY_TEXT, fontFamily: DS_FONT, margin: 0 }}>
              No bulk sends yet
            </p>
            <p style={{ fontSize: "13px", color: MUTED_TEXT, fontFamily: DS_FONT, margin: 0 }}>
              Batch sends will appear here once you send to multiple recipients.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: DS_FONT,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: `1px solid ${BORDER_COLOR}`,
                  background: "rgba(19,0,50,0.02)",
                }}
              >
                {["BATCH NAME", "BATCH STATUS", "PROGRESS", "SUBMITTED", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left"
                    style={{
                      padding: "10px 16px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: MUTED_TEXT,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      fontFamily: DS_FONT,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((batch) => (
                <tr
                  key={batch.batch_id}
                  style={{
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "rgba(19,0,50,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                  }}
                >
                  {/* Batch Name */}
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: PRIMARY_TEXT,
                        fontFamily: DS_FONT,
                        display: "block",
                        maxWidth: "260px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={batch.name}
                    >
                      {batch.name}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: MUTED_TEXT,
                        fontFamily: DS_FONT,
                        display: "block",
                        marginTop: "2px",
                      }}
                    >
                      {batch.total} recipient{batch.total !== 1 ? "s" : ""}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "14px 16px" }}>
                    <StatusBadge status={batch.status} />
                  </td>

                  {/* Progress */}
                  <td style={{ padding: "14px 16px" }}>
                    <ProgressCell batch={batch} />
                  </td>

                  {/* Submitted */}
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        color: SECONDARY_TEXT,
                        fontFamily: DS_FONT,
                      }}
                    >
                      {formatDate(batch.submitted)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "14px 16px" }}>
                    <div
                      className="flex items-center"
                      style={{ gap: "8px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Summary button */}
                      <button
                        style={{
                          border: `1px solid ${BORDER_COLOR}`,
                          borderRadius: "4px",
                          padding: "5px 14px",
                          fontSize: "13px",
                          color: PRIMARY_TEXT,
                          background: "white",
                          cursor: "pointer",
                          fontFamily: DS_FONT,
                          fontWeight: 400,
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "#4C00FF";
                          (e.currentTarget as HTMLButtonElement).style.color = "#4C00FF";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER_COLOR;
                          (e.currentTarget as HTMLButtonElement).style.color = PRIMARY_TEXT;
                        }}
                      >
                        Summary
                      </button>

                      {/* Kebab */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setKebabOpen((prev) =>
                              prev === batch.batch_id ? null : batch.batch_id,
                            )
                          }
                          style={{
                            border: `1px solid transparent`,
                            borderRadius: "4px",
                            padding: "5px 6px",
                            background: "none",
                            cursor: "pointer",
                            color: SECONDARY_TEXT,
                            display: "flex",
                            alignItems: "center",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER_COLOR;
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(19,0,50,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                            (e.currentTarget as HTMLButtonElement).style.background = "none";
                          }}
                          aria-label="More options"
                        >
                          <DotsThree size={18} weight="bold" />
                        </button>
                        {kebabOpen === batch.batch_id && (
                          <div
                            className="absolute right-0 mt-1 bg-white rounded shadow-lg z-20 py-1"
                            style={{
                              border: `1px solid ${BORDER_COLOR}`,
                              minWidth: "160px",
                              top: "100%",
                            }}
                          >
                            <button
                              className="w-full text-left hover:bg-gray-50"
                              style={{
                                padding: "9px 16px",
                                fontSize: "13px",
                                color: PRIMARY_TEXT,
                                fontFamily: DS_FONT,
                              }}
                            >
                              View Details
                            </button>
                            <button
                              className="w-full text-left hover:bg-gray-50"
                              style={{
                                padding: "9px 16px",
                                fontSize: "13px",
                                color: "#D93025",
                                fontFamily: DS_FONT,
                              }}
                            >
                              Cancel Batch
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
