"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusBadge } from "./StatusBadge";
import { RecipientList } from "./RecipientList";
import { DocumentPanel } from "./DocumentPanel";
import { Button } from "@/components/ui/Button";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import {
  downloadEnvelope,
  voidEnvelope,
  deleteEnvelope,
  resendEnvelope,
  downloadCertificate,
  saveEnvelopeAsTemplate,
  moveEnvelopes,
  getComments,
  postComment,
  deleteComment,
  correctEnvelope,
} from "../api";
import { formatDateLong } from "@/lib/utils";
import type { Envelope } from "../types";
import {
  CaretLeft,
  CopySimple,
  X as PhosphorX,
  Trash,
  ArrowCounterClockwise,
  Warning,
  Certificate,
  PaperPlaneTilt,
  BookmarkSimple,
  ChatTeardrop,
  PencilSimple,
} from "@phosphor-icons/react";
import { useAuthStore } from "@/features/auth/store";

// ─── DocuSign design tokens ───────────────────────────────────────────────────
const DS_FONT         = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const COLOR_PRIMARY   = "rgba(19,0,50,0.9)";
const COLOR_SECONDARY = "rgba(19,0,50,0.6)";
const COLOR_MUTED     = "rgba(19,0,50,0.4)";
const COLOR_ACCENT    = "#4C00FF";
const COLOR_BORDER    = "rgba(19,0,50,0.1)";

// ─── Status → banner config ───────────────────────────────────────────────────
const BANNER_CONFIG: Record<
  string,
  { bg: string; border: string; text: string; message: string } | null
> = {
  voided: {
    bg: "#FFF8F7",
    border: "#FDDAD7",
    text: "#B3261E",
    message: "Envelope has been voided and is no longer active.",
  },
  declined: {
    bg: "#FFF8F7",
    border: "#FDDAD7",
    text: "#B3261E",
    message: "One or more recipients declined to sign this envelope.",
  },
  completed: null,
  sent: null,
  draft: null,
  waiting: null,
  delivered: null,
};

interface EnvelopeDetailProps {
  envelope: Envelope;
}

