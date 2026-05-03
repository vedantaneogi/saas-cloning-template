"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, DotsThree, X, CaretDown, SlidersHorizontal } from "@phosphor-icons/react";
import { getBulkBatches } from "@/features/envelopes/api";
import { EnvelopeSidebar } from "@/features/envelopes/components/EnvelopeSidebar";

// ── Design tokens (matching agreements list page) ─────────────────────────────
const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_COLOR = "#260559";
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
  const [pendingStatus, setPendingStatus] = useState<string>("all");
  const [sharedAccessOpen, setSharedAccessOpen] = useState(false);
  const [kebabOpen, setKebabOpen] = useState<string | null>(null);
  const [dateFilterActive, setDateFilterActive] = useState(true);

  const hasActiveFilters = dateFilterActive || statusFilter !== "all";
  const clearAllFilters = () => { setDateFilterActive(false); setStatusFilter("all"); setPendingStatus("all"); };

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
    <div className="flex flex-1 overflow-hidden min-h-0">
      <Suspense>
        <EnvelopeSidebar />
      </Suspense>
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

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div style={{ padding: "0 0 12px" }}>
          <div
            className="flex items-center"
            style={{
              border: `1px solid ${BORDER_COLOR}`,
              borderRadius: "4px",
              padding: "8px 14px",
              gap: "10px",
              background: "white",
              maxWidth: "480px",
            }}
          >
            <MagnifyingGlass size={16} color={MUTED_TEXT} />
            <input
              type="text"
              placeholder="Search Bulk Send and Folders"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: PRIMARY_TEXT,
                fontFamily: DS_FONT,
                background: "transparent",
                width: "100%",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Filter row (matches Inbox) ───────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-6 py-2 flex-wrap"
        style={{ borderBottom: `1px solid ${BORDER_COLOR}`, background: "white" }}
      >
        {/* Date tag — purple chip with × */}
        {dateFilterActive && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
            style={{
              background: "rgba(38,5,89,0.06)",
              border: `1px solid ${PRIMARY_COLOR}`,
              color: PRIMARY_COLOR,
              borderRadius: "4px",
            }}
          >
            Date: Last 6 Months
            <button
              className="ml-1 transition-opacity hover:opacity-70"
              aria-label="Remove date filter"
              onClick={(e) => { e.stopPropagation(); setDateFilterActive(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: PRIMARY_COLOR, display: "flex" }}
            >
              <X size={11} weight="bold" />
            </button>
          </div>
        )}

        {/* Status dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setStatusDropdownOpen((o) => !o); setPendingStatus(statusFilter); }}
            className="flex items-center gap-1.5 px-3 py-1 text-sm border rounded"
            style={{
              borderColor: statusDropdownOpen || statusFilter !== "all" ? PRIMARY_COLOR : BORDER_COLOR,
              color: statusFilter !== "all" ? PRIMARY_TEXT : SECONDARY_TEXT,
              background: statusDropdownOpen ? "rgba(19,0,50,0.04)" : "white",
              borderRadius: "4px",
              fontFamily: DS_FONT,
              fontWeight: statusFilter !== "all" ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {statusFilter === "all" ? "Status" : statusFilter}
            <CaretDown size={14} weight="regular" />
          </button>
          {statusDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-4 px-5" style={{ borderColor: BORDER_COLOR, minWidth: "240px", borderRadius: "8px" }}>
                <p style={{ fontSize: "16px", fontWeight: 600, color: PRIMARY_TEXT, margin: "0 0 2px", fontFamily: DS_FONT }}>Status</p>
                <p style={{ fontSize: "12px", color: SECONDARY_TEXT, margin: "0 0 14px", fontFamily: DS_FONT }}>Batch Status Filter</p>
                {["all", "Processed", "Processing", "Partial"].map((opt) => (
                  <label key={opt} className="flex items-center gap-3 py-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="batch-status-filter"
                      checked={pendingStatus === opt}
                      onChange={() => setPendingStatus(opt)}
                      style={{ accentColor: PRIMARY_COLOR, width: "16px", height: "16px" }}
                    />
                    <span style={{ fontSize: "14px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}>
                      {opt === "all" ? "All Statuses" : opt}
                    </span>
                  </label>
                ))}
                <div className="flex justify-end gap-3 mt-4 pt-3" style={{ borderTop: `1px solid ${BORDER_COLOR}` }}>
                  <button
                    onClick={() => { setPendingStatus("all"); setStatusFilter("all"); setStatusDropdownOpen(false); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: PRIMARY_COLOR, fontSize: "13px", fontWeight: 500, fontFamily: DS_FONT }}
                  >Cancel</button>
                  <button
                    onClick={() => { setStatusFilter(pendingStatus); setStatusDropdownOpen(false); }}
                    style={{ background: PRIMARY_COLOR, color: "white", border: "none", borderRadius: "4px", padding: "6px 18px", cursor: "pointer", fontSize: "13px", fontWeight: 500, fontFamily: DS_FONT }}
                  >Apply</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Advanced search dropdown */}
        <button
          className="flex items-center gap-1.5 px-3 py-1 text-sm border rounded"
          style={{
            borderColor: BORDER_COLOR,
            color: SECONDARY_TEXT,
            background: "white",
            borderRadius: "4px",
            fontFamily: DS_FONT,
            fontWeight: 400,
            cursor: "pointer",
          }}
        >
          Advanced search
          <CaretDown size={14} weight="regular" />
        </button>

        {/* Clear All */}
        {hasActiveFilters && (
          <button
            className="text-sm transition-colors px-2 py-1"
            style={{ color: PRIMARY_COLOR, fontWeight: 500, background: "none", border: "none", cursor: "pointer", fontFamily: DS_FONT }}
            onClick={clearAllFilters}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Clear All
          </button>
        )}

        <div className="flex-1" />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto" style={{ background: "white" }}>
        <table className="w-full text-sm">
          <thead
            className="sticky top-0 z-10"
            style={{
              background: "white",
              borderBottom: `1px solid ${BORDER_COLOR}`,
            }}
          >
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" disabled style={{ width: "16px", height: "16px", accentColor: PRIMARY_COLOR }} />
              </th>
              {["BATCH NAME", "BATCH STATUS", "PROGRESS", "SUBMITTED"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: MUTED_TEXT,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: DS_FONT,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
              <th className="px-4 py-3 w-28">
                <div className="flex items-center justify-end">
                  <button
                    title="Customize columns"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: MUTED_TEXT, display: "flex", alignItems: "center" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = PRIMARY_TEXT)}
                    onMouseOut={(e) => (e.currentTarget.style.color = MUTED_TEXT)}
                  >
                    <SlidersHorizontal size={16} weight="regular" />
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
        {isLoading ? (
          <tr>
            <td colSpan={6}>
              <div
                className="flex items-center justify-center"
                style={{ padding: "80px 24px", color: MUTED_TEXT, fontSize: "14px", fontFamily: DS_FONT }}
              >
                Loading...
              </div>
            </td>
          </tr>
        ) : filtered.length === 0 ? (
          <tr>
            <td colSpan={6}>
              <div
                className="flex items-center justify-center"
                style={{ padding: "80px 24px", gap: "40px" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://docucdn-a.akamaihd.net/olive/images/2.110.0/empty-state/emptyStateBulkSend.svg"
                  alt="No bulk sends"
                  style={{ width: "200px", height: "auto", flexShrink: 0 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <p style={{ fontSize: "18px", fontWeight: 600, color: PRIMARY_TEXT, fontFamily: DS_FONT, margin: 0 }}>
                    No bulk sends yet
                  </p>
                  <p style={{ fontSize: "14px", color: MUTED_TEXT, fontFamily: DS_FONT, margin: 0, maxWidth: "320px" }}>
                    Batch sends will appear here once you send to multiple recipients.
                  </p>
                </div>
              </div>
            </td>
          </tr>
        ) : (
          <>
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
                  {/* Checkbox */}
                  <td className="px-4 py-3 w-10">
                    <input type="checkbox" style={{ width: "16px", height: "16px", accentColor: PRIMARY_COLOR }} />
                  </td>
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
          </>
        )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
