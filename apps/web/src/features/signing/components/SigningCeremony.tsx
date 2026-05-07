"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { completeSigning, declineSigning, submitFieldValue } from "@/features/signing/api";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { SignatureCapture } from "./SignatureCapture";
import { FieldNavigator } from "./FieldNavigator";
import { DeclineDialog } from "./DeclineDialog";
import { ConsentGate } from "./ConsentGate";
import { SigningField } from "./SigningField";
import type { Envelope } from "@/features/envelopes/types";
import type { PlacedField, FieldType } from "@/features/editor/model/types";
import { createField, updateField, deleteField } from "@/features/editor/api";
import { useAuthStore } from "@/features/auth/store";
import {
  Check,
  CheckCircle,
  X as PhosphorX,
  CaretDown,
  DotsThreeVertical,
  MagnifyingGlass,
  FileText,
  ChatText,
  DownloadSimple,
  Printer,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Signature as SignatureIcon,
  PenNib,
  CalendarBlank,
  User,
  EnvelopeSimple,
  Buildings,
  TextT,
  CheckSquare,
  Stamp as StampIcon,
} from "@phosphor-icons/react";

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;

// Sidebar panel types
type ActivePanel = "search" | "viewPages" | "comment" | "download" | null;

interface SigningCommentDot {
  id: string;
  x: number;
  y: number;
  pageNum: number;
  text: string;
  authorName?: string;
}

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SidebarButton({ icon, label, isActive, onClick }: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 48,
        height: 48,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        borderRadius: 8,
        border: "none",
        background: isActive ? "#F0EEFF" : "transparent",
        cursor: "pointer",
        padding: 0,
        transition: "background 0.15s",
      }}
    >
      <span style={{ color: isActive ? "#4C00FF" : "rgba(19,0,50,0.55)", display: "flex" }}>
        {icon}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 500,
          color: isActive ? "#4C00FF" : "rgba(19,0,50,0.55)",
          lineHeight: 1,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </span>
    </button>
  );
}