export function EnvelopeDetail({ envelope }: EnvelopeDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toasts, addToast, dismissToast } = useToast();
  const currentUser = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab]             = useState("recipients");
  const [copied, setCopied]                   = useState(false);
  const [showMoreMenu, setShowMoreMenu]       = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName]       = useState("");
  const [voidReason, setVoidReason]           = useState("");
  const [commentText, setCommentText]         = useState("");
  const commentInputRef                       = useRef<HTMLTextAreaElement>(null);

  // ── Copy envelope ID ──────────────────────────────────────────────────────
  const copyId = () => {
    navigator.clipboard.writeText(envelope.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Copy arbitrary text ───────────────────────────────────────────────────
  const copyToClipboard = (text: string, label = "Copied!") => {
    navigator.clipboard.writeText(text);
    addToast(label, "success");
  };

  // ── Download envelope PDF ─────────────────────────────────────────────────
  const downloadMutation = useMutation({
    mutationFn: () => downloadEnvelope(envelope.id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `${envelope.subject}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    },
    onError: () => addToast("Failed to download envelope.", "error"),
  });

  // ── Download certificate ──────────────────────────────────────────────────
  const certificateMutation = useMutation({
    mutationFn: () => downloadCertificate(envelope.id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `${envelope.subject}-certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    },
    onError: () => addToast("Failed to download certificate.", "error"),
  });

  // ── Resend ────────────────────────────────────────────────────────────────
  const resendMutation = useMutation({
    mutationFn: () => resendEnvelope(envelope.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelope", envelope.id] });
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
      setShowMoreMenu(false);
      addToast("Envelope resent successfully", "success");
    },
    onError: () => addToast("Failed to resend envelope.", "error"),
  });

  // ── Void ──────────────────────────────────────────────────────────────────
  const voidMutation = useMutation({
    mutationFn: () => voidEnvelope(envelope.id, voidReason || "Voided by sender"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelope", envelope.id] });
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
      setShowVoidConfirm(false);
      setShowMoreMenu(false);
      addToast("Envelope voided", "success");
    },
    onError: () => addToast("Failed to void envelope.", "error"),
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  // Draft envelopes are hard-deleted; non-draft envelopes are soft-deleted
  // (moved to the "deleted" view) since they cannot be permanently removed
  // while in-flight or completed.
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (envelope.status === "draft") {
        await deleteEnvelope(envelope.id);
      } else {
        await moveEnvelopes([envelope.id], null, "deleted");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
      router.push("/agreements");
    },
    onError: () => addToast("Failed to delete envelope.", "error"),
  });

  // ── Save as Template ──────────────────────────────────────────────────────
  const saveAsTemplateMutation = useMutation({
    mutationFn: () => saveEnvelopeAsTemplate(envelope.id, templateName || undefined),
    onSuccess: () => {
      setShowSaveTemplateDialog(false);
      setShowMoreMenu(false);
      setTemplateName("");
      addToast("Envelope saved as template", "success");
    },
    onError: () => addToast("Failed to save as template.", "error"),
  });

  // ── Comments ──────────────────────────────────────────────────────────────
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", envelope.id],
    queryFn: () => getComments(envelope.id),
  });

  const postCommentMutation = useMutation({
    mutationFn: () => postComment(envelope.id, commentText.trim()),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", envelope.id] });
    },
    onError: () => addToast("Failed to post comment.", "error"),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(envelope.id, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", envelope.id] });
    },
    onError: () => addToast("Failed to delete comment.", "error"),
  });

  // ── Correct in-flight ──────────────────────────────────────────────────────
  const correctMutation = useMutation({
    mutationFn: () => correctEnvelope(envelope.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelope", envelope.id] });
      queryClient.invalidateQueries({ queryKey: ["envelopes"] });
      router.push(`/envelope/${envelope.id}/prepare`);
    },
    onError: () => addToast("Failed to correct envelope.", "error"),
  });

  const banner   = BANNER_CONFIG[envelope.status];
  const canVoid  = envelope.status === "sent" || envelope.status === "delivered";
  const canResend = envelope.status === "sent" || envelope.status === "delivered";
  const canCorrect = envelope.status === "sent" || envelope.status === "delivered";

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden min-h-0"
      style={{ fontFamily: DS_FONT, background: "#FFFFFF" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-8 pt-5 pb-0 border-b"
        style={{ borderColor: COLOR_BORDER }}
      >
        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm mb-4 transition-colors"
          style={{ color: COLOR_ACCENT }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#3700cc")}
          onMouseLeave={(e) => (e.currentTarget.style.color = COLOR_ACCENT)}
        >
          <CaretLeft size={15} weight="bold" />
          Back to Agreements
        </button>

        {/* Status + subject + meta row */}
        <div className="flex items-start justify-between gap-4 pb-4">
          <div className="min-w-0 flex-1">
            {/* Status badge */}
            <div className="mb-2">
              <StatusBadge status={envelope.status} />
            </div>

            {/* Envelope subject */}
            <h1
              className="mb-1.5"
              style={{
                fontSize: "20px",
                fontWeight: 400,
                lineHeight: "1.3",
                color: COLOR_PRIMARY,
                fontFamily: DS_FONT,
              }}
            >
              {envelope.subject}
            </h1>

            {/* From: sender | Envelope ID */}
            <p
              className="text-sm flex items-center gap-0 flex-wrap"
              style={{ color: COLOR_SECONDARY }}
            >
              <span>
                From:{" "}
                <span style={{ color: COLOR_PRIMARY, fontWeight: 500 }}>
                  {envelope.from || envelope.fromEmail || "—"}
                </span>
              </span>
              <span className="mx-2" style={{ color: COLOR_MUTED }}>|</span>
              <span style={{ color: COLOR_SECONDARY }}>
                Envelope ID{" "}
                <button
                  onClick={copyId}
                  title="Copy Envelope ID"
                  className="inline-flex items-center gap-1 transition-colors hover:underline"
                  style={{ color: COLOR_PRIMARY, fontFamily: "monospace", fontSize: "12px" }}
                >
                  {envelope.id.slice(0, 8)}…
                  <CopySimple size={12} weight="bold" style={{ opacity: 0.55 }} />
                </button>
                {copied && (
                  <span className="ml-1 text-xs font-medium" style={{ color: "#00B851" }}>
                    Copied!
                  </span>
                )}
              </span>
            </p>
          </div>

          {/* Action buttons — right side */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            {/* Copy envelope ID */}
            <Button
              variant="outline"
              size="sm"
              onClick={copyId}
              className="flex items-center gap-1.5"
              style={{ fontFamily: DS_FONT }}
            >
              <CopySimple size={14} weight="bold" />
              Copy
            </Button>

            {/* Download envelope */}
            <Button
              variant="outline"
              size="sm"
              isLoading={downloadMutation.isPending}
              onClick={() => downloadMutation.mutate()}
              className="flex items-center gap-1.5"
              style={{ fontFamily: DS_FONT }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              Download
            </Button>

            {/* Download certificate (completed only) */}
            {envelope.status === "completed" && (
              <Button
                variant="outline"
                size="sm"
                isLoading={certificateMutation.isPending}
                onClick={() => certificateMutation.mutate()}
                className="flex items-center gap-1.5"
                style={{ fontFamily: DS_FONT }}
              >
                <Certificate size={14} weight="bold" />
                Certificate
              </Button>
            )}

            {/* Resend (sent/delivered only) — direct button */}
            {canResend && (
              <Button
                variant="outline"
                size="sm"
                isLoading={resendMutation.isPending}
                onClick={() => resendMutation.mutate()}
                className="flex items-center gap-1.5"
                style={{ fontFamily: DS_FONT }}
              >
                <PaperPlaneTilt size={14} weight="bold" />
                Resend
              </Button>
            )}

            {/* Correct (sent/delivered only) */}
            {canCorrect && (
              <Button
                variant="outline"
                size="sm"
                isLoading={correctMutation.isPending}
                onClick={() => correctMutation.mutate()}
                className="flex items-center gap-1.5"
                style={{ fontFamily: DS_FONT }}
              >
                <PencilSimple size={14} weight="bold" />
                Correct
              </Button>
            )}

            {/* ⋮ kebab menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                title="More options"
                className="w-8 h-8 flex items-center justify-center rounded transition-colors"
                style={{ color: COLOR_SECONDARY }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-20 py-1 min-w-[160px]"
                    style={{ borderColor: COLOR_BORDER, fontFamily: DS_FONT }}
                  >
                    {canVoid && (
                      <button
                        onClick={() => { setShowVoidConfirm(true); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                        style={{ color: "#D93025" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF5F5")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <PhosphorX size={14} weight="bold" />
                        Void Envelope
                      </button>
                    )}
                    {canResend && (
                      <button
                        onClick={() => { setShowMoreMenu(false); resendMutation.mutate(); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                        style={{ color: COLOR_PRIMARY }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <ArrowCounterClockwise size={14} weight="bold" />
                        Resend
                      </button>
                    )}
                    <button
                      onClick={() => { copyId(); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                      style={{ color: COLOR_PRIMARY }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <CopySimple size={14} weight="bold" />
                      Copy ID
                    </button>
                    {envelope.status === "completed" && (
                      <button
                        onClick={() => { certificateMutation.mutate(); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                        style={{ color: COLOR_PRIMARY }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Certificate size={14} weight="bold" />
                        Download Certificate
                      </button>
                    )}
                    {currentUser && envelope.user_id === currentUser.id && (
                    <button
                      onClick={() => {
                        setTemplateName(envelope.subject);
                        setShowSaveTemplateDialog(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                      style={{ color: COLOR_PRIMARY }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <BookmarkSimple size={14} weight="bold" />
                      Save as Template
                    </button>
                    )}
                    <button
                      onClick={() => { setShowDeleteConfirm(true); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                      style={{ color: "#D93025" }}
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
        </div>

        {/* ── Tabs strip ─────────────────────────────────────────────────────── */}
        <div className="flex gap-0 -mb-px">
          {[
            { id: "recipients", label: `Recipients (${envelope.recipients.length})` },
            { id: "details",    label: "Details" },
            { id: "comments",   label: `Comments (${comments.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-sm transition-colors relative"
              style={{
                fontFamily: DS_FONT,
                color: activeTab === tab.id ? "#260559" : COLOR_SECONDARY,
                fontWeight: activeTab === tab.id ? 600 : 400,
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #260559" : "2px solid transparent",
                cursor: "pointer",
                paddingBottom: "10px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Status banner (voided / declined) ──────────────────────────────── */}
      {banner && (
        <div
          className="flex-shrink-0 flex items-start gap-3 px-8 py-3 border-b"
          style={{ background: banner.bg, borderColor: banner.border }}
        >
          <Warning size={16} weight="fill" style={{ color: banner.text, flexShrink: 0, marginTop: "1px" }} />
          <p className="text-sm" style={{ color: banner.text, fontFamily: DS_FONT }}>
            {banner.message}
          </p>
        </div>
      )}

      {/* ── Two-column body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left column — tab content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 min-w-0">
          {activeTab === "recipients" && (
            <RecipientList
              recipients={envelope.recipients}
              envelopeStatus={envelope.status}
              onCopySigningLink={(url) =>
                copyToClipboard(url, "Signing link copied to clipboard")
              }
            />
          )}

          {activeTab === "comments" && (
            <div className="max-w-xl flex flex-col gap-4">
              {/* Comment list */}
              {comments.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 gap-3"
                  style={{ color: COLOR_MUTED }}
                >
                  <ChatTeardrop size={32} weight="light" />
                  <p className="text-sm">No comments yet. Be the first to comment.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border"
                      style={{ borderColor: COLOR_BORDER, background: "rgba(19,0,50,0.02)" }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: COLOR_ACCENT }}
                          >
                            {(c.author_name ?? c.author_email ?? "?")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium" style={{ color: COLOR_PRIMARY }}>
                            {c.author_name ?? c.author_email ?? "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: COLOR_MUTED }}>
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                          {/* Delete button — only visible for the comment's author (matched by user_id) */}
                          {currentUser?.id === c.user_id && (
                            <button
                              onClick={() => deleteCommentMutation.mutate(c.id)}
                              disabled={deleteCommentMutation.isPending}
                              title="Delete comment"
                              className="flex items-center justify-center w-5 h-5 rounded transition-colors opacity-40 hover:opacity-100"
                              style={{ color: "#D93025" }}
                            >
                              <Trash size={13} weight="bold" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm pl-8 whitespace-pre-wrap" style={{ color: COLOR_SECONDARY }}>
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* New comment input — hidden when allow_comments is explicitly false */}
              {envelope.allow_comments === false ? (
                <div
                  className="flex items-center gap-2 px-3 py-3 rounded-lg border text-sm"
                  style={{ borderColor: COLOR_BORDER, color: COLOR_MUTED, background: "rgba(19,0,50,0.02)" }}
                >
                  <ChatTeardrop size={16} weight="light" />
                  Comments are disabled for this envelope.
                </div>
              ) : (
                <div
                  className="border rounded-lg overflow-hidden"
                  style={{ borderColor: COLOR_BORDER }}
                >
                  <textarea
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment…"
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ color: COLOR_PRIMARY, fontFamily: DS_FONT, border: "none" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && commentText.trim()) {
                        postCommentMutation.mutate();
                      }
                    }}
                  />
                  <div
                    className="flex items-center justify-between px-3 py-2 border-t"
                    style={{ borderColor: COLOR_BORDER, background: "rgba(19,0,50,0.02)" }}
                  >
                    <span className="text-xs" style={{ color: COLOR_MUTED }}>
                      Ctrl+Enter to submit
                    </span>
                    <button
                      onClick={() => commentText.trim() && postCommentMutation.mutate()}
                      disabled={!commentText.trim() || postCommentMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white transition-all disabled:opacity-40"
                      style={{ background: COLOR_ACCENT }}
                      onMouseEnter={(e) => { if (commentText.trim()) e.currentTarget.style.background = "#3700cc"; }}
                      onMouseLeave={(e) => (e.currentTarget.style.background = COLOR_ACCENT)}
                    >
                      {postCommentMutation.isPending ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ChatTeardrop size={12} weight="bold" />
                      )}
                      Comment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "details" && (
            <div className="max-w-xl">
              <div className="grid grid-cols-1">
                {[
                  { label: "Envelope Name", value: envelope.subject },
                  {
                    label: "Envelope ID",
                    value: envelope.id,
                    mono: true,
                    action: copyId,
                    actionLabel: copied ? "Copied!" : "Copy",
                  },
                  {
                    label: "From",
                    value: `${envelope.from || envelope.fromEmail || "—"}${envelope.fromEmail && envelope.from ? ` (${envelope.fromEmail})` : ""}`,
                  },
                  { label: "Sent Date",    value: formatDateLong(envelope.sentAt) },
                  { label: "Last Changed", value: formatDateLong(envelope.lastModified) },
                  {
                    label: "Completed Date",
                    value: envelope.completedAt ? formatDateLong(envelope.completedAt) : "—",
                  },
                  {
                    label: "Expires",
                    value: envelope.expiresAt ? formatDateLong(envelope.expiresAt) : "Never",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="py-3 border-b last:border-0 flex items-start justify-between gap-4"
                    style={{ borderColor: "rgba(19,0,50,0.06)" }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-wider w-40 flex-shrink-0 pt-0.5"
                      style={{ color: COLOR_MUTED, fontFamily: DS_FONT }}
                    >
                      {item.label}
                    </p>
                    <div className="flex-1 flex items-center gap-2">
                      <p
                        className={item.mono ? "font-mono text-xs break-all" : "text-sm"}
                        style={{ color: COLOR_PRIMARY }}
                      >
                        {item.value}
                      </p>
                      {item.action && (
                        <button
                          onClick={item.action}
                          className="text-xs flex-shrink-0 hover:underline"
                          style={{ color: COLOR_ACCENT, fontFamily: DS_FONT }}
                        >
                          {item.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — Documents sidebar */}
        <DocumentPanel documents={envelope.documents} envelopeId={envelope.id} envelopeStatus={envelope.status} />
      </div>

      {/* ── Void confirmation dialog ─────────────────────────────────────────── */}
      {showVoidConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoidConfirm(false)}
          />
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            style={{ fontFamily: DS_FONT }}
          >
            <h2 className="text-lg mb-1" style={{ color: COLOR_PRIMARY, fontWeight: 500 }}>
              Void Envelope
            </h2>
            <p className="text-sm mb-4" style={{ color: COLOR_SECONDARY }}>
              Are you sure you want to void this envelope? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: COLOR_MUTED }}
              >
                Reason (optional)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for voiding…"
                className="w-full px-3 py-2.5 rounded text-sm outline-none resize-none border transition-colors"
                style={{ borderColor: COLOR_BORDER, color: COLOR_PRIMARY, fontFamily: DS_FONT }}
                onFocus={(e) => (e.target.style.borderColor = "#260559")}
                onBlur={(e)  => (e.target.style.borderColor = COLOR_BORDER)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowVoidConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={voidMutation.isPending}
                onClick={() => voidMutation.mutate()}
              >
                Void Envelope
              </Button>
            </div>
            {voidMutation.isError && (
              <p className="mt-3 text-xs" style={{ color: "#D93025" }}>
                Failed to void envelope. Please try again.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Delete confirmation dialog ───────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            style={{ fontFamily: DS_FONT }}
          >
            <h2 className="text-lg mb-1" style={{ color: COLOR_PRIMARY, fontWeight: 500 }}>
              Delete Envelope
            </h2>
            <p className="text-sm mb-6" style={{ color: COLOR_SECONDARY }}>
              {envelope.status === "draft"
                ? "This envelope will be permanently deleted. This action cannot be undone."
                : "This envelope will be moved to the Deleted folder. You can restore it later from the Deleted view."}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                Delete
              </Button>
            </div>
            {deleteMutation.isError && (
              <p className="mt-3 text-xs" style={{ color: "#D93025" }}>
                Failed to delete envelope. Please try again.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Save as Template dialog ─────────────────────────────────────────── */}
      {showSaveTemplateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSaveTemplateDialog(false)}
          />
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            style={{ fontFamily: DS_FONT }}
          >
            <h2 className="text-lg mb-1" style={{ color: COLOR_PRIMARY, fontWeight: 500 }}>
              Save as Template
            </h2>
            <p className="text-sm mb-4" style={{ color: COLOR_SECONDARY }}>
              Give your template a name. The documents, recipients, and fields from this envelope will be saved.
            </p>
            <div className="mb-4">
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: COLOR_MUTED }}
              >
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name…"
                className="w-full px-3 py-2.5 rounded text-sm outline-none border transition-colors"
                style={{ borderColor: COLOR_BORDER, color: COLOR_PRIMARY, fontFamily: DS_FONT }}
                onFocus={(e) => (e.target.style.borderColor = "#260559")}
                onBlur={(e) => (e.target.style.borderColor = COLOR_BORDER)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveTemplateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={saveAsTemplateMutation.isPending}
                onClick={() => saveAsTemplateMutation.mutate()}
                style={{ background: COLOR_ACCENT, color: "#fff", border: "none" }}
              >
                Save Template
              </Button>
            </div>
            {saveAsTemplateMutation.isError && (
              <p className="mt-3 text-xs" style={{ color: "#D93025" }}>
                Failed to save template. Please try again.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Toast notifications ──────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
