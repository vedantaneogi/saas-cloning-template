"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { getEnvelopes, downloadEnvelope, resendEnvelope, deleteEnvelope, voidEnvelope, getFolders, createFolder, moveEnvelopes, correctEnvelope, saveEnvelopeAsTemplate, createEnvelope, type FolderItem } from "../api";
import { formatDateWithTime } from "@/lib/utils";
import { SearchInput } from "@/components/ui/SearchInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { useAuthStore } from "@/features/auth/store";
import type { Envelope } from "../types";
import { SlidersHorizontal, X, MagnifyingGlass, DotsSixVertical, CaretUp, CaretDown, CaretUpDown, CaretLeft, CaretRight, Check, ArrowCounterClockwise, Trash, CopySimple, PenNib, DotsThreeOutline, Folder, Plus, Tray, PaperPlaneRight, WarningCircle } from "@phosphor-icons/react";

// ── Lightweight inline toast system ──────────────────────────────────────────

type ToastKind = "success" | "error" | "info" | "warning";
interface ToastItem { id: number; message: string; kind: ToastKind }
let _toastId = 0;
let _addToast: ((msg: string, kind: ToastKind) => void) | null = null;

function toast(message: string, kind: ToastKind = "info") {
  _addToast?.(message, kind);
}

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const add = useCallback((message: string, kind: ToastKind) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, kind }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, 3500);
    timers.current.set(id, t);
  }, []);

  useEffect(() => {
    _addToast = add;
    return () => { _addToast = null; };
  }, [add]);

  const kindStyle: Record<ToastKind, { bg: string; border: string; icon: string }> = {
    success: { bg: "#F0FDF4", border: "#22C55E", icon: "✓" },
    error:   { bg: "#FEF2F2", border: "#EF4444", icon: "✕" },
    info:    { bg: "#EFF6FF", border: "#3B82F6", icon: "ℹ" },
    warning: { bg: "#FFFBEB", border: "#F59E0B", icon: "⚠" },
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px" }}>
      {toasts.map((t) => {
        const s = kindStyle[t.kind];
        return (
          <div
            key={t.id}
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: "14px",
              color: "#111",
              fontFamily: "'DS Indigo', Helvetica, Arial, sans-serif",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "260px",
              maxWidth: "400px",
            }}
          >
            <span style={{ fontWeight: 700, color: s.border, flexShrink: 0 }}>{s.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── CSV export helper ─────────────────────────────────────────────────────────

function exportEnvelopesAsCSV(envelopes: Envelope[]) {
  const headers = ["Subject", "Status", "Sender", "Recipients", "Created", "Last Modified"];
  const rows = envelopes.map((e) => [
    `"${e.subject.replace(/"/g, '""')}"`,
    e.status,
    `"${(e.from || e.fromEmail || "").replace(/"/g, '""')}"`,
    `"${(e.recipients ?? []).map((r) => r.email).join("; ").replace(/"/g, '""')}"`,
    e.sentAt ? new Date(e.sentAt).toLocaleDateString() : "",
    e.lastModified ? new Date(e.lastModified).toLocaleDateString() : "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `envelopes-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Spinner helper ────────────────────────────────────────────────────────────
function Spinner({ size = 12 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

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
    description: "Envelopes you delete will appear here. You can restore them by moving them back to Inbox or Sent.",
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
    description: "Envelopes with recipient access code authentication will appear here.",
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

// ── Signing progress bar for STATUS column ────────────────────────────────────
function StatusCell({ envelope, currentUserEmail }: { envelope: Envelope; currentUserEmail?: string }) {
  const recipients = envelope.recipients ?? [];
  const status = envelope.status;

  const statusDotColors: Record<string, string> = {
    sent: "#4C00FF",
    delivered: "#4C00FF",
    completed: "#00B851",
    voided: "#D93025",
    declined: "#D93025",
    draft: MUTED_TEXT,
  };

  const statusLabels: Record<string, string> = {
    sent: "Sent",
    delivered: "Delivered",
    completed: "Completed",
    voided: "Voided",
    declined: "Declined",
    draft: "Draft",
  };

  const isSelfSend = currentUserEmail && recipients.some(
    (r) => r.email?.toLowerCase() === currentUserEmail.toLowerCase() && (r.role === "signer" || !r.role)
  );

  if (!isSelfSend || status === "draft") {
    const dotColor = statusDotColors[status] ?? MUTED_TEXT;
    const label = statusLabels[status] ?? status;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: "13px", color: PRIMARY_TEXT, fontFamily: DS_FONT }}>{label}</span>
      </div>
    );
  }

  const signers = recipients.filter((r) => r.role === "signer" || !r.role);
  const total = signers.length || 1;
  const completed = signers.filter(
    (r) => r.status === "signed"
  ).length;

  const isCompleted = status === "completed";
  const fraction = isCompleted ? 1 : completed / total;
  const barColor = isCompleted ? "#00B851" : "#0288D1";
  const label = isCompleted
    ? "Completed"
    : completed === 0
    ? "Need to sign"
    : `${completed} of ${total} signed`;

  return (
    <div style={{ minWidth: "110px" }}>
      <div
        style={{
          width: "100%",
          height: "4px",
          background: "#E5E7EB",
          borderRadius: "2px",
          overflow: "hidden",
          marginBottom: "4px",
        }}
      >
        <div
          style={{
            width: `${Math.max(fraction * 100, fraction > 0 ? 6 : 0)}%`,
            height: "100%",
            background: barColor,
            borderRadius: "2px",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "11px",
          color: isCompleted ? "#1B7A3E" : SECONDARY_TEXT,
          fontFamily: DS_FONT,
          fontWeight: isCompleted ? 500 : 400,
        }}
      >
        {label}
      </span>
    </div>
  );
}

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
  const [bulkBusy, setBulkBusy] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [dateFilterActive, setDateFilterActive] = useState(true);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);
  const [advancedDropdownOpen, setAdvancedDropdownOpen] = useState(false);
  const [sharedAccessOpen, setSharedAccessOpen] = useState(false);
  const [sharedAccessMode, setSharedAccessMode] = useState<"mine" | "shared">("mine");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [appliedStatus, setAppliedStatus] = useState<string | null>(null);
  const [pendingSender, setPendingSender] = useState<string | null>(null);
  const [appliedSender, setAppliedSender] = useState<string | null>(null);
  const [pendingEnvelopeId, setPendingEnvelopeId] = useState("");
  const [pendingRecipientSearch, setPendingRecipientSearch] = useState("");
  const [appliedEnvelopeId, setAppliedEnvelopeId] = useState("");
  const [appliedRecipientSearch, setAppliedRecipientSearch] = useState("");
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
  const [perPage, setPerPage] = useState(25);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidTargetIds, setVoidTargetIds] = useState<string[]>([]);
  const [voidReason, setVoidReason] = useState("");
  const [voidReasonType, setVoidReasonType] = useState<"declined" | "update" | "other">("other");
  const [voidBusy, setVoidBusy] = useState(false);

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
    setAppliedEnvelopeId("");
    setPendingEnvelopeId("");
    setAppliedRecipientSearch("");
    setPendingRecipientSearch("");
  };

  const hasActiveFilters =
    dateFilterActive ||
    appliedStatus !== null ||
    appliedSender !== null ||
    appliedEnvelopeId !== "" ||
    appliedRecipientSearch !== "";

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [
      "envelopes",
      filter,
      search,
      page,
      perPage,
      appliedStatus,
      appliedSender,
      sharedAccessMode,
      dateFilterActive,
      appliedEnvelopeId,
      appliedRecipientSearch,
    ],
    queryFn: () => {
      // When a user-applied status override exists, map the human-readable
      // label to the backend enum value and skip the virtual backend filter.
      const overrideStatus = appliedStatus
        ? statusLabelToEnum[appliedStatus] ?? appliedStatus.toLowerCase()
        : undefined;
      const backendFilter = !overrideStatus ? filterToBackendFilter[filter] : undefined;

      // Compute date_from for "Last 6 Months" filter
      let date_from: string | undefined;
      let date_to: string | undefined;
      if (dateFilterActive) {
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        date_from = sixMonthsAgo.toISOString();
        date_to = now.toISOString();
      }

      // Extract folder UUID when the sidebar sets ?filter=folder:<uuid>
      const folderMatch = filter.startsWith("folder:") ? filter.slice("folder:".length) : undefined;

      // Sender filter: "Sent to me" uses shared=true; "Sent by me" is default (no param needed)
      const senderShared = appliedSender === "Sent to me" ? true : undefined;
      // sharedAccessMode dropdown also controls shared; either one can activate it
      const sharedParam = sharedAccessMode === "shared" ? true : senderShared;

      return getEnvelopes({
        status: overrideStatus ?? filterToStatus[filter] ?? undefined,
        filter: backendFilter,
        search,
        page,
        perPage,
        shared: sharedParam,
        date_from,
        date_to,
        envelope_id: appliedEnvelopeId || undefined,
        recipient_search: appliedRecipientSearch || undefined,
        folder_id: folderMatch,
      });
    },
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

  const { data: foldersList } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
    enabled: filter.startsWith("folder:"),
  });

  const heading = (() => {
    if (filter.startsWith("folder:")) {
      const folderId = filter.slice("folder:".length);
      const found = foldersList?.find((f) => f.id === folderId);
      return found?.name ?? "Folder";
    }
    return headingMap[filter] ?? filter;
  })();

  const filterToStatus: Record<string, string | undefined> = {
    inbox: undefined, // uses backend "inbox" filter
    sent: undefined, // uses backend "sent" filter (covers sent + delivered)
    completed: "completed",
    // "action-required", "deleted", "waiting", "expiring", "auth-failed" all use
    // backend virtual filters instead of a single status value.
    "action-required": undefined,
    draft: "draft",
    deleted: undefined,
    waiting: undefined,
    expiring: undefined,
    "auth-failed": undefined,
    "bulk-send": undefined,
    powerforms: undefined,
  };

  // Maps sidebar filter keys to the backend ?filter= virtual filter param.
  // Used when the sidebar filter has special multi-status or non-status semantics.
  const filterToBackendFilter: Record<string, string | undefined> = {
    inbox: "inbox",
    sent: "sent",
    waiting: "waiting_for_others",
    deleted: "deleted",
    expiring: "expiring_soon",
    "action-required": "action_required",
    "auth-failed": "auth_failed",
  };

  // Maps the human-readable status dropdown labels to the backend enum values.
  const statusLabelToEnum: Record<string, string> = {
    "Completed": "completed",
    "Declined": "declined",
    "Draft": "draft",
    "In progress": "sent",
    "Voided": "voided",
  };

  // ── Bulk action helpers ─────────────────────────────────────────────────────

  /** Envelope objects for the currently selected IDs (used by CSV export). */
  const selectedEnvelopes = envelopes.filter((e) => selectedIds.has(e.id));

  const handleBulkResend = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    const ids = Array.from(selectedIds);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try { await resendEnvelope(id); ok++; } catch { fail++; }
    }
    setBulkBusy(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["envelopes"] });
    if (fail === 0) {
      toast(`Resent ${ok} envelope${ok !== 1 ? "s" : ""} successfully.`, "success");
    } else {
      toast(
        `Resent ${ok}. ${fail} failed (only sent/delivered envelopes can be resent).`,
        ok > 0 ? "warning" : "error",
      );
    }
  };

  const handleBulkVoid = () => {
    if (bulkBusy) return;
    setBulkMoreOpen(false);
    setVoidTargetIds(Array.from(selectedIds));
    setVoidReason("");
    setVoidReasonType("other");
    setVoidModalOpen(true);
  };

  const handleVoidSubmit = async (ids: string[], reason: string) => {
    setVoidBusy(true);
    const isBulk = ids.length > 1 || (voidTargetIds.length > 1 && ids === voidTargetIds);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try { await voidEnvelope(id, reason); ok++; } catch { fail++; }
    }
    setVoidBusy(false);
    setVoidModalOpen(false);
    setVoidReason("");
    setVoidReasonType("other");
    if (isBulk) setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["envelopes"] });
    if (fail === 0) {
      toast(`Voided ${ok} envelope${ok !== 1 ? "s" : ""}.`, "success");
    } else {
      toast(
        `Voided ${ok}. ${fail} failed (only sent/delivered envelopes can be voided).`,
        ok > 0 ? "warning" : "error",
      );
    }
  };

  const handleBulkDelete = async () => {
    if (bulkBusy) return;
    const count = selectedIds.size;
    if (
      !window.confirm(
        `Move ${count} envelope(s) to Deleted?`,
      )
    )
      return;
    setBulkBusy(true);
    setBulkMoreOpen(false);
    const ids = Array.from(selectedIds);
    // Separate drafts (hard-delete) from non-drafts (soft-delete via move)
    const draftIds = ids.filter((id) => envelopes.find((e) => e.id === id)?.status === "draft");
    const nonDraftIds = ids.filter((id) => envelopes.find((e) => e.id === id)?.status !== "draft");
    let ok = 0;
    let fail = 0;
    // Hard-delete drafts
    for (const id of draftIds) {
      try { await deleteEnvelope(id); ok++; } catch { fail++; }
    }
    // Soft-delete non-drafts by moving to "deleted" view
    if (nonDraftIds.length > 0) {
      try {
        const result = await moveEnvelopes(nonDraftIds, null, "deleted");
        ok += result.moved;
        if (result.moved < nonDraftIds.length) fail += nonDraftIds.length - result.moved;
      } catch {
        fail += nonDraftIds.length;
      }
    }
    setBulkBusy(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["envelopes"] });
    if (fail === 0) {
      toast(`Moved ${ok} envelope${ok !== 1 ? "s" : ""} to Deleted.`, "success");
    } else {
      toast(
        `Moved ${ok}. ${fail} could not be moved.`,
        ok > 0 ? "warning" : "error",
      );
    }
  };

  const handleBulkExportCSV = () => {
    setBulkMoreOpen(false);
    if (selectedEnvelopes.length === 0) {
      toast("No envelopes selected to export.", "warning");
      return;
    }
    exportEnvelopesAsCSV(selectedEnvelopes);
    toast(`Exported ${selectedEnvelopes.length} envelope${selectedEnvelopes.length !== 1 ? "s" : ""} as CSV.`, "success");
  };

  const handleBulkMove = () => {
    setMoveModalOpen(true);
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ fontFamily: DS_FONT }}
    >
      {/* Global toast notifications */}
      <ToastContainer />

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
              borderColor: sharedAccessOpen || sharedAccessMode === "shared" ? PRIMARY_COLOR : BORDER_COLOR,
              color: sharedAccessMode === "shared" ? PRIMARY_COLOR : PRIMARY_TEXT,
              background: sharedAccessOpen ? "rgba(19,0,50,0.03)" : "white",
              fontFamily: DS_FONT,
              borderRadius: "6px",
              fontWeight: sharedAccessMode === "shared" ? 600 : 400,
            }}
          >
            {sharedAccessMode === "shared" ? "Shared with Me" : (currentUser?.name ?? "My Envelopes")}
            <CaretDown size={14} weight="regular" />
          </button>
          {sharedAccessOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSharedAccessOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-1"
                style={{ borderColor: BORDER_COLOR, minWidth: "220px", borderRadius: "8px" }}
              >
                {/* My Envelopes option */}
                <button
                  className="w-full flex items-center gap-2 px-4 py-2"
                  style={{ fontSize: "14px", color: PRIMARY_TEXT, background: "none", border: "none", cursor: "pointer", fontFamily: DS_FONT, textAlign: "left" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                  onClick={() => { setSharedAccessMode("mine"); setPage(1); setSharedAccessOpen(false); }}
                >
                  <span style={{ width: "16px", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                    {sharedAccessMode === "mine" && <Check size={16} weight="bold" style={{ color: PRIMARY_COLOR }} />}
                  </span>
                  {currentUser?.name ?? "My Envelopes"}
                </button>

                <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "4px 0" }} />

                {/* Shared Access section label */}
                <div className="px-4 py-1">
                  <span style={{ fontSize: "11px", fontWeight: 700, color: SECONDARY_TEXT, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Shared Access
                  </span>
                </div>

                {/* Shared with Me option */}
                <button
                  className="w-full flex items-center gap-2 px-4 py-2"
                  style={{ fontSize: "14px", color: PRIMARY_TEXT, background: "none", border: "none", cursor: "pointer", fontFamily: DS_FONT, textAlign: "left" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                  onClick={() => { setSharedAccessMode("shared"); setPage(1); setSharedAccessOpen(false); }}
                >
                  <span style={{ width: "16px", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                    {sharedAccessMode === "shared" && <Check size={16} weight="bold" style={{ color: PRIMARY_COLOR }} />}
                  </span>
                  Shared with Me
                </button>

                <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "4px 0" }} />

                {/* View All link */}
                <button
                  className="w-full text-left px-4 py-2"
                  style={{ fontSize: "14px", color: PRIMARY_COLOR, background: "none", border: "none", cursor: "pointer", fontFamily: DS_FONT }}
                  onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
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
            onClick={() => {
              const open = !advancedDropdownOpen;
              closeAllDropdowns();
              setAdvancedDropdownOpen(open);
              if (open) {
                setPendingEnvelopeId(appliedEnvelopeId);
                setPendingRecipientSearch(appliedRecipientSearch);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-sm border rounded"
            style={{
              borderColor: advancedDropdownOpen || appliedEnvelopeId || appliedRecipientSearch ? PRIMARY_COLOR : BORDER_COLOR,
              color: appliedEnvelopeId || appliedRecipientSearch ? PRIMARY_TEXT : SECONDARY_TEXT,
              background: advancedDropdownOpen ? "rgba(19,0,50,0.04)" : "white",
              borderRadius: "4px",
              fontFamily: DS_FONT,
              fontWeight: appliedEnvelopeId || appliedRecipientSearch ? 600 : 400,
              cursor: "pointer",
            }}
          >
            Advanced search
            <CaretDown size={14} weight="regular" />
          </button>
          {advancedDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAdvancedDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-4 px-5" style={{ borderColor: BORDER_COLOR, minWidth: "300px", borderRadius: "8px" }}>
                <p style={{ fontSize: "16px", fontWeight: 600, color: PRIMARY_TEXT, margin: "0 0 2px", fontFamily: DS_FONT }}>Advanced search</p>
                <p style={{ fontSize: "12px", color: SECONDARY_TEXT, margin: "0 0 14px", fontFamily: DS_FONT }}>Search by Envelope ID or Recipient</p>

                {/* Envelope ID field */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: SECONDARY_TEXT, marginBottom: "5px", fontFamily: DS_FONT, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Envelope ID
                  </label>
                  <div style={{ display: "flex", alignItems: "center", border: `1px solid ${pendingEnvelopeId ? PRIMARY_COLOR : BORDER_COLOR}`, borderRadius: "4px", height: "36px", padding: "0 10px", gap: "8px" }}>
                    <MagnifyingGlass size={14} weight="regular" style={{ color: MUTED_TEXT, flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Enter envelope ID..."
                      value={pendingEnvelopeId}
                      onChange={(e) => setPendingEnvelopeId(e.target.value)}
                      style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", color: PRIMARY_TEXT, fontFamily: DS_FONT, background: "transparent" }}
                    />
                    {pendingEnvelopeId && (
                      <button onClick={() => setPendingEnvelopeId("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: MUTED_TEXT }}>
                        <X size={12} weight="bold" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Recipient name/email field */}
                <div style={{ marginBottom: "4px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: SECONDARY_TEXT, marginBottom: "5px", fontFamily: DS_FONT, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Recipient
                  </label>
                  <div style={{ display: "flex", alignItems: "center", border: `1px solid ${pendingRecipientSearch ? PRIMARY_COLOR : BORDER_COLOR}`, borderRadius: "4px", height: "36px", padding: "0 10px", gap: "8px" }}>
                    <MagnifyingGlass size={14} weight="regular" style={{ color: MUTED_TEXT, flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Name or email..."
                      value={pendingRecipientSearch}
                      onChange={(e) => setPendingRecipientSearch(e.target.value)}
                      style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", color: PRIMARY_TEXT, fontFamily: DS_FONT, background: "transparent" }}
                    />
                    {pendingRecipientSearch && (
                      <button onClick={() => setPendingRecipientSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: MUTED_TEXT }}>
                        <X size={12} weight="bold" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setPendingEnvelopeId(appliedEnvelopeId);
                      setPendingRecipientSearch(appliedRecipientSearch);
                      setAdvancedDropdownOpen(false);
                    }}
                    style={{ flex: 1, padding: "7px", border: `1px solid ${BORDER_COLOR}`, borderRadius: "4px", background: "white", fontSize: "14px", color: PRIMARY_TEXT, cursor: "pointer", fontFamily: DS_FONT }}
                  >Cancel</button>
                  <button
                    onClick={() => {
                      setAppliedEnvelopeId(pendingEnvelopeId);
                      setAppliedRecipientSearch(pendingRecipientSearch);
                      setPage(1);
                      setAdvancedDropdownOpen(false);
                    }}
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
            disabled={bulkBusy}
            style={{
              padding: "5px 16px",
              fontSize: "14px",
              fontWeight: 600,
              color: PRIMARY_TEXT,
              background: "white",
              border: `1.5px solid ${BORDER_COLOR}`,
              borderRadius: "4px",
              cursor: bulkBusy ? "not-allowed" : "pointer",
              fontFamily: DS_FONT,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: bulkBusy ? 0.6 : 1,
            }}
            onMouseOver={(e) => { if (!bulkBusy) e.currentTarget.style.background = "rgba(19,0,50,0.04)"; }}
            onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            onClick={handleBulkResend}
          >
            {bulkBusy ? <Spinner size={12} /> : <ArrowCounterClockwise size={14} weight="bold" />}
            {bulkBusy ? "Working…" : "Resend"}
          </button>

          {/* Move */}
          <button
            disabled={bulkBusy}
            style={{
              padding: "5px 16px",
              fontSize: "14px",
              fontWeight: 600,
              color: PRIMARY_TEXT,
              background: "white",
              border: `1.5px solid ${BORDER_COLOR}`,
              borderRadius: "4px",
              cursor: bulkBusy ? "not-allowed" : "pointer",
              fontFamily: DS_FONT,
              opacity: bulkBusy ? 0.6 : 1,
            }}
            onMouseOver={(e) => { if (!bulkBusy) e.currentTarget.style.background = "rgba(19,0,50,0.04)"; }}
            onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            onClick={handleBulkMove}
          >
            Move
          </button>

          {/* More actions dropdown (⋮) */}
          <div style={{ position: "relative" }}>
            <button
              disabled={bulkBusy}
              title="More bulk actions"
              style={{
                padding: "5px 10px",
                fontSize: "14px",
                fontWeight: 600,
                color: PRIMARY_TEXT,
                background: bulkMoreOpen ? "rgba(19,0,50,0.04)" : "white",
                border: `1.5px solid ${BORDER_COLOR}`,
                borderRadius: "4px",
                cursor: bulkBusy ? "not-allowed" : "pointer",
                fontFamily: DS_FONT,
                display: "flex",
                alignItems: "center",
                opacity: bulkBusy ? 0.6 : 1,
              }}
              onMouseOver={(e) => { if (!bulkBusy) e.currentTarget.style.background = "rgba(19,0,50,0.04)"; }}
              onMouseOut={(e) => (e.currentTarget.style.background = bulkMoreOpen ? "rgba(19,0,50,0.04)" : "white")}
              onClick={() => { if (!bulkBusy) setBulkMoreOpen((o) => !o); }}
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
                    onClick={handleBulkExportCSV}
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
                    onClick={handleBulkVoid}
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
                    onClick={handleBulkDelete}
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
                  onVoidClick={(id) => {
                    setVoidTargetIds([id]);
                    setVoidReason("");
                    setVoidReasonType("other");
                    setVoidModalOpen(true);
                  }}
                  onMoveClick={(id) => {
                    setSelectedIds(new Set([id]));
                    setMoveModalOpen(true);
                  }}
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
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            >
              <option value={10}>10 / Page</option>
              <option value={25}>25 / Page</option>
              <option value={50}>50 / Page</option>
              <option value={100}>100 / Page</option>
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

      {/* Move to Folder modal */}
      {moveModalOpen && (
        <MoveToFolderModal
          selectedIds={Array.from(selectedIds)}
          onClose={() => setMoveModalOpen(false)}
          onMoved={() => {
            setMoveModalOpen(false);
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ["envelopes"] });
            queryClient.invalidateQueries({ queryKey: ["folders"] });
          }}
        />
      )}

      {/* Void envelope modal */}
      {voidModalOpen && (
        <VoidEnvelopeModal
          ids={voidTargetIds}
          reason={voidReason}
          reasonType={voidReasonType}
          busy={voidBusy}
          onReasonChange={setVoidReason}
          onReasonTypeChange={setVoidReasonType}
          onClose={() => { setVoidModalOpen(false); setVoidReason(""); setVoidReasonType("other"); }}
          onSubmit={handleVoidSubmit}
        />
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

// ── VoidEnvelopeModal ─────────────────────────────────────────────────────────

function VoidEnvelopeModal({
  ids,
  reason,
  reasonType,
  busy,
  onReasonChange,
  onReasonTypeChange,
  onClose,
  onSubmit,
}: {
  ids: string[];
  reason: string;
  reasonType: "declined" | "update" | "other";
  busy: boolean;
  onReasonChange: (r: string) => void;
  onReasonTypeChange: (t: "declined" | "update" | "other") => void;
  onClose: () => void;
  onSubmit: (ids: string[], reason: string) => void;
}) {
  const _DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
  const _PRIMARY_COLOR = "#260559";
  const _PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
  const _SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
  const _BORDER_COLOR = "rgba(19, 0, 50, 0.1)";

  const PRESET_REASONS: { value: "declined" | "update" | "other"; label: string }[] = [
    { value: "declined", label: "One or more parties declined the terms" },
    { value: "update", label: "The agreement needs to be updated and resent" },
    { value: "other", label: "Input other reason" },
  ];

  const getFinalReason = () => {
    if (reasonType === "declined") return "One or more parties declined the terms";
    if (reasonType === "update") return "The agreement needs to be updated and resent";
    return reason.trim() || "Voided by sender";
  };

  const handleSubmit = () => {
    if (busy) return;
    onSubmit(ids, getFinalReason());
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9100,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "10px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          width: "520px",
          maxWidth: "94vw",
          fontFamily: _DS_FONT,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px 14px",
            borderBottom: `1px solid ${_BORDER_COLOR}`,
          }}
        >
          <span style={{ fontSize: "17px", fontWeight: 600, color: _PRIMARY_TEXT }}>
            Void envelope{ids.length > 1 ? `s (${ids.length})` : ""}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(19,0,50,0.4)",
              display: "flex",
              padding: "4px",
              borderRadius: "4px",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = _PRIMARY_TEXT)}
            onMouseOut={(e) => (e.currentTarget.style.color = "rgba(19,0,50,0.4)")}
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Warning banner */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            margin: "18px 22px 0",
            padding: "12px 14px",
            background: "#FFF7ED",
            border: "1px solid #F59E0B",
            borderRadius: "6px",
          }}
        >
          <WarningCircle size={20} weight="fill" style={{ color: "#F59E0B", flexShrink: 0, marginTop: "1px" }} />
          <span style={{ fontSize: "13px", color: "#92400E", lineHeight: "1.5" }}>
            You&apos;re voiding an in-progress envelope.
          </span>
        </div>

        {/* Explanation */}
        <p
          style={{
            fontSize: "13px",
            color: _SECONDARY_TEXT,
            lineHeight: "1.6",
            margin: "14px 22px 0",
          }}
        >
          By voiding this envelope, you are canceling all remaining signing activities.
          Recipients who have finished signing will receive an email notification that
          includes your reason for voiding. Recipients who have not yet signed will not
          be able to view or sign the enclosed documents.
        </p>

        {/* Reason section */}
        <div style={{ padding: "18px 22px 22px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: _PRIMARY_TEXT,
              marginBottom: "10px",
              fontFamily: _DS_FONT,
            }}
          >
            Void Reason <span style={{ color: "#D93025" }}>*</span>
          </label>

          {PRESET_REASONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                marginBottom: "10px",
                cursor: "pointer",
                fontSize: "14px",
                color: _PRIMARY_TEXT,
                fontFamily: _DS_FONT,
              }}
            >
              <input
                type="radio"
                name="void-reason-type"
                checked={reasonType === opt.value}
                onChange={() => onReasonTypeChange(opt.value)}
                style={{ accentColor: _PRIMARY_COLOR, width: "15px", height: "15px", flexShrink: 0, marginTop: "2px" }}
              />
              {opt.label}
            </label>
          ))}

          {/* Custom textarea (shown when "other" is selected) */}
          {reasonType === "other" && (
            <textarea
              autoFocus
              placeholder="Enter your reason for voiding…"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                marginTop: "4px",
                border: `1px solid ${_BORDER_COLOR}`,
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "14px",
                fontFamily: _DS_FONT,
                color: _PRIMARY_TEXT,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = _PRIMARY_COLOR)}
              onBlur={(e) => (e.currentTarget.style.borderColor = _BORDER_COLOR)}
            />
          )}

          {/* Submit button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
            <button
              onClick={onClose}
              disabled={busy}
              style={{
                padding: "8px 20px",
                background: "white",
                border: `1px solid ${_BORDER_COLOR}`,
                borderRadius: "4px",
                fontSize: "14px",
                color: _PRIMARY_TEXT,
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: _DS_FONT,
                marginRight: "10px",
                opacity: busy ? 0.6 : 1,
              }}
              onMouseOver={(e) => { if (!busy) e.currentTarget.style.background = "rgba(19,0,50,0.04)"; }}
              onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy || (reasonType === "other" && !reason.trim())}
              style={{
                padding: "8px 24px",
                background:
                  busy || (reasonType === "other" && !reason.trim())
                    ? "rgba(38,5,89,0.35)"
                    : _PRIMARY_COLOR,
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 600,
                color: "white",
                cursor:
                  busy || (reasonType === "other" && !reason.trim())
                    ? "not-allowed"
                    : "pointer",
                fontFamily: _DS_FONT,
              }}
            >
              {busy ? "Voiding…" : "Void"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MoveToFolderModal ─────────────────────────────────────────────────────────

function MoveToFolderModal({
  selectedIds,
  onClose,
  onMoved,
}: {
  selectedIds: string[];
  onClose: () => void;
  onMoved: () => void;
}) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const _DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
  const _PRIMARY_COLOR = "#260559";
  const _PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
  const _SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
  const _MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
  const _BORDER_COLOR = "rgba(19, 0, 50, 0.1)";

  useEffect(() => {
    getFolders()
      .then(setFolders)
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const folder = await createFolder(name);
      setFolders((prev) => [...prev, folder]);
      setNewFolderName("");
      setShowNewFolder(false);
      setSelectedFolderId(folder.id);
    } catch {
      toast("Failed to create folder.", "error");
    } finally {
      setCreatingFolder(false);
    }
  };

  const virtualViews = [
    { id: "__view__:inbox", name: "Inbox", view: "inbox", icon: Tray },
    { id: "__view__:sent", name: "Sent", view: "sent", icon: PaperPlaneRight },
  ];

  const handleMove = async () => {
    if (!selectedFolderId) return;
    setMoving(true);
    try {
      let result;
      if (selectedFolderId.startsWith("__view__:")) {
        const view = selectedFolderId.slice("__view__:".length);
        result = await moveEnvelopes(selectedIds, null, view);
      } else {
        result = await moveEnvelopes(selectedIds, selectedFolderId);
      }
      toast(
        `Moved ${result.moved} envelope${result.moved !== 1 ? "s" : ""} successfully.`,
        "success",
      );
      onMoved();
    } catch {
      toast("Failed to move envelopes.", "error");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.40)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "10px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          width: "400px",
          maxWidth: "94vw",
          fontFamily: _DS_FONT,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px 14px",
            borderBottom: `1px solid ${_BORDER_COLOR}`,
          }}
        >
          <span style={{ fontSize: "17px", fontWeight: 600, color: _PRIMARY_TEXT }}>
            Move to Folder
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: _MUTED_TEXT,
              display: "flex",
              padding: "4px",
              borderRadius: "4px",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = _PRIMARY_TEXT)}
            onMouseOut={(e) => (e.currentTarget.style.color = _MUTED_TEXT)}
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Folder list */}
        <div style={{ maxHeight: "320px", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: _MUTED_TEXT, fontSize: "14px" }}>
              Loading folders…
            </div>
          ) : (
            <>
              {/* Virtual views (Inbox, Sent) — moves to real sidebar view */}
              {virtualViews.map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedFolderId(v.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "11px 20px",
                      background: selectedFolderId === v.id ? "rgba(19,0,50,0.06)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: _DS_FONT,
                      fontSize: "14px",
                      color: _PRIMARY_TEXT,
                      fontWeight: selectedFolderId === v.id ? 600 : 400,
                    }}
                    onMouseOver={(e) => { if (selectedFolderId !== v.id) e.currentTarget.style.background = "rgba(19,0,50,0.03)"; }}
                    onMouseOut={(e) => { if (selectedFolderId !== v.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon size={18} weight="regular" color={_SECONDARY_TEXT} />
                    {v.name}
                  </button>
                );
              })}

              {/* Empty state when no custom folders exist */}
              {folders.length === 0 && !showNewFolder && (
                <div style={{ padding: "24px 20px", textAlign: "center", color: _MUTED_TEXT, fontSize: "14px" }}>
                  Create a custom folder below.
                </div>
              )}

              {/* Custom folders */}
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "11px 20px",
                    background: selectedFolderId === f.id ? "rgba(19,0,50,0.06)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: _DS_FONT,
                    fontSize: "14px",
                    color: _PRIMARY_TEXT,
                    fontWeight: selectedFolderId === f.id ? 600 : 400,
                  }}
                  onMouseOver={(e) => {
                    if (selectedFolderId !== f.id)
                      e.currentTarget.style.background = "rgba(19,0,50,0.03)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background =
                      selectedFolderId === f.id ? "rgba(19,0,50,0.06)" : "transparent";
                  }}
                >
                  <span style={{ color: selectedFolderId === f.id ? _PRIMARY_COLOR : _SECONDARY_TEXT, display: "flex", flexShrink: 0 }}>
                    <Folder size={18} weight="regular" />
                  </span>
                  {f.name}
                </button>
              ))}

              {/* New folder inline input */}
              {showNewFolder && (
                <div style={{ padding: "8px 20px 4px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
                    }}
                    style={{
                      flex: 1,
                      border: `1px solid ${_BORDER_COLOR}`,
                      borderRadius: "4px",
                      padding: "6px 10px",
                      fontSize: "14px",
                      fontFamily: _DS_FONT,
                      color: _PRIMARY_TEXT,
                      outline: "none",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = _PRIMARY_COLOR)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = _BORDER_COLOR)}
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={creatingFolder || !newFolderName.trim()}
                    style={{
                      padding: "6px 12px",
                      background: _PRIMARY_COLOR,
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: creatingFolder || !newFolderName.trim() ? "not-allowed" : "pointer",
                      fontFamily: _DS_FONT,
                      opacity: !newFolderName.trim() ? 0.5 : 1,
                    }}
                  >
                    {creatingFolder ? "…" : "Add"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: `1px solid ${_BORDER_COLOR}`,
          }}
        >
          {/* New Folder button */}
          <button
            onClick={() => { setShowNewFolder(true); setNewFolderName(""); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: `1px solid ${_BORDER_COLOR}`,
              borderRadius: "4px",
              padding: "6px 12px",
              fontSize: "13px",
              color: _PRIMARY_TEXT,
              cursor: "pointer",
              fontFamily: _DS_FONT,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            <Plus size={14} weight="bold" />
            New Folder
          </button>

          {/* Cancel / Move */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "7px 18px",
                background: "white",
                border: `1px solid ${_BORDER_COLOR}`,
                borderRadius: "4px",
                fontSize: "14px",
                color: _PRIMARY_TEXT,
                cursor: "pointer",
                fontFamily: _DS_FONT,
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={!selectedFolderId || moving}
              style={{
                padding: "7px 18px",
                background: selectedFolderId && !moving ? _PRIMARY_COLOR : "rgba(38,5,89,0.35)",
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 600,
                color: "white",
                cursor: selectedFolderId && !moving ? "pointer" : "not-allowed",
                fontFamily: _DS_FONT,
              }}
            >
              {moving ? "Moving…" : "Move"}
            </button>
          </div>
        </div>
      </div>
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
  onVoidClick,
  onMoveClick,
}: {
  envelope: Envelope;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  currentUserEmail?: string;
  currentUserName?: string;
  onVoidClick: (id: string) => void;
  onMoveClick: (id: string) => void;
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
          r.status !== "signed" &&
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
      toast(`Resent "${envelope.subject}".`, "success");
      setMenuOpen(false);
    },
    onError: () => {
      toast("Resend failed. Only sent/delivered envelopes can be resent.", "error");
      setMenuOpen(false);
    },
  });

  // ── Void mutation ──────────────────────────────────────────────────────────
  const voidMutation = useMutation({
    mutationFn: (reason: string) => voidEnvelope(envelope.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
      toast(`"${envelope.subject}" has been voided.`, "success");
      setMenuOpen(false);
    },
    onError: () => {
      toast("Void failed. Only sent/delivered envelopes can be voided.", "error");
      setMenuOpen(false);
    },
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteEnvelope(envelope.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
      toast(`"${envelope.subject}" was deleted.`, "success");
      setMenuOpen(false);
    },
    onError: () => {
      toast("Delete failed. Only draft envelopes can be permanently deleted.", "error");
      setMenuOpen(false);
    },
  });

  // ── Correct mutation ───────────────────────────────────────────────────────
  const correctMutation = useMutation({
    mutationFn: () => correctEnvelope(envelope.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
      queryClient.invalidateQueries({ queryKey: ["envelope", envelope.id] });
      setMenuOpen(false);
      // Redirect to the prepare page so the user can edit recipients/fields
      router.push(`/envelope/${envelope.id}/prepare`);
    },
    onError: () => {
      toast("Correct failed. Only sent/delivered envelopes can be corrected.", "error");
      setMenuOpen(false);
    },
  });

  // ── Copy mutation ──────────────────────────────────────────────────────────
  const copyMutation = useMutation({
    mutationFn: () =>
      createEnvelope({
        subject: `Copy of ${envelope.subject}`,
        message: envelope.message ?? "",
        recipients: (envelope.recipients ?? []).map((r) => ({
          name: r.name,
          email: r.email,
          role: r.role ?? "signer",
          order: r.order ?? 1,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
      toast(`Copied "${envelope.subject}" as a new draft.`, "success");
      setMenuOpen(false);
    },
    onError: () => {
      toast("Copy failed.", "error");
      setMenuOpen(false);
    },
  });

  // ── Save as Template mutation ──────────────────────────────────────────────
  const saveAsTemplateMutation = useMutation({
    mutationFn: () => saveEnvelopeAsTemplate(envelope.id, envelope.subject),
    onSuccess: () => {
      toast(`"${envelope.subject}" saved as a template.`, "success");
      setMenuOpen(false);
    },
    onError: () => {
      toast("Save as template failed.", "error");
      setMenuOpen(false);
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
        <StatusCell envelope={envelope} currentUserEmail={currentUserEmail} />
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: SECONDARY_TEXT, fontFamily: DS_FONT }}>
        {fromDisplay}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: MUTED_TEXT, fontFamily: DS_FONT }}>
        {(() => {
          const { date, time } = formatDateWithTime(envelope.lastModified);
          return <><span>{date}</span><br /><span>{time}</span></>;
        })()}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 justify-end">
          {/* Sign button — visible when current user is a pending recipient */}
          {signingRecipient ? (
            <button
              style={{
                borderRadius: "4px",
                padding: "4px 14px",
                background: "#4C00FF",
                fontFamily: DS_FONT,
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                color: "white",
              }}
              title="Sign this envelope"
              onClick={() => router.push(`/sign/${signingRecipient.signing_token}`)}
              onMouseOver={(e) => (e.currentTarget.style.background = "#3D00CC")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#4C00FF")}
            >
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
                      toast("Envelope ID copied to clipboard.", "info");
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
                      {resendMutation.isPending ? "Resending…" : "Resend"}
                    </button>
                  )}

                  {/* Move */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                    style={{ color: PRIMARY_TEXT }}
                    onClick={() => { setMenuOpen(false); onMoveClick(envelope.id); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Folder size={14} weight="regular" />
                    Move
                  </button>

                  {/* Correct (sent/delivered only — reverts to draft) */}
                  {(envelope.status === "sent" || envelope.status === "delivered") && (
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                      style={{ color: PRIMARY_TEXT }}
                      disabled={correctMutation.isPending}
                      onClick={() => correctMutation.mutate()}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                      {correctMutation.isPending ? "Correcting…" : "Correct"}
                    </button>
                  )}

                  {/* Copy — duplicate as new draft */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                    style={{ color: PRIMARY_TEXT }}
                    disabled={copyMutation.isPending}
                    onClick={() => copyMutation.mutate()}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <CopySimple size={14} weight="bold" />
                    {copyMutation.isPending ? "Copying…" : "Copy"}
                  </button>

                  {/* Save as Template */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                    style={{ color: PRIMARY_TEXT }}
                    disabled={saveAsTemplateMutation.isPending}
                    onClick={() => saveAsTemplateMutation.mutate()}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                    </svg>
                    {saveAsTemplateMutation.isPending ? "Saving…" : "Save as Template"}
                  </button>

                  {/* Void (sent/delivered only) */}
                  {(envelope.status === "sent" || envelope.status === "delivered") && (
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                      style={{ color: PRIMARY_TEXT }}
                      disabled={voidMutation.isPending}
                      onClick={() => { setMenuOpen(false); onVoidClick(envelope.id); }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <X size={14} weight="bold" />
                      Void
                    </button>
                  )}

                  {/* History — navigate to detail page (audit trail) */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                    style={{ color: PRIMARY_TEXT }}
                    onClick={() => { setMenuOpen(false); router.push(`/agreements/${envelope.id}`); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                    </svg>
                    History
                  </button>

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

                  <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, margin: "4px 0" }} />

                  {/* Delete — only draft envelopes can be deleted; show confirmation */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                    style={{ color: "#D93025" }}
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete "${envelope.subject}"?\n\nThis action cannot be undone. Only draft envelopes can be permanently deleted.`,
                        )
                      )
                        return;
                      deleteMutation.mutate();
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF5F5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Trash size={14} weight="bold" />
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
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
