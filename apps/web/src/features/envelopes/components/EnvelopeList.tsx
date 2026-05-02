"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { getEnvelopes } from "../api";
import { StatusBadge } from "./StatusBadge";
import { formatDateWithTime } from "@/lib/utils";
import { SearchInput } from "@/components/ui/SearchInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { useAuthStore } from "@/features/auth/store";
import type { Envelope } from "../types";
import { SlidersHorizontal, X, MagnifyingGlass, DotsSixVertical, CaretUp, CaretDown, CaretUpDown, CaretLeft, CaretRight, Check, ArrowCounterClockwise, Trash, CopySimple, PenNib, DotsThreeOutline } from "@phosphor-icons/react";
import { downloadEnvelope, resendEnvelope, deleteEnvelope, voidEnvelope } from "../api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const CDN_BASE = "https://docucdn-a.akamaihd.net/olive/images/2.110.0";

interface EmptyStateDef {
  svgUrl: string;
  title: string;
  description: string;
  primaryAction?: { label: string; href?: string };
  secondaryAction?: { label: string; href?: string };
}

const EMPTY_STATES: Record<string, EmptyStateDef> = {
  inbox: {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateInbox.svg`,
    title: "Your inbox is empty",
    description: "Documents sent to you for signature will appear here.",
  },
  sent: {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateSent.svg`,
    title: "Agree with confidence",
    description: "Send envelopes to have documents signed securely and quickly.",
    primaryAction: { label: "Send an Envelope" },
  },
  completed: {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateCompleted.svg`,
    title: "Keep business moving",
    description: "Completed envelopes will appear here once all parties have signed.",
    primaryAction: { label: "Track Envelopes" },
  },
  "action-required": {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateActionRequired.svg`,
    title: "You're all caught up",
    description: "Envelopes that need your attention will appear here.",
    primaryAction: { label: "Go to Inbox", href: "/agreements?filter=inbox" },
  },
  draft: {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateDraft.svg`,
    title: "No drafts yet",
    description: "Envelopes you've started but haven't sent will appear here.",
    primaryAction: { label: "Start an Envelope" },
  },
  deleted: {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateDeleted.svg`,
    title: "Nothing here",
    description: "Deleted envelopes will appear here for 30 days.",
  },
  waiting: {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateWaiting.svg`,
    title: "Track your agreements here",
    description: "Envelopes waiting for others to sign will appear here.",
    primaryAction: { label: "Send an Envelope" },
  },
  expiring: {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateExpiringSoon.svg`,
    title: "Renew agreements before they expire",
    description: "Envelopes expiring within 30 days will appear here.",
    primaryAction: { label: "Go to Inbox", href: "/agreements?filter=inbox" },
  },
  "auth-failed": {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateAuthFailed.svg`,
    title: "All clear",
    description: "Envelopes with authentication failures will appear here.",
  },
  "bulk-send": {
    svgUrl: `${CDN_BASE}/empty-state/emptyStateBulkSend.svg`,
    title: "Save time with Bulk Send",
    description: "Send an envelope to hundreds of recipients at once with a single click.",
    primaryAction: { label: "Upgrade" },
    secondaryAction: { label: "Watch how" },
  },
  powerforms: {
    svgUrl: `${CDN_BASE}/empty-state/emptyStatePowerForms.svg`,
    title: "Reach more customers with PowerForms",
    description: "Create self-service, web-based forms that anyone can fill out and sign.",
    primaryAction: { label: "Upgrade" },
    secondaryAction: { label: "Watch how" },
  },
};

const PRIMARY_COLOR = "#260559";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";
const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";

function SortIcon({ active, dir }: { active?: boolean; dir?: "asc" | "desc" }) {
  if (active && dir === "asc") return <CaretUp size={12} weight="bold" />;
  if (active && dir === "desc") return <CaretDown size={12} weight="bold" />;
  return <CaretUpDown size={12} weight="regular" style={{ opacity: 0.35 }} />;
}

export function EnvelopeList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const filter = searchParams.get("filter") ?? "inbox";
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoreOpen, setBulkMoreOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [dateFilterActive, setDateFilterActive] = useState(true);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);
  const [advancedDropdownOpen, setAdvancedDropdownOpen] = useState(false);
  const [sharedAccessOpen, setSharedAccessOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [appliedStatus, setAppliedStatus] = useState<string | null>(null);
  const [pendingSender, setPendingSender] = useState<string | null>(null);
  const [appliedSender, setAppliedSender] = useState<string | null>(null);
  const [pendingAdvanced, setPendingAdvanced] = useState(false);
  const [customizeColumnsOpen, setCustomizeColumnsOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");
  const [columns, setColumns] = useState([
    { id: "name", label: "Name", enabled: false },
    { id: "status", label: "Status", enabled: true },
    { id: "lastChange", label: "Last Change", enabled: true },
  ]);
  const [pendingColumns, setPendingColumns] = useState(columns);
  const [sortKey, setSortKey] = useState<"subject" | "status" | "lastModified">("lastModified");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const perPage = 25;

  const handleEnvelopeSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const closeAllDropdowns = () => {
    setStatusDropdownOpen(false);
    setSenderDropdownOpen(false);
    setAdvancedDropdownOpen(false);
    setSharedAccessOpen(false);
  };

  const clearAllFilters = () => {
    setDateFilterActive(false);
    setAppliedStatus(null);
    setPendingStatus(null);
    setAppliedSender(null);
    setPendingSender(null);
  };

  const hasActiveFilters = dateFilterActive || appliedStatus !== null || appliedSender !== null;

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["envelopes", filter, search, page, appliedStatus, appliedSender],
    queryFn: () => getEnvelopes({
      status: appliedStatus ?? filterToStatus[filter] ?? undefined,
      search,
      page,
      perPage,
      sender: appliedSender ?? undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const envelopes = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const sortedEnvelopes = [...envelopes].sort((a, b) => {
    let av: string, bv: string;
    if (sortKey === "subject") { av = a.subject.toLowerCase(); bv = b.subject.toLowerCase(); }
    else if (sortKey === "status") { av = a.status; bv = b.status; }
    else { av = a.lastModified || ""; bv = b.lastModified || ""; }
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === envelopes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(envelopes.map((e) => e.id)));
    }
  };

  const headingMap: Record<string, string> = {
    inbox: "Inbox",
    sent: "Sent",
    completed: "Completed",
    "action-required": "Action Required",
    draft: "Drafts",
    deleted: "Deleted",
    waiting: "Waiting for Others",
    expiring: "Expiring Soon",
    "auth-failed": "Authentication Failed",
    "bulk-send": "Bulk Send",
    powerforms: "PowerForms",
    voided: "Voided",
  };
  const heading = headingMap[filter] ?? filter;

  const filterToStatus: Record<string, string | undefined> = {
    inbox: "delivered",
    sent: "sent",
    completed: "completed",
    "action-required": "delivered",
    draft: "draft",
    deleted: "voided",
    waiting: "sent",
    expiring: "sent",
    "auth-failed": undefined,
    "bulk-send": undefined,
    powerforms: undefined,
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ fontFamily: DS_FONT }}
    >
      {/* Heading row */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 400,
            color: PRIMARY_TEXT,
            fontFamily: DS_FONT,
            margin: 0,
          }}
        >
          {heading}
        </h1>
        {/* Shared Access dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { closeAllDropdowns(); setSharedAccessOpen(!sharedAccessOpen); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded transition-colors"
            style={{
              borderColor: sharedAccessOpen ? "rgba(19,0,50,0.3)" : BORDER_COLOR,
              color: PRIMARY_TEXT,
              background: sharedAccessOpen ? "rgba(19,0,50,0.03)" : "white",
              fontFamily: DS_FONT,
              borderRadius: "6px",
            }}
          >
            Shared Access
            <CaretDown size={14} weight="regular" />
          </button>
          {sharedAccessOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSharedAccessOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-1"
                style={{ borderColor: BORDER_COLOR, minWidth: "200px", borderRadius: "8px" }}
              >
                <div className="flex items-center gap-2 px-4 py-2">
                  <Check size={16} weight="bold" style={{ color: PRIMARY_COLOR }} />
                  <span style={{ fontSize: "14px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}>
                    {currentUser?.name ?? "Me"}
                  </span>
                </div>
                <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "4px 0" }} />
                <div className="px-4 py-1">
                  <span style={{ fontSize: "11px", fontWeight: 700, color: SECONDARY_TEXT, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Shared Access
                  </span>
                </div>
                <button
                  className="w-full text-left px-4 py-2"
                  style={{ fontSize: "14px", color: PRIMARY_TEXT, background: "none", border: "none", cursor: "pointer", fontFamily: DS_FONT }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                  onClick={() => setSharedAccessOpen(false)}
                >
                  View All
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div
        className="px-6 pb-3"
        style={{ borderBottom: `1px solid ${BORDER_COLOR}` }}
      >
        <SearchInput
          placeholder={`Search ${heading} and Folders`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-lg"
        />
      </div>

      {/* Filter row */}
      <div
        className="flex items-center gap-2 px-6 py-2 flex-wrap"
        style={{ borderBottom: `1px solid ${BORDER_COLOR}`, background: "white" }}
      >
        {/* Date tag — light outlined chip */}
        {dateFilterActive && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
            style={{
              background: "rgba(38,5,89,0.06)",
              border: "1px solid #260559",
              color: "#260559",
              borderRadius: "4px",
            }}
          >
            Date: Last 6 Months
            <button
              className="ml-1 transition-opacity hover:opacity-70"
              aria-label="Remove date filter"
              onClick={(e) => { e.stopPropagation(); setDateFilterActive(false); }}
            >
              <X size={11} weight="bold" />
            </button>
          </div>
        )}

        {/* Status dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { const open = !statusDropdownOpen; closeAllDropdowns(); setStatusDropdownOpen(open); setPendingStatus(appliedStatus); }}
            className="flex items-center gap-1.5 px-3 py-1 text-sm border rounded"
            style={{
              borderColor: statusDropdownOpen || appliedStatus ? PRIMARY_COLOR : BORDER_COLOR,
              color: appliedStatus ? PRIMARY_TEXT : SECONDARY_TEXT,
              background: statusDropdownOpen ? "rgba(19,0,50,0.04)" : "white",
              borderRadius: "4px",
              fontFamily: DS_FONT,
              fontWeight: appliedStatus ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {appliedStatus ?? "Status"}
            <CaretDown size={14} weight="regular" />
          </button>
          {statusDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-4 px-5" style={{ borderColor: BORDER_COLOR, minWidth: "240px", borderRadius: "8px" }}>
                <p style={{ fontSize: "16px", fontWeight: 600, color: PRIMARY_TEXT, margin: "0 0 2px", fontFamily: DS_FONT }}>Status</p>
                <p style={{ fontSize: "12px", color: SECONDARY_TEXT, margin: "0 0 14px", fontFamily: DS_FONT }}>Envelopes Status Filter</p>
                {["Completed", "Declined", "Draft", "In progress", "Voided"].map((opt) => (
                  <label key={opt} className="flex items-center gap-3 py-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status-filter"
                      checked={pendingStatus === opt}
                      onChange={() => setPendingStatus(opt)}
                      style={{ accentColor: PRIMARY_COLOR, width: "16px", height: "16px" }}
                    />
                    <span style={{ fontSize: "14px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}>{opt}</span>
                  </label>
                ))}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setPendingStatus(null); setStatusDropdownOpen(false); }}
                    style={{ flex: 1, padding: "7px", border: `1px solid ${BORDER_COLOR}`, borderRadius: "4px", background: "white", fontSize: "14px", color: PRIMARY_TEXT, cursor: "pointer", fontFamily: DS_FONT }}
                  >Cancel</button>
                  <button
                    onClick={() => { setAppliedStatus(pendingStatus); setPage(1); setStatusDropdownOpen(false); }}
                    style={{ flex: 1, padding: "7px", border: "none", borderRadius: "4px", background: PRIMARY_COLOR, color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: DS_FONT }}
                  >Apply</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sender dropdown — hidden on Sent view (sender is always the current user) */}
        {filter !== "sent" && <div style={{ position: "relative" }}>
          <button
            onClick={() => { const open = !senderDropdownOpen; closeAllDropdowns(); setSenderDropdownOpen(open); setPendingSender(appliedSender); }}
            className="flex items-center gap-1.5 px-3 py-1 text-sm border rounded"
            style={{
              borderColor: senderDropdownOpen || appliedSender ? PRIMARY_COLOR : BORDER_COLOR,
              color: appliedSender ? PRIMARY_TEXT : SECONDARY_TEXT,
              background: senderDropdownOpen ? "rgba(19,0,50,0.04)" : "white",
              borderRadius: "4px",
              fontFamily: DS_FONT,
              fontWeight: appliedSender ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {appliedSender ?? "Sender"}
            <CaretDown size={14} weight="regular" />
          </button>
          {senderDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSenderDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-4 px-5" style={{ borderColor: BORDER_COLOR, minWidth: "240px", borderRadius: "8px" }}>
                <p style={{ fontSize: "16px", fontWeight: 600, color: PRIMARY_TEXT, margin: "0 0 2px", fontFamily: DS_FONT }}>Sender</p>
                <p style={{ fontSize: "12px", color: SECONDARY_TEXT, margin: "0 0 14px", fontFamily: DS_FONT }}>Envelopes Sender Filter</p>
                {["Sent by me", "Sent to me"].map((opt) => (
                  <label key={opt} className="flex items-center gap-3 py-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="sender-filter"
                      checked={pendingSender === opt}
                      onChange={() => setPendingSender(opt)}
                      style={{ accentColor: PRIMARY_COLOR, width: "16px", height: "16px" }}
                    />
                    <span style={{ fontSize: "14px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}>{opt}</span>
                  </label>
                ))}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setPendingSender(null); setSenderDropdownOpen(false); }}
                    style={{ flex: 1, padding: "7px", border: `1px solid ${BORDER_COLOR}`, borderRadius: "4px", background: "white", fontSize: "14px", color: PRIMARY_TEXT, cursor: "pointer", fontFamily: DS_FONT }}
                  >Cancel</button>
                  <button
                    onClick={() => { setAppliedSender(pendingSender); setPage(1); setSenderDropdownOpen(false); }}
                    style={{ flex: 1, padding: "7px", border: "none", borderRadius: "4px", background: PRIMARY_COLOR, color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: DS_FONT }}
                  >Apply</button>
                </div>
              </div>
            </>
          )}
        </div>}

        {/* Advanced search dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { const open = !advancedDropdownOpen; closeAllDropdowns(); setAdvancedDropdownOpen(open); setPendingAdvanced(false); }}
            className="flex items-center gap-1.5 px-3 py-1 text-sm border rounded"
            style={{
              borderColor: advancedDropdownOpen ? PRIMARY_COLOR : BORDER_COLOR,
              color: SECONDARY_TEXT,
              background: advancedDropdownOpen ? "rgba(19,0,50,0.04)" : "white",
              borderRadius: "4px",
              fontFamily: DS_FONT,
              cursor: "pointer",
            }}
          >
            Advanced search
            <CaretDown size={14} weight="regular" />
          </button>
          {advancedDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAdvancedDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-4 px-5" style={{ borderColor: BORDER_COLOR, minWidth: "280px", borderRadius: "8px" }}>
                <p style={{ fontSize: "16px", fontWeight: 600, color: PRIMARY_TEXT, margin: "0 0 2px", fontFamily: DS_FONT }}>Advanced search</p>
                <p style={{ fontSize: "12px", color: SECONDARY_TEXT, margin: "0 0 14px", fontFamily: DS_FONT }}>Envelopes Custom Filter</p>
                <label className="flex items-center gap-3 py-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="advanced-filter"
                    checked={pendingAdvanced}
                    onChange={() => setPendingAdvanced(!pendingAdvanced)}
                    style={{ accentColor: PRIMARY_COLOR, width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "14px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}>Include envelope custom fields</span>
                </label>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setPendingAdvanced(false); setAdvancedDropdownOpen(false); }}
                    style={{ flex: 1, padding: "7px", border: `1px solid ${BORDER_COLOR}`, borderRadius: "4px", background: "white", fontSize: "14px", color: PRIMARY_TEXT, cursor: "pointer", fontFamily: DS_FONT }}
                  >Cancel</button>
                  <button
                    onClick={() => setAdvancedDropdownOpen(false)}
                    style={{ flex: 1, padding: "7px", border: "none", borderRadius: "4px", background: PRIMARY_COLOR, color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: DS_FONT }}
                  >Apply</button>
                </div>
              </div>
            </>
          )}
        </div>

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

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-6 py-2"
          style={{ borderBottom: `1px solid ${BORDER_COLOR}`, background: "white", minHeight: "48px" }}
        >
          <span style={{ fontSize: "14px", fontWeight: 600, color: PRIMARY_TEXT, fontFamily: DS_FONT }}>
            {selectedIds.size} Selected
          </span>

          {/* Resend */}
          <button
            style={{
              padding: "5px 16px",
              fontSize: "14px",
              fontWeight: 600,
              color: PRIMARY_TEXT,
              background: "white",
              border: `1.5px solid ${BORDER_COLOR}`,
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: DS_FONT,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            onClick={async () => {
              for (const envId of Array.from(selectedIds)) {
                try { await resendEnvelope(envId); } catch {}
              }
            }}
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            Resend
          </button>

          {/* Move */}
          <button
            style={{
              padding: "5px 16px",
              fontSize: "14px",
              fontWeight: 600,
              color: PRIMARY_TEXT,
              background: "white",
              border: `1.5px solid ${BORDER_COLOR}`,
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: DS_FONT,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "white")}
          >
            Move
          </button>

          {/* More actions dropdown (⋮) */}
          <div style={{ position: "relative" }}>
            <button
              title="More bulk actions"
              style={{
                padding: "5px 10px",
                fontSize: "14px",
                fontWeight: 600,
                color: PRIMARY_TEXT,
                background: bulkMoreOpen ? "rgba(19,0,50,0.04)" : "white",
                border: `1.5px solid ${BORDER_COLOR}`,
                borderRadius: "4px",
                cursor: "pointer",
                fontFamily: DS_FONT,
                display: "flex",
                alignItems: "center",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
              onMouseOut={(e) => (e.currentTarget.style.background = bulkMoreOpen ? "rgba(19,0,50,0.04)" : "white")}
              onClick={() => setBulkMoreOpen((o) => !o)}
            >
              <DotsThreeOutline size={16} weight="fill" />
            </button>

            {bulkMoreOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setBulkMoreOpen(false)} />
                <div
                  className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-20 py-1"
                  style={{ borderColor: BORDER_COLOR, fontFamily: DS_FONT, minWidth: "200px", borderRadius: "8px" }}
                >
                  {/* Export as CSV */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left"
                    style={{ color: PRIMARY_TEXT, background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={() => setBulkMoreOpen(false)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17l-3-3h2V9h2v5h2l-3 3z"/>
                    </svg>
                    Export as CSV
                  </button>

                  {/* Void */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left"
                    style={{ color: PRIMARY_TEXT, background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={async () => {
                      const reason = window.prompt("Void reason (optional):") ?? "Voided by sender";
                      for (const envId of Array.from(selectedIds)) {
                        try { await voidEnvelope(envId, reason); } catch {}
                      }
                      setSelectedIds(new Set());
                      setBulkMoreOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
                    }}
                  >
                    <X size={14} weight="bold" />
                    Void
                  </button>

                  <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "4px 0" }} />

                  {/* Delete */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left"
                    style={{ color: "#D93025", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF5F5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={async () => {
                      if (!window.confirm(`Delete ${selectedIds.size} envelope(s)?`)) return;
                      for (const envId of Array.from(selectedIds)) {
                        try { await deleteEnvelope(envId); } catch {}
                      }
                      setSelectedIds(new Set());
                      setBulkMoreOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
                    }}
                  >
                    <Trash size={14} weight="bold" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table */}
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
                <Checkbox
                  checked={selectedIds.size === envelopes.length && envelopes.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleEnvelopeSort("subject")}
                  className="flex items-center gap-1"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: sortKey === "subject" ? PRIMARY_COLOR : MUTED_TEXT,
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: DS_FONT,
                  }}
                >
                  Name
                  <SortIcon active={sortKey === "subject"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleEnvelopeSort("status")}
                  className="flex items-center gap-1"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: sortKey === "status" ? PRIMARY_COLOR : MUTED_TEXT,
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: DS_FONT,
                  }}
                >
                  Status
                  <SortIcon active={sortKey === "status"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED_TEXT, fontFamily: DS_FONT }}>
                Sender
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleEnvelopeSort("lastModified")}
                  className="flex items-center gap-1"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: sortKey === "lastModified" ? PRIMARY_COLOR : MUTED_TEXT,
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: DS_FONT,
                  }}
                >
                  Last Change
                  <SortIcon active={sortKey === "lastModified"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 w-28">
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => { setPendingColumns(columns); setColumnSearch(""); setCustomizeColumnsOpen(true); }}
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
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td
                    className="px-4 py-3"
                    colSpan={6}
                  >
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : sortedEnvelopes.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <FilterEmptyState filter={filter} search={search} router={router} />
                </td>
              </tr>
            ) : (
              sortedEnvelopes.map((envelope) => (
                <EnvelopeRow
                  key={envelope.id}
                  envelope={envelope}
                  isSelected={selectedIds.has(envelope.id)}
                  onSelect={() => toggleSelect(envelope.id)}
                  onClick={() => router.push(`/agreements/${envelope.id}`)}
                  currentUserEmail={currentUser?.email}
                  currentUserName={currentUser?.name}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <div
          className="flex items-center justify-between px-6 py-3 bg-white"
          style={{ borderTop: `1px solid ${BORDER_COLOR}` }}
        >
          {/* Left: per-page selector */}
          <div className="flex items-center gap-2">
            <select
              className="text-sm border rounded px-2 py-1 outline-none"
              style={{
                borderColor: BORDER_COLOR,
                color: SECONDARY_TEXT,
                fontFamily: DS_FONT,
              }}
              value={perPage}
              onChange={() => {}}
            >
              <option>25 / Page</option>
            </select>
          </div>

          {/* Right: page indicator + prev/next */}
          <div className="flex items-center gap-1" style={{ color: SECONDARY_TEXT }}>
            <span className="text-sm px-2">
              Page {page}
            </span>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded transition-colors disabled:opacity-40"
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(19,0,50,0.06)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <CaretLeft size={16} weight="regular" />
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="p-1.5 rounded transition-colors disabled:opacity-40"
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(19,0,50,0.06)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <CaretRight size={16} weight="regular" />
            </button>
          </div>
        </div>
      )}

      {/* Customize columns modal */}
      {customizeColumnsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setCustomizeColumnsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl"
            style={{ width: "560px", maxWidth: "90vw", padding: "32px", position: "relative", fontFamily: DS_FONT }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontSize: "22px", fontWeight: 600, color: PRIMARY_TEXT, margin: 0 }}>
                Customize columns
              </h2>
              <button
                onClick={() => setCustomizeColumnsOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: MUTED_TEXT, padding: "4px", display: "flex" }}
                onMouseOver={(e) => (e.currentTarget.style.color = PRIMARY_TEXT)}
                onMouseOut={(e) => (e.currentTarget.style.color = MUTED_TEXT)}
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Search */}
            <div
              className="flex items-center gap-2 mb-4 px-3"
              style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "6px", height: "44px" }}
            >
              <MagnifyingGlass size={16} weight="regular" style={{ color: MUTED_TEXT, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Find columns"
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                style={{ flex: 1, border: "none", outline: "none", fontSize: "15px", color: PRIMARY_TEXT, fontFamily: DS_FONT, background: "transparent" }}
              />
            </div>

            {/* Column list */}
            <div style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "8px", overflow: "hidden" }}>
              {pendingColumns
                .filter((col) => col.label.toLowerCase().includes(columnSearch.toLowerCase()))
                .map((col, i, arr) => (
                  <div
                    key={col.id}
                    className="flex items-center gap-4 px-4"
                    style={{
                      height: "60px",
                      borderBottom: i < arr.length - 1 ? `1px solid ${BORDER_COLOR}` : "none",
                      opacity: col.id === "name" ? 0.45 : 1,
                    }}
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => {
                        if (col.id === "name") return;
                        setPendingColumns((prev) =>
                          prev.map((c) => c.id === col.id ? { ...c, enabled: !c.enabled } : c)
                        );
                      }}
                      style={{ background: "none", border: "none", padding: 0, cursor: col.id === "name" ? "default" : "pointer", flexShrink: 0 }}
                    >
                      <div
                        style={{
                          width: "44px",
                          height: "24px",
                          borderRadius: "9999px",
                          background: col.enabled ? "#260559" : "#D1D5DB",
                          position: "relative",
                          transition: "background 0.15s",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "3px",
                            left: col.enabled ? "23px" : "3px",
                            width: "18px",
                            height: "18px",
                            borderRadius: "9999px",
                            background: "white",
                            transition: "left 0.15s",
                          }}
                        />
                      </div>
                    </button>

                    {/* Label */}
                    <span style={{ flex: 1, fontSize: "15px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}>
                      {col.label}
                    </span>

                    {/* Drag handle */}
                    <DotsSixVertical size={18} weight="bold" style={{ color: MUTED_TEXT, flexShrink: 0 }} />
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setCustomizeColumnsOpen(false)}
                style={{ padding: "10px 24px", borderRadius: "6px", border: `1px solid ${BORDER_COLOR}`, background: "#F5F5F5", color: PRIMARY_TEXT, fontSize: "15px", cursor: "pointer", fontFamily: DS_FONT }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#EBEBEB")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#F5F5F5")}
              >
                Cancel
              </button>
              <button
                onClick={() => { setColumns(pendingColumns); setCustomizeColumnsOpen(false); }}
                style={{ padding: "10px 24px", borderRadius: "6px", border: "none", background: PRIMARY_COLOR, color: "white", fontSize: "15px", fontWeight: 600, cursor: "pointer", fontFamily: DS_FONT }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#3a0878")}
                onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterEmptyState({
  filter,
  search,
  router,
}: {
  filter: string;
  search: string;
  router: ReturnType<typeof useRouter>;
}) {
  const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
  const PRIMARY_COLOR = "#260559";
  const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
  const MUTED_TEXT = "rgba(19, 0, 50, 0.5)";

  if (search) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 gap-3"
        style={{ fontFamily: DS_FONT }}
      >
        <p style={{ fontSize: "16px", fontWeight: 600, color: PRIMARY_TEXT }}>
          No results found
        </p>
        <p style={{ fontSize: "14px", color: MUTED_TEXT }}>
          Try a different search term or adjust your filters
        </p>
      </div>
    );
  }

  const def = EMPTY_STATES[filter] ?? EMPTY_STATES.inbox;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "48px",
        maxWidth: "680px",
        margin: "48px auto",
        padding: "0 32px",
        fontFamily: DS_FONT,
      }}
    >
      <img
        src={def.svgUrl}
        alt=""
        width={200}
        height={200}
        style={{ flexShrink: 0, objectFit: "contain" }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p style={{ fontSize: "18px", fontWeight: 600, color: PRIMARY_TEXT, margin: 0 }}>
          {def.title}
        </p>
        <p style={{ fontSize: "14px", color: MUTED_TEXT, margin: 0, lineHeight: "1.5" }}>
          {def.description}
        </p>
        {(def.primaryAction || def.secondaryAction) && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
            {def.primaryAction && (
              <button
                onClick={() => def.primaryAction?.href ? router.push(def.primaryAction.href) : undefined}
                style={{
                  background: PRIMARY_COLOR,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: DS_FONT,
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#3a0878")}
                onMouseOut={(e) => (e.currentTarget.style.background = PRIMARY_COLOR)}
              >
                {def.primaryAction.label}
              </button>
            )}
            {def.secondaryAction && (
              <button
                style={{
                  background: "transparent",
                  color: PRIMARY_COLOR,
                  border: `1px solid ${PRIMARY_COLOR}`,
                  borderRadius: "4px",
                  padding: "8px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: DS_FONT,
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(38,5,89,0.05)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {def.secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EnvelopeRow({
  envelope,
  isSelected,
  onSelect,
  onClick,
  currentUserEmail,
  currentUserName,
}: {
  envelope: Envelope;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  currentUserEmail?: string;
  currentUserName?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const DS_FONT      = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
  const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
  const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
  const MUTED_TEXT   = "rgba(19, 0, 50, 0.4)";
  const PRIMARY_COLOR = "#260559";
  const BORDER_COLOR  = "rgba(19, 0, 50, 0.1)";

  const fromDisplay = (() => {
    if (!envelope.from && !envelope.fromEmail) return currentUserName ?? "You";
    if (
      envelope.fromEmail &&
      currentUserEmail &&
      envelope.fromEmail.toLowerCase() === currentUserEmail.toLowerCase()
    ) {
      return "You";
    }
    return envelope.from || envelope.fromEmail || currentUserName || "You";
  })();

  // Determine if the current user is a recipient who can sign
  const signingRecipient = (() => {
    if (
      (envelope.status !== "sent" && envelope.status !== "delivered") ||
      !currentUserEmail
    )
      return null;
    return (
      (envelope.recipients ?? []).find(
        (r) =>
          r.email.toLowerCase() === currentUserEmail.toLowerCase() &&
          r.status !== "completed" &&
          r.status !== "declined" &&
          r.signing_token,
      ) ?? null
    );
  })();

  // ── Download mutation ──────────────────────────────────────────────────────
  const downloadMutation = useMutation({
    mutationFn: () => downloadEnvelope(envelope.id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `${envelope.subject}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  // ── Resend mutation ────────────────────────────────────────────────────────
  const resendMutation = useMutation({
    mutationFn: () => resendEnvelope(envelope.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
      setMenuOpen(false);
    },
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteEnvelope(envelope.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
    },
  });

  const pillStyle = {
    borderColor: PRIMARY_COLOR,
    color: PRIMARY_COLOR,
    borderRadius: "20px",
    padding: "4px 10px",
    background: "white",
    fontFamily: DS_FONT,
    fontSize: "12px",
    fontWeight: 600,
    border: `1px solid ${PRIMARY_COLOR}`,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  } as const;

  return (
    <tr
      className="cursor-pointer transition-colors"
      style={{
        background: isSelected ? "rgba(76,0,255,0.04)" : "transparent",
        borderBottom: `1px solid rgba(19,0,50,0.06)`,
      }}
      onClick={onClick}
      onMouseOver={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLTableRowElement).style.background = "#F9F9FB";
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = isSelected
          ? "rgba(76,0,255,0.04)"
          : "transparent";
      }}
    >
      <td
        className="px-4 py-3"
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <Checkbox checked={isSelected} onChange={onSelect} />
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium" style={{ color: PRIMARY_TEXT, fontFamily: DS_FONT }}>
            {envelope.subject}
          </p>
          <p className="text-xs mt-0.5" style={{ color: MUTED_TEXT, fontFamily: DS_FONT }}>
            From: {fromDisplay}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={envelope.status} />
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: SECONDARY_TEXT, fontFamily: DS_FONT }}>
        {fromDisplay}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: MUTED_TEXT, fontFamily: DS_FONT }}>
        {(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = (envelope as any).updated_at || (envelope as any).created_at || envelope.lastModified;
          const { date, time } = formatDateWithTime(raw);
          return <><span>{date}</span><br /><span>{time}</span></>;
        })()}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 justify-end">
          {/* Sign button — visible when current user is a pending recipient */}
          {signingRecipient ? (
            <button
              style={{ ...pillStyle, borderColor: "#4C00FF", color: "#4C00FF" }}
              title="Sign this envelope"
              onClick={() => router.push(`/sign/${signingRecipient.signing_token}`)}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(76,0,255,0.06)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            >
              <PenNib size={12} weight="bold" />
              Sign
            </button>
          ) : (
            /* Download pill button — shown when user is not a pending recipient */
            <button
              style={pillStyle}
              title="Download"
              disabled={downloadMutation.isPending}
              onClick={() => downloadMutation.mutate()}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(38,5,89,0.05)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            >
              {downloadMutation.isPending ? (
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
              )}
              Download
            </button>
          )}

          {/* Three-dot menu */}
          <div style={{ position: "relative" }}>
            <button
              className="p-1.5 rounded transition-colors"
              style={{ color: MUTED_TEXT }}
              title="More options"
              onClick={() => setMenuOpen((o) => !o)}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(19,0,50,0.06)";
                e.currentTarget.style.color = SECONDARY_TEXT;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = MUTED_TEXT;
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-20 py-1"
                  style={{ borderColor: BORDER_COLOR, fontFamily: DS_FONT, minWidth: "160px" }}
                >
                  {/* Download (always) */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                    style={{ color: PRIMARY_TEXT }}
                    disabled={downloadMutation.isPending}
                    onClick={() => { downloadMutation.mutate(); setMenuOpen(false); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                    </svg>
                    Download
                  </button>

                  {/* Copy ID */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                    style={{ color: PRIMARY_TEXT }}
                    onClick={() => {
                      navigator.clipboard.writeText(envelope.id);
                      setMenuOpen(false);
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <CopySimple size={14} weight="bold" />
                    Copy ID
                  </button>

                  {/* Resend (sent/delivered only) */}
                  {(envelope.status === "sent" || envelope.status === "delivered") && (
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                      style={{ color: PRIMARY_TEXT }}
                      disabled={resendMutation.isPending}
                      onClick={() => resendMutation.mutate()}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <ArrowCounterClockwise size={14} weight="bold" />
                      Resend
                    </button>
                  )}

                  {/* View details */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                    style={{ color: PRIMARY_TEXT }}
                    onClick={() => { setMenuOpen(false); onClick(); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                    View Details
                  </button>

                  {/* Delete */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                    style={{ color: "#D93025" }}
                    disabled={deleteMutation.isPending}
                    onClick={() => { deleteMutation.mutate(); setMenuOpen(false); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF5F5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Trash size={14} weight="bold" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