interface SidePanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function SidePanel({ title, onClose, children }: SidePanelProps) {
  return (
    <div
      style={{
        width: 280,
        background: "white",
        borderLeft: "1px solid rgba(19,0,50,0.12)",
        boxShadow: "-4px 0 16px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid rgba(19,0,50,0.10)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#130032" }}>{title}</span>
        <button
          onClick={onClose}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(19,0,50,0.45)",
          }}
        >
          <PhosphorX size={14} weight="bold" />
        </button>
      </div>
      {/* Panel content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>{children}</div>
    </div>
  );
}

// ─── Completion Modal ─────────────────────────────────────────────────────────

interface CompletionModalProps {
  envelope: Envelope;
  token: string;
  firstDocId: string | null;
  onSignAnother: () => void;
  onNoThanks: () => void;
}

function CompletionModal({ envelope, token, firstDocId, onSignAnother, onNoThanks }: CompletionModalProps) {
  const senderName = envelope.from || envelope.fromEmail || "Unknown Sender";
  const sentOn = new Date().toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  });

  const expiresAt = (envelope as unknown as Record<string, unknown>).expiresAt as string | undefined;
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const isNearExpiry = expiresDate
    ? (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 7
    : false;
  const expiresDisplay = expiresDate
    ? expiresDate.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })
    : "No expiry";

  const docName = envelope.documents?.[0]?.name ?? envelope.subject;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#E8E8E8" }}
        >
          <h2 className="text-base font-bold" style={{ color: "#1B0A3C" }}>
            You&rsquo;re Done! Want To Sign Another Document?
          </h2>
          <button
            onClick={onNoThanks}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <PhosphorX size={18} weight="bold" color="#6B6B6B" />
          </button>
        </div>

        {/* Body */}
        <div className="flex gap-5 px-6 py-5">
          {/* PDF Thumbnail */}
          <div
            className="flex-shrink-0 rounded overflow-hidden border"
            style={{ width: 90, height: 117, borderColor: "#E0E0E0", background: "#F5F5F5" }}
          >
            {firstDocId ? (
              <img
                src={`/api/signing/documents/${firstDocId}/pages/1?token=${token}`}
                alt="Document preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="#CCC" width="32" height="32">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                </svg>
              </div>
            )}
          </div>

          {/* Document info */}
          <div className="flex-1 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9B9B9B" }}>
                Complete with DocuSign Clone
              </p>
              <p className="font-semibold mt-0.5 truncate" style={{ color: "#1B0A3C" }}>
                {docName}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9B9B9B" }}>
                From
              </p>
              <p className="font-medium mt-0.5" style={{ color: "#1B0A3C" }}>{senderName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9B9B9B" }}>
                Expires On
              </p>
              <p className="font-medium mt-0.5" style={{ color: isNearExpiry ? "#D93025" : "#1B0A3C" }}>
                {expiresDisplay}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9B9B9B" }}>
                Sent On
              </p>
              <p className="font-medium mt-0.5" style={{ color: "#1B0A3C" }}>{sentOn}</p>
            </div>
            {envelope.message && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9B9B9B" }}>
                  Message
                </p>
                <p className="mt-0.5 text-gray-600 leading-relaxed">{envelope.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: "#E8E8E8" }}
        >
          <button
            onClick={onSignAnother}
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-black transition-all hover:brightness-95"
            style={{ background: "#F5A623" }}
          >
            SIGN
          </button>
          <button
            onClick={onNoThanks}
            className="text-sm font-semibold underline transition-colors hover:text-gray-700"
            style={{ color: "#6B6B6B" }}
          >
            NO THANKS
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

interface ShareModalProps {
  docName: string;
  onClose: () => void;
  onSent?: () => void;
}

function ShareModal({ docName, onClose, onSent }: ShareModalProps) {
  const router = useRouter();
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [subject, setSubject] = useState(`Here is your signed document: ${docName}`);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const addEmail = useCallback(() => {
    const trimmed = emailInput.trim();
    if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !emails.includes(trimmed)) {
      setEmails((prev) => [...prev, trimmed]);
      setEmailInput("");
    }
  }, [emailInput, emails]);

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const removeEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSend = () => {
    setSent(true);
    onSent?.();
    setTimeout(() => router.push("/agreements"), 500);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden relative">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#E8E8E8" }}
        >
          <h2 className="text-base font-bold" style={{ color: "#1B0A3C" }}>
            Share your signed document
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <PhosphorX size={18} weight="bold" color="#6B6B6B" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Send to multiple recipients by pressing Enter after each email. Each recipient will
            receive an email to download the document for free.
          </p>

          {/* Email field */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1B0A3C" }}>
              Email <span className="text-red-500">*</span>
            </label>
            <div
              className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[42px] focus-within:ring-2 ring-purple-300 transition-all"
              style={{ borderColor: "#E0E0E0" }}
            >
              {emails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: "#EDE9F8", color: "#1B0A3C" }}
                >
                  {email}
                  <button onClick={() => removeEmail(email)} className="hover:opacity-70">
                    <PhosphorX size={11} weight="bold" />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                onBlur={addEmail}
                placeholder={emails.length === 0 ? "Enter email address" : ""}
                className="flex-1 min-w-[140px] text-sm outline-none bg-transparent placeholder-gray-400"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1B0A3C" }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-all focus:ring-2 ring-purple-300"
              style={{ borderColor: "#E0E0E0" }}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1B0A3C" }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => { if (e.target.value.length <= 250) setMessage(e.target.value); }}
              placeholder="Messages are optional"
              rows={3}
              className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none resize-none transition-all focus:ring-2 ring-purple-300"
              style={{ borderColor: "#E0E0E0" }}
            />
            <p className="text-xs text-right mt-1" style={{ color: "#9B9B9B" }}>
              {message.length}/250
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "#E8E8E8" }}
        >
          <button
            onClick={onClose}
            className="text-sm font-semibold transition-colors hover:text-gray-700"
            style={{ color: "#6B6B6B" }}
          >
            No Thanks
          </button>
          <button
            onClick={handleSend}
            disabled={emails.length === 0 || sent}
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: sent ? "#00B851" : emails.length > 0 ? "#4C00FF" : "#9CA3AF" }}
          >
            {sent ? "Sent!" : "Send"}
          </button>
        </div>

        {/* Success toast */}
        {sent && (
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold text-white whitespace-nowrap"
            style={{ background: "#00B851" }}
          >
            <CheckCircle size={16} weight="fill" />
            Document shared successfully
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Signing Comment Dot Overlay ─────────────────────────────────────────────

function SigningCommentDotOverlay({ dot, onDelete }: { dot: SigningCommentDot; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = dot.authorName
    ? dot.authorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div
      style={{ position: "absolute", left: `${dot.x}%`, top: `${dot.y}%`, transform: "translate(-50%, -50%)", pointerEvents: "auto", zIndex: 40 }}
      ref={cardRef}
    >
      <div
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          width: 12, height: 12, borderRadius: "50%", background: "#9B8FD8",
          boxShadow: "0 0 0 3px rgba(155,143,216,0.3)", cursor: "pointer",
          transform: open ? "scale(1.3)" : "scale(1)", transition: "transform 0.15s",
        }}
      />
      {open && (
        <div
          style={{ position: "absolute", top: -10, left: 20, width: 260, background: "white", borderRadius: 8, border: "1px solid rgba(19,0,50,0.12)", boxShadow: "0 8px 24px rgba(19,0,50,0.14)", padding: 14, zIndex: 50 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E8E0FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#4C00FF", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(19,0,50,0.9)", margin: 0 }}>{dot.authorName || "You"}</p>
            </div>
            <button
              onClick={() => { onDelete(dot.id); setOpen(false); }}
              style={{ fontSize: 16, color: "rgba(19,0,50,0.4)", background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
            >×</button>
          </div>
          <p style={{ fontSize: 13, color: "rgba(19,0,50,0.85)", margin: 0, lineHeight: 1.5, wordBreak: "break-word" }}>{dot.text}</p>
        </div>
      )}
    </div>
  );
}

// ─── Finish Split Button ──────────────────────────────────────────────────────

interface FinishSplitButtonProps {
  isComplete: boolean;
  isFinishing: boolean;
  onFinish: () => void;
  onFinishLater: () => void;
  onVoid: () => void;
}

function FinishSplitButton({ isComplete, isFinishing, onFinish, onFinishLater, onVoid }: FinishSplitButtonProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const btnBg = isComplete ? "#4C00FF" : "#7A6A8A";
  const btnColor = "white";

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      {/* Left: Finish */}
      <button
        onClick={onFinish}
        disabled={!isComplete || isFinishing}
        className="flex items-center gap-2 px-4 text-sm font-semibold transition-all rounded-l-md disabled:cursor-not-allowed"
        style={{ background: btnBg, color: btnColor, height: 36 }}
        title={isComplete ? "Submit signing" : "Complete all required fields first"}
      >
        {isFinishing ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Finishing...
          </>
        ) : (
          "Finish"
        )}
      </button>

      {/* Divider line */}
      <div
        className="w-px self-stretch"
        style={{ background: isComplete ? "rgba(27,0,53,0.30)" : "rgba(255,255,255,0.2)" }}
      />

      {/* Right: Caret dropdown trigger */}
      <button
        onClick={() => setDropdownOpen((o) => !o)}
        className="flex items-center justify-center rounded-r-md transition-all"
        style={{ background: btnBg, color: btnColor, height: 36, width: 28 }}
        aria-label="More finish options"
      >
        <CaretDown size={12} weight="bold" />
      </button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div
          className="absolute top-full right-0 mt-1.5 w-44 rounded-lg shadow-xl border overflow-hidden z-50"
          style={{ background: "white", borderColor: "#E0E0E0" }}
        >
          <div
            className="px-3 py-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "#9B9B9B" }}
          >
            Other Actions
          </div>
          <div className="h-px mx-3" style={{ background: "#F0F0F0" }} />
          <button
            onClick={() => { setDropdownOpen(false); onFinishLater(); }}
            className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ color: "#1B0A3C" }}
          >
            Finish Later
          </button>
          <button
            onClick={() => { setDropdownOpen(false); onVoid(); }}
            className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-red-50"
            style={{ color: "#D93025" }}
          >
            Void
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Kebab Menu ───────────────────────────────────────────────────────────────

interface KebabMenuProps {
  onDecline: () => void;
  onShare?: () => void;
}

function KebabMenu({ onDecline, onShare }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:bg-white/10"
        aria-label="More options"
      >
        <DotsThreeVertical size={18} weight="bold" color="white" />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 w-44 rounded-lg shadow-xl border overflow-hidden z-50"
          style={{ background: "white", borderColor: "#E0E0E0" }}
        >
          {onShare && (
            <button
              onClick={() => { setOpen(false); onShare(); }}
              className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ color: "#1B0A3C" }}
            >
              Share Document
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onDecline(); }}
            className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-red-50"
            style={{ color: "#D93025" }}
          >
            Decline to Sign
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Fields Left Panel (Self-Signing) ────────────────────────────────────────

interface FieldPanelItem {
  type: FieldType;
  label: string;
  icon: React.ReactNode;
}

const FIELD_PANEL_SECTIONS: (FieldPanelItem | "divider")[][] = [
  [
    { type: "signature", label: "Signature", icon: <SignatureIcon size={16} weight="bold" /> },
    { type: "initial", label: "Initial", icon: <PenNib size={16} weight="bold" /> },
    { type: "stamp", label: "Stamp", icon: <StampIcon size={16} weight="bold" /> },
    { type: "date_signed", label: "Date Signed", icon: <CalendarBlank size={16} weight="bold" /> },
  ],
  [
    { type: "name", label: "Name", icon: <User size={16} weight="bold" /> },
    { type: "text", label: "First Name", icon: <User size={16} weight="bold" /> },
    { type: "text", label: "Last Name", icon: <User size={16} weight="bold" /> },
    { type: "email", label: "Email Address", icon: <EnvelopeSimple size={16} weight="bold" /> },
    { type: "company", label: "Company", icon: <Buildings size={16} weight="bold" /> },
    { type: "title", label: "Title", icon: <TextT size={16} weight="bold" /> },
  ],
  [
    { type: "text", label: "Text", icon: <TextT size={16} weight="bold" /> },
    { type: "checkbox", label: "Checkbox", icon: <CheckSquare size={16} weight="bold" /> },
  ],
];

interface FieldsLeftPanelProps {
  selectedType: string | null;
  selectedLabel: string | null;
  onSelect: (type: string, label: string) => void;
}

function FieldsLeftPanel({ selectedType, selectedLabel, onSelect }: FieldsLeftPanelProps) {
  return (
    <div
      style={{
        width: 240,
        background: "white",
        borderRight: "1px solid rgba(19,0,50,0.12)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "16px 16px 8px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "#130032",
          textTransform: "uppercase",
        }}
      >
        Fields
      </div>

      {FIELD_PANEL_SECTIONS.map((section, si) => (
        <div key={si}>
          {si > 0 && (
            <div style={{ height: 1, background: "rgba(19,0,50,0.08)", margin: "4px 16px" }} />
          )}
          {section.map((item) => {
            if (item === "divider") return null;
            const isSelected = selectedType === item.type && selectedLabel === item.label;
            return (
              <button
                key={`${item.type}-${item.label}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("fieldType", item.type);
                  e.dataTransfer.setData("fieldLabel", item.label);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onSelect(item.type, item.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 16px",
                  border: "none",
                  background: isSelected ? "#F0EEFF" : "transparent",
                  cursor: "grab",
                  textAlign: "left",
                  transition: "background 0.12s",
                  color: isSelected ? "#4C00FF" : "rgba(19,0,50,0.75)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#F8F7FC";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20 }}>
                  {item.icon}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Main Signing Ceremony ────────────────────────────────────────────────────

interface SigningCeremonyProps {
  token: string;
  envelope: Envelope;
  recipientId: string;
  fields: PlacedField[];
  /** The access code the signer already verified */
  accessCode?: string;
  isSelfSign?: boolean;
  /** True only when sender == signer. Controls share modal — recipients skip it since backend notifies owner. */
  isActuallySelfSign?: boolean;
}

type SigningStatus = "signing" | "completed" | "declined";

export function SigningCeremony({ token, envelope, recipientId, fields, accessCode, isSelfSign, isActuallySelfSign }: SigningCeremonyProps) {
  const { toasts, addToast, dismissToast } = useToast();
  const [status, setStatus] = useState<SigningStatus>("signing");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) {
      if (f.value) initial[f.id] = f.value;
    }
    return initial;
  });
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"signature" | "initial">("signature");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [currentNavIndex, setCurrentNavIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Modal / completion state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const completionUser = useAuthStore((s) => s.user);
  const [completionCountdown, setCompletionCountdown] = useState(5);
  const [showShareModal, setShowShareModal] = useState(false);
  const [completedDismissed, setCompletedDismissed] = useState(false);

  // Sidebar state
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [zoom, setZoom] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [commentMode, setCommentMode] = useState(false);
  const [commentDots, setCommentDots] = useState<SigningCommentDot[]>([]);
  const [commentPopover, setCommentPopover] = useState<{ xPx: number; yPx: number; xPct: number; yPct: number; page: number } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Self-sign field placement state
  const [localFields, setLocalFields] = useState<PlacedField[]>([]);
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [selectedFieldLabel, setSelectedFieldLabel] = useState<string | null>(null);
  const [showFieldPrompt, setShowFieldPrompt] = useState(fields.length === 0);

  const documentRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());


  // Combine server fields + locally placed fields
  const allFields = [...fields, ...localFields];
  const myFields = allFields.filter((f) => f.recipientId === recipientId);

  /**
   * Determine whether a field is currently visible given the conditional logic rules.
   * A field is visible when:
   *  - it has no conditionalOn set, OR
   *  - action is "show" and the parent's value matches conditionalValue, OR
   *  - action is "hide" and the parent's value does NOT match conditionalValue
   */
  const isFieldVisible = (f: PlacedField): boolean => {
    if (!f.conditionalOn) return true;
    const parentValue = fieldValues[f.conditionalOn] ?? "";
    const expectedValue = f.conditionalValue ?? "checked";
    const action = f.conditionalAction ?? "show";
    const conditionMet = parentValue === expectedValue;
    if (action === "show") return conditionMet;
    if (action === "hide") return !conditionMet;
    return true;
  };

  const completedCount = myFields.filter((f) => !!fieldValues[f.id]).length;
  // Only required fields that are currently visible must be filled to enable Finish.
  const myRequiredFields = myFields.filter((f) => f.required && isFieldVisible(f));
  const requiredCompletedCount = myRequiredFields.filter((f) => !!fieldValues[f.id]).length;
  const allLocalFieldsFilled = localFields.length === 0 || localFields.every((f) => !f.required || !isFieldVisible(f) || !!fieldValues[f.id]);
  const isComplete = myRequiredFields.length > 0
    ? requiredCompletedCount >= myRequiredFields.length
    : allLocalFieldsFilled;

  useEffect(() => {
    if (status !== "completed" || !completionUser) return;
    if (completionCountdown <= 0) {
      window.location.href = "/agreements";
      return;
    }
    const t = setTimeout(() => setCompletionCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, completionUser, completionCountdown]);

  const scrollToField = useCallback((fieldId: string) => {
    const fieldEl = fieldRefs.current.get(fieldId);
    if (fieldEl) {
      fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setActiveFieldId(fieldId);
  }, []);

  const handleNext = useCallback(() => {
    const currentField = myFields[currentNavIndex];
    if (currentField && !fieldValues[currentField.id]) {
      if (currentField.type === "signature" || currentField.type === "initial") {
        // Open signature capture for unfilled signature/initial fields
        setActiveFieldId(currentField.id);
        setSignatureMode(currentField.type === "initial" ? "initial" : "signature");
        setSignatureOpen(true);
        scrollToField(currentField.id);
        return;
      } else if (currentField.type === "date_signed") {
        // Auto-fill date_signed and fall through to advance
        const date = new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        setFieldValues((prev) => ({ ...prev, [currentField.id]: date }));
      } else if (currentField.required) {
        // For required text/checkbox/etc. fields that are empty, scroll into view
        // so the user can fill it before advancing.
        scrollToField(currentField.id);
        return;
      }
    }
    if (currentNavIndex < myFields.length - 1) {
      const nextIdx = currentNavIndex + 1;
      setCurrentNavIndex(nextIdx);
      scrollToField(myFields[nextIdx].id);
    }
  }, [currentNavIndex, myFields, fieldValues, scrollToField]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      const fieldSnapshot = [...allFields];
      const MAX_RETRIES = 3;
      const failures: string[] = [];

      // Only submit fields that belong to this recipient — pre-filled values
      // from other recipients are stored in fieldValues but must not be sent
      // (the backend enforces recipient ownership and returns 404 otherwise).
      const myFieldIds = new Set(myFields.map((f) => f.id));

      for (const [fieldId, value] of Object.entries(fieldValues)) {
        if (!myFieldIds.has(fieldId)) continue;
        let saved = false;
        for (let attempt = 0; attempt < MAX_RETRIES && !saved; attempt++) {
          try {
            await submitFieldValue(token, fieldId, value);
            saved = true;
          } catch (err) {
            if (attempt === MAX_RETRIES - 1) {
              const field = fieldSnapshot.find((f) => f.id === fieldId);
              const ft = field?.type ?? "unknown";
              if (ft === "signature" || ft === "initial") {
                throw new Error(`Failed to save ${ft} after ${MAX_RETRIES} attempts.`);
              }
              failures.push(fieldId);
            }
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }
        }
      }
      if (failures.length > 0) {
        throw new Error(`Failed to save ${failures.length} field(s) after retries.`);
      }
      return completeSigning(token, accessCode);
    },
    onSuccess: (data) => {
      if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
      setStatus("completed");
      setCompletedDismissed(true);
      setShowCompletionModal(true);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong. Please try again.";
      addToast(`Could not complete signing: ${message}`, "error");
    },
  });

  const declineMutation = useMutation({
    mutationFn: (reason: string) => declineSigning(token, reason),
    onSuccess: () => {
      setDeclineOpen(false);
      window.location.href = "/agreements";
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong. Please try again.";
      addToast(`Could not decline: ${message}`, "error");
    },
  });

  const handleSignatureRequest = useCallback((fieldId: string, mode: "signature" | "initial") => {
    setActiveFieldId(fieldId);
    setSignatureMode(mode);
    setSignatureOpen(true);
  }, []);

  const handleAdoptSignature = useCallback((dataUrl: string) => {
    if (activeFieldId) {
      setFieldValues((prev) => ({ ...prev, [activeFieldId]: dataUrl }));
      if (hasStarted) {
        const fieldIdx = myFields.findIndex((f) => f.id === activeFieldId);
        if (fieldIdx >= 0 && fieldIdx < myFields.length - 1) {
          const nextIdx = fieldIdx + 1;
          setCurrentNavIndex(nextIdx);
          setTimeout(() => scrollToField(myFields[nextIdx].id), 300);
        }
      }
    }
    setSignatureOpen(false);
  }, [activeFieldId, hasStarted, myFields, scrollToField]);

  const handleStart = useCallback(() => {
    setHasStarted(true);
    if (myFields.length > 0) {
      scrollToField(myFields[0].id);
      setCurrentNavIndex(0);
    }
  }, [myFields, scrollToField]);

  const handleFinishLater = useCallback(() => {
    window.close();
    // Fallback if window.close() is blocked (not opened via script)
    window.location.href = "/";
  }, []);

  const handleCompletionModalClose = useCallback(() => {
    setShowCompletionModal(false);
    window.location.href = "/agreements";
  }, []);

  const handleSignAnother = useCallback(() => {
    setShowCompletionModal(false);
    window.location.href = "/agreements";
  }, []);

  // Toggle panel: clicking active panel closes it
  const togglePanel = useCallback((panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    // Entering comment mode via sidebar button
    if (panel === "comment") {
      setCommentMode((prev) => {
        if (prev) return false; // turn off comment mode if panel already active
        return true;
      });
    }
  }, []);

  // Zoom helpers
  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.0, parseFloat((z + 0.25).toFixed(2))));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))));
  }, []);

  // Download combined PDF — submit current field values first so they appear in PDF
  const handleDownloadCombined = useCallback(async () => {
    let failed = 0;
    for (const [fieldId, value] of Object.entries(fieldValues)) {
      try { await submitFieldValue(token, fieldId, value); } catch { failed++; }
    }
    if (failed > 0) {
      addToast(`Warning: ${failed} field(s) could not be saved. The downloaded PDF may be missing some values.`, "error");
    }
    window.open(`/api/envelopes/${envelope.id}/download`, '_blank');
  }, [envelope.id, fieldValues, token]);

  const senderName = envelope.from || envelope.fromEmail || "the sender";
  const recipientInfo = envelope.recipients.find((r) => r.id === recipientId);
  const recipientName = recipientInfo?.name ?? "Recipient";
  const recipientRole = (recipientInfo?.role as string)?.toLowerCase() ?? "signer";
  const isCcOrViewer = recipientRole === "cc" || recipientRole === "viewer";

  // Build per-document page info (moved up so handlePlaceField can use documents)
  const documents = envelope.documents ?? [];
  const firstDocId = documents[0]?.id ?? null;
  const pageCount = Math.max(1, documents[0]?.pageCount ?? 1);

  // Self-sign: place a field on the document
  const handlePlaceField = useCallback(async (pageNum: number, xPercent: number, yPercent: number, overrideType?: string, overrideLabel?: string) => {
    const fieldType = overrideType ?? selectedFieldType;
    const fieldLabel = overrideLabel ?? selectedFieldLabel;
    if (!fieldType) return;
    const docId = documents[0]?.id;
    if (!docId) return;

    const sizes: Record<string, { width: number; height: number }> = {
      signature: { width: 20, height: 4 },
      initial: { width: 8, height: 3 },
      stamp: { width: 15, height: 8 },
      date_signed: { width: 15, height: 3 },
      name: { width: 20, height: 3 },
      email: { width: 20, height: 3 },
      company: { width: 20, height: 3 },
      title: { width: 20, height: 3 },
      text: { width: 20, height: 3 },
      checkbox: { width: 3, height: 3 },
    };
    const size = sizes[fieldType] ?? { width: 20, height: 3 };

    const newField: Omit<PlacedField, "id"> = {
      type: fieldType as FieldType,
      recipientId,
      documentId: docId,
      page: pageNum,
      x: xPercent,
      y: yPercent,
      width: size.width,
      height: size.height,
      required: true,
      label: fieldLabel ?? undefined,
    };

    try {
      const created = await createField(docId, newField);
      const placedField: PlacedField = { ...newField, id: created.id };
      setLocalFields((prev) => [...prev, placedField]);

      if (fieldType === "date_signed") {
        const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        setFieldValues((prev) => ({ ...prev, [created.id]: date }));
      } else if (fieldType === "name") {
        setFieldValues((prev) => ({ ...prev, [created.id]: recipientName }));
      } else if (fieldType === "email") {
        setFieldValues((prev) => ({ ...prev, [created.id]: recipientInfo?.email ?? "" }));
      } else if (fieldType === "company") {
        setFieldValues((prev) => ({ ...prev, [created.id]: "" }));
      } else if (fieldType === "title") {
        setFieldValues((prev) => ({ ...prev, [created.id]: "" }));
      } else if (fieldType === "text" && fieldLabel === "First Name") {
        const parts = recipientName.split(" ");
        setFieldValues((prev) => ({ ...prev, [created.id]: parts[0] ?? "" }));
      } else if (fieldType === "text" && fieldLabel === "Last Name") {
        const parts = recipientName.split(" ");
        setFieldValues((prev) => ({ ...prev, [created.id]: parts.slice(1).join(" ") || "" }));
      } else if (fieldType === "signature" || fieldType === "initial") {
        setActiveFieldId(created.id);
        setSignatureMode(fieldType === "initial" ? "initial" : "signature");
        setSignatureOpen(true);
      }
    } catch {
      addToast("Could not place field. Please try again.", "error");
    }

    setSelectedFieldType(null);
    setSelectedFieldLabel(null);
  }, [selectedFieldType, selectedFieldLabel, documents, recipientId, recipientName, recipientInfo]);

  // Completed pages (pages that have all their required fields filled)
  const completedPages = new Set<number>();
  for (let p = 1; p <= pageCount; p++) {
    const pageRequiredFields = myFields.filter((f) => f.page === p);
    if (pageRequiredFields.length > 0 && pageRequiredFields.every((f) => !!fieldValues[f.id])) {
      completedPages.add(p);
    }
  }

  // COMPLETED state
  if (status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F5F7" }}>
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, #1B0A3C, #00B851)" }}
          >
            <Check size={36} weight="bold" color="white" />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: "#1B0A3C" }}>
            You&rsquo;re All Done!
          </h1>
          <p className="text-gray-600 mb-2 leading-relaxed">
            Your signature has been successfully applied to{" "}
            <strong>&ldquo;{envelope.subject}&rdquo;</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            {senderName} will be notified and a copy will be sent to {recipientInfo?.email ?? "you"}.
          </p>
          <div className="space-y-3">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ background: "#1B0A3C" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Download Signed Document
              </a>
            )}
            {completionUser ? (
              <a
                href="/agreements"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border transition-colors no-underline"
                style={{ borderColor: "#1B0A3C", color: "#1B0A3C" }}
              >
                Go to Agreements
                <span className="text-xs opacity-50 ml-1">({completionCountdown}s)</span>
              </a>
            ) : (
              <div className="w-full py-3 rounded-xl text-sm text-gray-500 border text-center" style={{ borderColor: "#E0E0E0" }}>
                You can safely close this tab
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Powered by <span className="font-bold" style={{ color: "#1B0A3C" }}>DocuSign Clone</span>
          </p>
        </div>
      </div>
    );
  }

  // DECLINED state
  if (status === "declined") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFF5F5" }}>
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "#FFEBEE" }}
          >
            <PhosphorX size={36} weight="bold" color="#D93025" />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: "#1B0A3C" }}>
            Signing Declined
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            You have declined to sign <strong>&ldquo;{envelope.subject}&rdquo;</strong>. The sender
            has been notified.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white no-underline"
            style={{ background: "#1B0A3C" }}
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Post-completion flag (modal dismissed → completed state stays on signing page)
  const isPostCompletion = completedDismissed;
  const bannerBg = "#1B0035";

  return (
    <>
    <div className="min-h-screen flex flex-col" style={{ background: "#F0EFF8" }}>

      {/* ── Dark banner header (DocuSign-style) ──────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ background: bannerBg, minHeight: 52 }}
      >
        {/* Left: instruction / completed message */}
        <div className="flex items-center gap-3 min-w-0">
          {isPostCompletion ? (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#00B851" }}
              >
                <Check size={13} weight="bold" color="white" />
              </div>
              <span className="text-sm font-semibold" style={{ color: "#A8E6C3" }}>
                Signing complete — document submitted successfully
              </span>
            </div>
          ) : isCcOrViewer ? (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.70)" }}>
              You have received a copy of this document
            </span>
          ) : (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.70)" }}>
              Click each field in the document to fill it in, then click Finish
            </span>
          )}
        </div>

        {/* Right: Finish split button + kebab */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPostCompletion ? (
            /* Green "Completed" pill replaces Finish button */
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold"
              style={{ background: "#00B851", color: "white" }}
            >
              <CheckCircle size={16} weight="fill" />
              Completed
            </div>
          ) : isCcOrViewer ? (
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold"
              style={{ background: "#6B7280", color: "white" }}
            >
              View Only
            </div>
          ) : (
            <FinishSplitButton
              isComplete={isComplete}
              isFinishing={completeMutation.isPending}
              onFinish={() => completeMutation.mutate()}
              onFinishLater={handleFinishLater}
              onVoid={() => setDeclineOpen(true)}
            />
          )}

          <KebabMenu
            onDecline={() => setDeclineOpen(true)}
            onShare={isPostCompletion ? () => setShowShareModal(true) : undefined}
          />
        </div>
      </div>

      {/* ── Sub-bar: brand + doc info + progress ──── */}
      {<div
        className="bg-white border-b flex-shrink-0 shadow-sm"
        style={{ borderColor: "#E0E0E0" }}
      >
        <div className="flex items-center justify-between px-6 py-2.5">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "#1B0A3C" }}
            >
              <svg viewBox="0 0 24 24" fill="white" width="13" height="13">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
              </svg>
            </div>
            <span className="font-bold text-xs" style={{ color: "#1B0A3C" }}>DocuSign</span>
          </div>

          {/* Center: Document info */}
          <div className="flex-1 text-center px-4">
            <p className="text-sm font-semibold truncate max-w-sm mx-auto" style={{ color: "#1B0A3C" }}>
              {envelope.subject}
            </p>
            <p className="text-xs text-gray-400">
              From {senderName} &middot; Signing as {recipientName}
            </p>
          </div>

          {/* Right: Download link when available */}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="flex items-center gap-1.5 text-xs font-semibold no-underline transition-opacity hover:opacity-70"
              style={{ color: "#1B0A3C" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              Download
            </a>
          )}
        </div>

        {/* Progress bar (hidden after completion and CC/viewer) */}
        {!isPostCompletion && !isCcOrViewer && (
          <div className="px-6 pb-2.5">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span className="font-medium">
                {requiredCompletedCount} of {myRequiredFields.length} required field{myRequiredFields.length !== 1 ? "s" : ""} completed
              </span>
              <span className="font-bold" style={{ color: isComplete ? "#00B851" : "#1B0A3C" }}>
                {myRequiredFields.length > 0
                  ? Math.round((requiredCompletedCount / myRequiredFields.length) * 100)
                  : isComplete ? 100 : 0}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${myRequiredFields.length > 0 ? (requiredCompletedCount / myRequiredFields.length) * 100 : isComplete ? 100 : 0}%`,
                  background: isComplete ? "#00B851" : "linear-gradient(90deg, #1B0A3C, #3D2A6B)",
                }}
              />
            </div>
          </div>
        )}
      </div>}

      {/* Main content: left panel + document area + right sidebar */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Left FIELDS panel — hidden for CC/viewer */}
        {!isCcOrViewer && (
          <FieldsLeftPanel
            selectedType={selectedFieldType}
            selectedLabel={selectedFieldLabel}
            onSelect={(type, label) => {
              if (selectedFieldType === type && selectedFieldLabel === label) {
                setSelectedFieldType(null);
                setSelectedFieldLabel(null);
              } else {
                setSelectedFieldType(type);
                setSelectedFieldLabel(label);
              }
            }}
          />
        )}

        {/* Document scroll area */}
        <div
          className="flex-1 overflow-auto py-6"
          ref={documentRef}
          style={{
            position: "relative",
            cursor: selectedFieldType ? "crosshair" : commentMode ? "crosshair" : "default",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();

            const target = e.target as HTMLElement;
            const pageEl = target.closest("[data-page]") as HTMLElement | null;
            if (!pageEl) return;
            const page = Number(pageEl.dataset.page);
            const pageInner = pageEl.querySelector("[data-page-inner]") as HTMLElement | null;
            const rect = (pageInner ?? pageEl).getBoundingClientRect();
            const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
            const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

            const droppedType = e.dataTransfer.getData("fieldType");
            const droppedLabel = e.dataTransfer.getData("fieldLabel");
            if (!droppedType) return;

            handlePlaceField(page, xPercent, yPercent, droppedType, droppedLabel);
          }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const pageEl = target.closest("[data-page]") as HTMLElement | null;
            if (!pageEl) return;
            const page = Number(pageEl.dataset.page);
            const pageInner = pageEl.querySelector("[data-page-inner]") as HTMLElement | null;
            const rect = (pageInner ?? pageEl).getBoundingClientRect();

            // Field placement mode
            if (selectedFieldType) {
              const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
              const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
              handlePlaceField(page, xPercent, yPercent);
              return;
            }

            // Comment mode
            if (commentMode) {
              const xPct = ((e.clientX - rect.left) / rect.width) * 100;
              const yPct = ((e.clientY - rect.top) / rect.height) * 100;
              setCommentPopover({ xPx: e.clientX - rect.left, yPx: e.clientY - rect.top, xPct, yPct, page });
            }
          }}
        >
          <div style={{ maxWidth: 780, margin: "0 auto 0 32px", paddingRight: 16 }}>
            {/* Self-sign field prompt — shown when there are no fields placed yet */}
            {showFieldPrompt && !isCcOrViewer && !isPostCompletion && allFields.length === 0 && (
              <div
                className="mb-4 px-5 py-4 rounded-xl flex items-start gap-3"
                style={{ background: "#FFF8E7", border: "1.5px solid #F59E0B" }}
              >
                <svg viewBox="0 0 24 24" fill="#F59E0B" width="20" height="20" className="flex-shrink-0 mt-0.5">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1" style={{ color: "#92400E" }}>
                    No signature fields yet
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
                    Select a field type from the left panel, then click anywhere on the document to place it. Start with a <strong>Signature</strong> field.
                  </p>
                </div>
                <button
                  onClick={() => setShowFieldPrompt(false)}
                  className="flex-shrink-0 text-amber-600 hover:text-amber-800 transition-colors"
                  aria-label="Dismiss"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            )}
            {/* Zoomed document wrapper */}
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.2s ease",
              }}
            >
              {Array.from({ length: pageCount }).map((_, idx) => {
                const pageNum = idx + 1;
                const pageFields = allFields.filter((f) => f.page === pageNum);

                return (
                  <div key={pageNum} className="mb-6" data-page={pageNum}>

                    <div
                      className="relative bg-white shadow-lg"
                      style={{
                        width: "100%",
                        paddingTop: `${(PAGE_HEIGHT / PAGE_WIDTH) * 100}%`,
                        borderRadius: "4px",
                        overflow: "hidden",
                        cursor: selectedFieldType || commentMode ? "crosshair" : "default",
                      }}
                    >
                      <div className="absolute inset-0" data-page-inner="true">
                        {firstDocId ? (
                          <img
                            src={`/api/signing/documents/${firstDocId}/pages/${pageNum}?token=${token}`}
                            alt={`Page ${pageNum}`}
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                            draggable={false}
                          />
                        ) : (
                          <div className="p-12 space-y-3 select-none pointer-events-none absolute inset-0">
                            <div className="text-center mb-10">
                              <div className="h-4 bg-gray-200 rounded-full w-60 mx-auto mb-3" />
                              <div className="h-2 bg-gray-100 rounded-full w-40 mx-auto mb-1" />
                              <div className="h-2 bg-gray-100 rounded-full w-52 mx-auto" />
                            </div>
                            {Array.from({ length: 14 }).map((_, i) => (
                              <div key={i} className="space-y-1.5">
                                <div className="h-2 bg-gray-100 rounded-full w-full" />
                                <div className="h-2 bg-gray-100 rounded-full w-11/12" />
                                <div className="h-2 bg-gray-100 rounded-full w-4/5" />
                              </div>
                            ))}
                            <div className="mt-12 h-px bg-gray-200 w-1/3 mx-auto" />
                            <div className="h-2 bg-gray-150 rounded-full w-28 mx-auto" />
                          </div>
                        )}

                        {/* Field overlays */}
                        {pageFields.map((field) => {
                          const isLocal = localFields.some((lf) => lf.id === field.id);
                          const isFieldSelected = activeFieldId === field.id;
                          return (
                            <div
                              key={field.id}
                              ref={(el) => {
                                if (el) fieldRefs.current.set(field.id, el);
                                else fieldRefs.current.delete(field.id);
                              }}
                              className={isLocal ? "group select-none" : undefined}
                              style={
                                isLocal
                                  ? {
                                      position: "absolute",
                                      left: `${field.x}%`,
                                      top: `${field.y}%`,
                                      width: `${field.width}%`,
                                      height: `${field.height}%`,
                                      zIndex: isFieldSelected ? 30 : 10,
                                      border: isFieldSelected
                                        ? "2px solid #4C00FF"
                                        : "1px solid rgba(76,0,255,0.35)",
                                      borderRadius: 3,
                                      cursor: "grab",
                                      background: `rgba(76,0,255,${isFieldSelected ? 0.06 : 0.03})`,
                                      boxShadow: isFieldSelected
                                        ? "0 0 0 3px rgba(76,0,255,0.15), 0 2px 8px rgba(0,0,0,0.12)"
                                        : "0 1px 3px rgba(0,0,0,0.06)",
                                    }
                                  : undefined
                              }
                              onClick={isLocal ? (e) => {
                                e.stopPropagation();
                                setActiveFieldId(field.id);
                                setSelectedFieldType(null);
                                setSelectedFieldLabel(null);
                              } : undefined}
                              onMouseDown={isLocal ? (e) => {
                                if ((e.target as HTMLElement).closest("[data-resize-handle]") || (e.target as HTMLElement).closest("[data-field-toolbar]")) return;
                                e.stopPropagation();
                                e.preventDefault();
                                setActiveFieldId(field.id);
                                setSelectedFieldType(null);
                                const pageInnerEl = (e.currentTarget as HTMLElement).closest("[data-page-inner]") as HTMLElement | null;
                                if (!pageInnerEl) return;
                                const pageRect = pageInnerEl.getBoundingClientRect();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const origX = field.x;
                                const origY = field.y;
                                let dragging = false;
                                let finalX = origX;
                                let finalY = origY;
                                (e.currentTarget as HTMLElement).style.cursor = "grabbing";
                                const onMove = (ev: MouseEvent) => {
                                  const dx = ev.clientX - startX;
                                  const dy = ev.clientY - startY;
                                  if (!dragging && Math.abs(dx) + Math.abs(dy) < 4) return;
                                  dragging = true;
                                  finalX = Math.max(0, Math.min(origX + (dx / pageRect.width) * 100, 100 - field.width));
                                  finalY = Math.max(0, Math.min(origY + (dy / pageRect.height) * 100, 100 - field.height));
                                  setLocalFields((prev) => prev.map((f) =>
                                    f.id === field.id ? { ...f, x: finalX, y: finalY } : f
                                  ));
                                };
                                const onUp = () => {
                                  document.removeEventListener("mousemove", onMove);
                                  document.removeEventListener("mouseup", onUp);
                                  const el = document.querySelector(`[data-field-id="${field.id}"]`);
                                  if (el) (el as HTMLElement).style.cursor = "grab";
                                  if (dragging) {
                                    updateField(field.id, { x: finalX, y: finalY }).catch(() => {});
                                  }
                                };
                                document.addEventListener("mousemove", onMove);
                                document.addEventListener("mouseup", onUp);
                              } : undefined}
                              data-field-id={field.id}
                            >
                              {/* Field content — pointer-events none so clicks go to wrapper */}
                              <div style={isLocal ? { pointerEvents: "none", width: "100%", height: "100%" } : undefined}>
                                <SigningField
                                  field={field}
                                  value={fieldValues[field.id]}
                                  isCurrentField={hasStarted && myFields[currentNavIndex]?.id === field.id}
                                  isForRecipient={field.recipientId === recipientId}
                                  onSignatureRequest={handleSignatureRequest}
                                  onValueChange={(fieldId, value) => setFieldValues((prev) => ({ ...prev, [fieldId]: value }))}
                                  allFieldValues={fieldValues}
                                  allFields={allFields}
                                  signingToken={token}
                                  inlinePositioned={isLocal}
                                />
                              </div>

                              {/* Label tag */}
                              {isLocal && (
                                <div
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ position: "absolute", top: -18, left: 0, background: "#4C00FF", color: "white", fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: "3px 3px 0 0", whiteSpace: "nowrap", pointerEvents: "none" }}
                                >
                                  {field.label || field.type}
                                </div>
                              )}

                              {/* Resize handles + toolbar — only when selected */}
                              {isLocal && isFieldSelected && (
                                <>
                                  {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                                    <div
                                      key={corner}
                                      data-resize-handle
                                      style={{
                                        position: "absolute", width: 8, height: 8, borderRadius: "50%",
                                        background: "white", border: "2px solid #4C00FF",
                                        cursor: `${corner}-resize`, zIndex: 40,
                                        ...(corner.includes("n") ? { top: -4 } : { bottom: -4 }),
                                        ...(corner.includes("w") ? { left: -4 } : { right: -4 }),
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation(); e.preventDefault();
                                        const sX = e.clientX, sY = e.clientY;
                                        const oW = field.width, oH = field.height, oX = field.x, oY = field.y;
                                        const pageInnerEl = (e.target as HTMLElement).closest("[data-page-inner]") as HTMLElement | null;
                                        if (!pageInnerEl) return;
                                        const pR = pageInnerEl.getBoundingClientRect();
                                        let fX = oX, fY = oY, fW = oW, fH = oH;
                                        const onMove = (ev: MouseEvent) => {
                                          const dx = ((ev.clientX - sX) / pR.width) * 100;
                                          const dy = ((ev.clientY - sY) / pR.height) * 100;
                                          fX = oX; fY = oY; fW = oW; fH = oH;
                                          if (corner.includes("e")) fW = Math.max(4, oW + dx);
                                          if (corner.includes("w")) { fW = Math.max(4, oW - dx); fX = oX + dx; }
                                          if (corner.includes("s")) fH = Math.max(2, oH + dy);
                                          if (corner.includes("n")) { fH = Math.max(2, oH - dy); fY = oY + dy; }
                                          setLocalFields((prev) => prev.map((f) => f.id === field.id ? { ...f, x: fX, y: fY, width: fW, height: fH } : f));
                                        };
                                        const onUp = () => {
                                          document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp);
                                          updateField(field.id, { x: fX, y: fY, width: fW, height: fH }).catch(() => {});
                                        };
                                        document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
                                      }}
                                    />
                                  ))}

                                  {/* Floating toolbar — ABOVE field */}
                                  <div
                                    data-field-toolbar
                                    style={{
                                      position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                                      background: "white", border: "1px solid rgba(19,0,50,0.18)", borderRadius: 6,
                                      boxShadow: "0 4px 16px rgba(19,0,50,0.14)",
                                      display: "flex", alignItems: "center", gap: 2, padding: "2px 4px", height: 34, zIndex: 50, whiteSpace: "nowrap",
                                      pointerEvents: "all",
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePlaceField(field.page, field.x + 3, field.y + 3, field.type, field.label); }}
                                      style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: 4, cursor: "pointer", color: "rgba(19,0,50,0.6)" }}
                                      title="Duplicate"
                                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F5F5")}
                                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                    <div style={{ width: 1, height: 16, background: "#D1D5DB" }} />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteField(field.id).catch(() => {});
                                        setLocalFields((prev) => prev.filter((f) => f.id !== field.id));
                                        setFieldValues((prev) => { const n = { ...prev }; delete n[field.id]; return n; });
                                        setActiveFieldId(null);
                                      }}
                                      style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: 4, cursor: "pointer", color: "#EF4444" }}
                                      title="Delete"
                                      onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
                                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}

                        {/* Comment popover */}
                        {commentPopover && commentPopover.page === pageNum && (
                          <div
                            style={{
                              position: "absolute",
                              left: commentPopover.xPx,
                              top: commentPopover.yPx,
                              zIndex: 50,
                              background: "white",
                              borderRadius: 10,
                              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                              border: "1px solid rgba(19,0,50,0.12)",
                              padding: 12,
                              minWidth: 220,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p style={{ fontSize: 11, fontWeight: 600, color: "#130032", marginBottom: 8 }}>
                              Add Comment
                            </p>
                            <textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Type your comment..."
                              style={{
                                width: "100%",
                                minHeight: 64,
                                border: "1px solid rgba(19,0,50,0.18)",
                                borderRadius: 6,
                                padding: "6px 8px",
                                fontSize: 12,
                                resize: "vertical",
                                outline: "none",
                                fontFamily: "inherit",
                              }}
                            />
                            <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                              <button
                                onClick={() => { setCommentPopover(null); setCommentText(""); }}
                                style={{
                                  fontSize: 11,
                                  padding: "4px 10px",
                                  borderRadius: 5,
                                  border: "1px solid rgba(19,0,50,0.18)",
                                  background: "transparent",
                                  cursor: "pointer",
                                  color: "#555",
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (commentText.trim() && commentPopover) {
                                    setCommentDots((prev) => [...prev, {
                                      id: Math.random().toString(36).slice(2),
                                      x: commentPopover.xPct,
                                      y: commentPopover.yPct,
                                      pageNum: commentPopover.page,
                                      text: commentText.trim(),
                                      authorName: recipientInfo?.name || "You",
                                    }]);
                                  }
                                  setCommentPopover(null);
                                  setCommentText("");
                                }}
                                style={{
                                  fontSize: 11,
                                  padding: "4px 10px",
                                  borderRadius: 5,
                                  border: "none",
                                  background: "#4C00FF",
                                  color: "white",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                Post
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Comment dots */}
                        {commentDots.filter((d) => d.pageNum === pageNum).map((dot) => (
                          <SigningCommentDotOverlay
                            key={dot.id}
                            dot={dot}
                            onDelete={(id) => setCommentDots((prev) => prev.filter((d) => d.id !== id))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom spacer for floating navigator */}
            <div className="h-24" />
          </div>
        </div>

        {/* Right sidebar area: optional panel + icon toolbar */}
        <div style={{ display: "flex", flexShrink: 0, height: "100%", overflow: "hidden" }}>
          {/* Slide-out panel */}
          {activePanel && activePanel !== "comment" && (
            <SidePanel
              title={
                activePanel === "search"
                  ? "Find"
                  : activePanel === "viewPages"
                  ? "Thumbnails"
                  : activePanel === "download"
                  ? "Download"
                  : ""
              }
              onClose={() => setActivePanel(null)}
            >
              {/* Search / Find */}
              {activePanel === "search" && (
                <div>
                  <div style={{ position: "relative" }}>
                    <MagnifyingGlass
                      size={14}
                      weight="bold"
                      color="rgba(19,0,50,0.4)"
                      style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                    />
                    <input
                      type="text"
                      placeholder="Find in Document"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        border: "1px solid rgba(19,0,50,0.18)",
                        borderRadius: 8,
                        padding: "8px 32px 8px 30px",
                        fontSize: 13,
                        outline: "none",
                        color: "#130032",
                        background: "white",
                      }}
                    />
                    {searchText && (
                      <button
                        onClick={() => setSearchText("")}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "rgba(19,0,50,0.4)",
                          display: "flex",
                          padding: 2,
                        }}
                      >
                        <PhosphorX size={12} weight="bold" />
                      </button>
                    )}
                  </div>
                  {searchText && (
                    <p style={{ fontSize: 11, color: "rgba(19,0,50,0.45)", marginTop: 10, textAlign: "center" }}>
                      Search results not available in browser preview
                    </p>
                  )}
                </div>
              )}

              {/* View Pages / Thumbnails */}
              {activePanel === "viewPages" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {documents.map((doc) => (
                    <div key={doc.id}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "rgba(19,0,50,0.6)",
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {doc.name} &middot; {doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {Array.from({ length: doc.pageCount }).map((_, idx) => {
                          const pageNum = idx + 1;
                          const isDone = completedPages.has(pageNum);
                          return (
                            <div
                              key={pageNum}
                              style={{
                                position: "relative",
                                borderRadius: 6,
                                overflow: "hidden",
                                border: `2px solid ${isDone ? "#00B851" : "rgba(19,0,50,0.12)"}`,
                                background: "#fafafa",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                // Scroll to this page in the main view
                                const pageEl = documentRef.current?.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
                                if (pageEl) pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                            >
                              <img
                                src={`/api/signing/documents/${doc.id}/pages/${pageNum}?token=${token}`}
                                alt={`Page ${pageNum}`}
                                style={{
                                  width: "100%",
                                  display: "block",
                                  aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}`,
                                  objectFit: "contain",
                                }}
                              />
                              {/* Page number badge */}
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: 4,
                                  left: 4,
                                  background: "rgba(0,0,0,0.55)",
                                  color: "white",
                                  fontSize: 9,
                                  fontWeight: 600,
                                  padding: "2px 5px",
                                  borderRadius: 3,
                                }}
                              >
                                {pageNum}
                              </div>
                              {/* Checkmark on completed pages */}
                              {isDone && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 4,
                                    right: 4,
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    background: "#00B851",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Check size={10} weight="bold" color="white" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Download */}
              {activePanel === "download" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={handleDownloadCombined}
                    disabled={downloadLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      borderRadius: 10,
                      border: "1px solid rgba(19,0,50,0.14)",
                      background: "white",
                      cursor: downloadLoading ? "wait" : "pointer",
                      textAlign: "left",
                      transition: "background 0.15s",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "#F0EEFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <DownloadSimple size={18} weight="bold" color="#4C00FF" />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#130032", margin: 0 }}>
                        Combined PDF
                      </p>
                      <p style={{ fontSize: 11, color: "rgba(19,0,50,0.5)", margin: 0 }}>
                        All documents in one file
                      </p>
                    </div>
                  </button>

                  <button
                    disabled
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      borderRadius: 10,
                      border: "1px solid rgba(19,0,50,0.14)",
                      background: "#fafafa",
                      cursor: "not-allowed",
                      textAlign: "left",
                      opacity: 0.6,
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "#f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <DownloadSimple size={18} weight="bold" color="#888" />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#130032", margin: 0 }}>
                        Separate PDFs
                      </p>
                      <p style={{ fontSize: 11, color: "rgba(19,0,50,0.5)", margin: 0 }}>
                        One file per document
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </SidePanel>
          )}

          {/* Icon toolbar (always visible) */}
          <div
            style={{
              width: 60,
              background: "white",
              borderLeft: "1px solid rgba(19,0,50,0.12)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 12,
              paddingBottom: 12,
              gap: 2,
              flexShrink: 0,
              overflowY: "auto",
            }}
          >
            {/* Search */}
            <SidebarButton
              icon={<MagnifyingGlass size={22} weight="bold" />}
              label="Search"
              isActive={activePanel === "search"}
              onClick={() => togglePanel("search")}
            />

            {/* View Pages */}
            <SidebarButton
              icon={<FileText size={22} weight="bold" />}
              label="View Pages"
              isActive={activePanel === "viewPages"}
              onClick={() => togglePanel("viewPages")}
            />

            {/* Comment */}
            <SidebarButton
              icon={<ChatText size={22} weight="bold" />}
              label="Comment"
              isActive={commentMode}
              onClick={() => {
                if (commentMode) {
                  setCommentMode(false);
                  setCommentPopover(null);
                  setCommentText("");
                  setActivePanel(null);
                } else {
                  setCommentMode(true);
                  setActivePanel("comment");
                }
              }}
            />

            {/* Download */}
            <SidebarButton
              icon={<DownloadSimple size={22} weight="bold" />}
              label="Download"
              isActive={activePanel === "download"}
              onClick={() => togglePanel("download")}
            />

            {/* Print */}
            <SidebarButton
              icon={<Printer size={22} weight="bold" />}
              label="Print"
              isActive={false}
              onClick={() => window.print()}
            />

            {/* Divider */}
            <div
              style={{
                width: 32,
                height: 1,
                background: "rgba(19,0,50,0.10)",
                margin: "6px 0",
                flexShrink: 0,
              }}
            />

            {/* Zoom in */}
            <button
              onClick={zoomIn}
              disabled={zoom >= 2.0}
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: zoom >= 2.0 ? "not-allowed" : "pointer",
                color: zoom >= 2.0 ? "rgba(19,0,50,0.25)" : "rgba(19,0,50,0.55)",
              }}
            >
              <MagnifyingGlassPlus size={22} weight="bold" />
            </button>

            {/* Zoom level display */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(19,0,50,0.6)",
                textAlign: "center",
                lineHeight: 1,
                padding: "4px 0",
                userSelect: "none",
              }}
            >
              {Math.round(zoom * 100)}%
            </div>

            {/* Zoom out */}
            <button
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: zoom <= 0.5 ? "not-allowed" : "pointer",
                color: zoom <= 0.5 ? "rgba(19,0,50,0.25)" : "rgba(19,0,50,0.55)",
              }}
            >
              <MagnifyingGlassMinus size={22} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Field Navigator (floating) */}
      {!isPostCompletion && !isCcOrViewer && (
        <FieldNavigator
          currentFieldIndex={currentNavIndex}
          totalFields={myRequiredFields.length}
          completedCount={requiredCompletedCount}
          hasStarted={hasStarted}
          isComplete={isComplete}
          isFinishing={completeMutation.isPending}
          onStart={handleStart}
          onNext={handleNext}
          onFinish={() => completeMutation.mutate()}
        />
      )}

      {/* Signature capture dialog */}
      <SignatureCapture
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        onAdopt={handleAdoptSignature}
        signerName={recipientName}
        mode={signatureMode}
      />

      {/* Decline dialog */}
      <DeclineDialog
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onDecline={(reason) => declineMutation.mutate(reason)}
        isDeclineLoading={declineMutation.isPending}
      />

      {/* Completion Modal */}
      {showCompletionModal && (
        <CompletionModal
          envelope={envelope}
          token={token}
          firstDocId={firstDocId}
          onSignAnother={handleSignAnother}
          onNoThanks={handleCompletionModalClose}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          docName={documents[0]?.name ?? envelope.subject}
          onClose={() => setShowShareModal(false)}
          onSent={() => setCompletedDismissed(true)}
        />
      )}

      {/* E-Record Consent Gate — shown once before signing starts */}
      {!consentGiven && !isPostCompletion && !isCcOrViewer && (
        <ConsentGate
          onConsent={() => setConsentGiven(true)}
          onFinishLater={() => {
            window.close();
            window.location.href = "/";
          }}
          onDecline={() => {
            setConsentGiven(true);
            setTimeout(() => setDeclineOpen(true), 50);
          }}
        />
      )}
    </div>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
