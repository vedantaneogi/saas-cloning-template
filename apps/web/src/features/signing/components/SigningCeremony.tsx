"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { completeSigning, declineSigning, submitFieldValue } from "@/features/signing/api";
import { SignatureCapture } from "./SignatureCapture";
import { FieldNavigator } from "./FieldNavigator";
import { DeclineDialog } from "./DeclineDialog";
import { SigningField } from "./SigningField";
import type { Envelope } from "@/features/envelopes/types";
import type { PlacedField, FieldType } from "@/features/editor/model/types";
import { createField } from "@/features/editor/api";
import {
  Check,
  CheckCircle,
  X as PhosphorX,
  CaretDown,
  DotsThreeVertical,
  Sparkle,
  MagnifyingGlass,
  FileText,
  ChatText,
  DownloadSimple,
  Printer,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  PenNib,
  CalendarBlank,
  User,
  EnvelopeSimple,
  Buildings,
  IdentificationBadge,
  TextT,
  CheckSquare,
  Stamp as StampIcon,
} from "@phosphor-icons/react";

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;

// Sidebar panel types
type ActivePanel = "summarize" | "search" | "viewPages" | "comment" | "download" | null;

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
    : "8/31/2026";

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
}

function ShareModal({ docName, onClose }: ShareModalProps) {
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
    setTimeout(() => {
      setSent(false);
      onClose();
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden relative">
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
            style={{ background: sent ? "#00B851" : "#1B0A3C" }}
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

  const btnBg = isComplete ? "#F5A623" : "#7A6A8A";
  const btnColor = isComplete ? "#1B0035" : "rgba(255,255,255,0.7)";

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
    { type: "signature", label: "Signature", icon: <PenNib size={16} weight="bold" /> },
    {
      type: "initial",
      label: "Initial",
      icon: (
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: "inherit",
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          DS
        </span>
      ),
    },
    { type: "stamp", label: "Stamp", icon: <StampIcon size={16} weight="bold" /> },
    { type: "date_signed", label: "Date Signed", icon: <CalendarBlank size={16} weight="bold" /> },
  ],
  [
    { type: "name", label: "Name", icon: <User size={16} weight="bold" /> },
    { type: "text", label: "First Name", icon: <User size={16} /> },
    { type: "text", label: "Last Name", icon: <User size={16} /> },
    { type: "email", label: "Email Address", icon: <EnvelopeSimple size={16} weight="bold" /> },
    { type: "company", label: "Company", icon: <Buildings size={16} weight="bold" /> },
    { type: "title", label: "Title", icon: <IdentificationBadge size={16} weight="bold" /> },
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
                onClick={() => onSelect(item.type, item.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 16px",
                  border: "none",
                  background: isSelected ? "#F0EEFF" : "transparent",
                  cursor: "pointer",
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
}

type SigningStatus = "signing" | "completed" | "declined";

export function SigningCeremony({ token, envelope, recipientId, fields, accessCode, isSelfSign }: SigningCeremonyProps) {
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
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [currentNavIndex, setCurrentNavIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Modal / completion state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [completedDismissed, setCompletedDismissed] = useState(false);

  // Sidebar state
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [zoom, setZoom] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [commentMode, setCommentMode] = useState(false);
  const [commentPopover, setCommentPopover] = useState<{ x: number; y: number; page: number } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Self-sign field placement state
  const [localFields, setLocalFields] = useState<PlacedField[]>([]);
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [selectedFieldLabel, setSelectedFieldLabel] = useState<string | null>(null);
  const [showFieldPrompt, setShowFieldPrompt] = useState(!!isSelfSign && fields.length === 0);

  const documentRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Combine server fields + locally placed fields
  const allFields = [...fields, ...localFields];
  const myFields = allFields.filter((f) => f.recipientId === recipientId);
  const requiredMyFields = myFields.filter((f) => f.required);

  const completedCount = requiredMyFields.filter((f) => !!fieldValues[f.id]).length;
  const isComplete = isSelfSign
    ? true
    : requiredMyFields.length === 0
      ? hasStarted
      : completedCount >= requiredMyFields.length;

  const scrollToField = useCallback((fieldId: string) => {
    const fieldEl = fieldRefs.current.get(fieldId);
    if (fieldEl) {
      fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setActiveFieldId(fieldId);
  }, []);

  const handleNext = useCallback(() => {
    const currentField = requiredMyFields[currentNavIndex];
    if (currentField && !fieldValues[currentField.id]) {
      if (currentField.type === "signature" || currentField.type === "initial") {
        setActiveFieldId(currentField.id);
        setSignatureMode(currentField.type === "initial" ? "initial" : "signature");
        setSignatureOpen(true);
        return;
      } else if (currentField.type === "date_signed") {
        const date = new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        setFieldValues((prev) => ({ ...prev, [currentField.id]: date }));
      }
    }
    if (currentNavIndex < requiredMyFields.length - 1) {
      const nextIdx = currentNavIndex + 1;
      setCurrentNavIndex(nextIdx);
      scrollToField(requiredMyFields[nextIdx].id);
    }
  }, [currentNavIndex, requiredMyFields, fieldValues, scrollToField]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        try {
          await submitFieldValue(token, fieldId, value);
        } catch {
          // non-fatal
        }
      }
      return completeSigning(token, accessCode);
    },
    onSuccess: (data) => {
      if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
      // Show completion modal — setStatus("completed") happens when modal is dismissed
      setShowCompletionModal(true);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong. Please try again.";
      alert(`Could not complete signing: ${message}`);
    },
  });

  const declineMutation = useMutation({
    mutationFn: (reason: string) => declineSigning(token, reason),
    onSuccess: () => {
      setDeclineOpen(false);
      setStatus("declined");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong. Please try again.";
      alert(`Could not decline: ${message}`);
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
        const fieldIdx = requiredMyFields.findIndex((f) => f.id === activeFieldId);
        if (fieldIdx >= 0 && fieldIdx < requiredMyFields.length - 1) {
          const nextIdx = fieldIdx + 1;
          setCurrentNavIndex(nextIdx);
          setTimeout(() => scrollToField(requiredMyFields[nextIdx].id), 300);
        }
      }
    }
    setSignatureOpen(false);
  }, [activeFieldId, hasStarted, requiredMyFields, scrollToField]);

  const handleStart = useCallback(() => {
    setHasStarted(true);
    if (requiredMyFields.length > 0) {
      scrollToField(requiredMyFields[0].id);
      setCurrentNavIndex(0);
    }
  }, [requiredMyFields, scrollToField]);

  const handleFinishLater = useCallback(() => {
    window.close();
    // Fallback if window.close() is blocked (not opened via script)
    window.location.href = "/";
  }, []);

  const handleCompletionModalClose = useCallback(() => {
    setShowCompletionModal(false);
    setCompletedDismissed(true);
    // Don't navigate away — stay on signing page with green header (post-completion state)
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

  // Download combined PDF
  const handleDownloadCombined = useCallback(() => {
    window.open(`/api/envelopes/${envelope.id}/download`, '_blank');
  }, [envelope.id]);

  const senderName = envelope.from || envelope.fromEmail || "the sender";
  const recipientInfo = envelope.recipients.find((r) => r.id === recipientId);
  const recipientName = recipientInfo?.name ?? "Recipient";

  // Build per-document page info (moved up so handlePlaceField can use documents)
  const documents = envelope.documents ?? [];
  const firstDocId = documents[0]?.id ?? null;
  const pageCount = Math.max(1, documents[0]?.pageCount ?? 1);

  // Self-sign: place a field on the document
  const handlePlaceField = useCallback(async (pageNum: number, xPercent: number, yPercent: number) => {
    if (!selectedFieldType || !isSelfSign) return;
    const docId = documents[0]?.id;
    if (!docId) return;

    const sizes: Record<string, { width: number; height: number }> = {
      signature: { width: 20, height: 5 },
      initial: { width: 8, height: 4 },
      stamp: { width: 15, height: 8 },
      date_signed: { width: 15, height: 3 },
      name: { width: 20, height: 3 },
      email: { width: 20, height: 3 },
      company: { width: 20, height: 3 },
      title: { width: 20, height: 3 },
      text: { width: 20, height: 3 },
      checkbox: { width: 3, height: 3 },
    };
    const size = sizes[selectedFieldType] ?? { width: 20, height: 3 };

    const newField: Omit<PlacedField, "id"> = {
      type: selectedFieldType as FieldType,
      recipientId,
      documentId: docId,
      page: pageNum,
      x: xPercent,
      y: yPercent,
      width: size.width,
      height: size.height,
      required: true,
      label: selectedFieldLabel ?? undefined,
    };

    try {
      const created = await createField(docId, newField);
      const placedField: PlacedField = { ...newField, id: created.id };
      setLocalFields((prev) => [...prev, placedField]);

      if (selectedFieldType === "date_signed") {
        const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        setFieldValues((prev) => ({ ...prev, [created.id]: date }));
      } else if (selectedFieldType === "name") {
        setFieldValues((prev) => ({ ...prev, [created.id]: recipientName }));
      } else if (selectedFieldType === "email") {
        setFieldValues((prev) => ({ ...prev, [created.id]: recipientInfo?.email ?? "" }));
      } else if (selectedFieldType === "signature" || selectedFieldType === "initial") {
        setActiveFieldId(created.id);
        setSignatureMode(selectedFieldType === "initial" ? "initial" : "signature");
        setSignatureOpen(true);
      }
    } catch {
      alert("Could not place field. Please try again.");
    }

    setSelectedFieldType(null);
    setSelectedFieldLabel(null);
  }, [selectedFieldType, selectedFieldLabel, isSelfSign, documents, recipientId, recipientName, recipientInfo]);

  // Completed pages (pages that have all their required fields filled)
  const completedPages = new Set<number>();
  for (let p = 1; p <= pageCount; p++) {
    const pageRequiredFields = requiredMyFields.filter((f) => f.page === p);
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
            <a
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border transition-colors no-underline"
              style={{ borderColor: "#E0E0E0", color: "#6B6B6B" }}
            >
              Return to Home
            </a>
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
  const bannerBg = isPostCompletion ? "#0A3D1F" : "#1B0035";

  return (
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
          ) : (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.70)" }}>
              Drag and drop fields from the left panel onto the document
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

      {/* ── Sub-bar: brand + doc info + progress (hidden in self-sign) ──── */}
      {!isSelfSign && <div
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

        {/* Progress bar (hidden after completion and in self-sign mode) */}
        {!isPostCompletion && !isSelfSign && (
          <div className="px-6 pb-2.5">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span className="font-medium">
                {completedCount} of {requiredMyFields.length} required fields completed
              </span>
              <span className="font-bold" style={{ color: isComplete ? "#00B851" : "#1B0A3C" }}>
                {requiredMyFields.length > 0
                  ? Math.round((completedCount / requiredMyFields.length) * 100)
                  : isComplete ? 100 : 0}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${requiredMyFields.length > 0 ? (completedCount / requiredMyFields.length) * 100 : isComplete ? 100 : 0}%`,
                  background: isComplete ? "#00B851" : "linear-gradient(90deg, #1B0A3C, #3D2A6B)",
                }}
              />
            </div>
          </div>
        )}
      </div>}

      {/* Comment mode banner */}
      {commentMode && (
        <div
          style={{
            background: "#1B0A3C",
            color: "white",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
            fontWeight: 500,
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <span>To add a comment, click or tap anywhere on the document</span>
          <button
            onClick={() => {
              setCommentMode(false);
              setActivePanel(null);
              setCommentPopover(null);
            }}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "white",
              borderRadius: 6,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
          >
            EXIT
          </button>
        </div>
      )}

      {/* "Place and complete fields" prompt (self-signing) */}
      {showFieldPrompt && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: "28px 36px",
              maxWidth: 420,
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <p style={{ fontSize: 16, fontWeight: 700, color: "#130032", marginBottom: 8 }}>
              Place and complete fields
            </p>
            <p style={{ fontSize: 13, color: "rgba(19,0,50,0.6)", marginBottom: 24, lineHeight: 1.5 }}>
              Make sure to fill out all your fields before finishing.
            </p>
            <button
              onClick={() => { setShowFieldPrompt(false); setHasStarted(true); }}
              style={{
                background: "#4C00FF",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "10px 36px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Main content: left panel + document area + right sidebar */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Left FIELDS panel (self-signing mode) */}
        {isSelfSign && (
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
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const pageEl = target.closest("[data-page]") as HTMLElement | null;
            if (!pageEl) return;
            const page = Number(pageEl.dataset.page);
            const pageInner = pageEl.querySelector("[data-page-inner]") as HTMLElement | null;
            const rect = (pageInner ?? pageEl).getBoundingClientRect();

            // Field placement mode (self-signing)
            if (selectedFieldType && isSelfSign) {
              const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
              const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
              handlePlaceField(page, xPercent, yPercent);
              return;
            }

            // Comment mode
            if (commentMode) {
              setCommentPopover({ x: e.clientX - rect.left, y: e.clientY - rect.top, page });
            }
          }}
        >
          <div style={{ maxWidth: 864, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }}>
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
                    {/* Page number label */}
                    <div className="flex items-center gap-3 mb-2 px-2">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium">Page {pageNum}</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>

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
                        {pageFields.map((field) => (
                          <div
                            key={field.id}
                            ref={(el) => {
                              if (el) fieldRefs.current.set(field.id, el);
                              else fieldRefs.current.delete(field.id);
                            }}
                          >
                            <SigningField
                              field={field}
                              value={fieldValues[field.id]}
                              isCurrentField={
                                hasStarted &&
                                requiredMyFields[currentNavIndex]?.id === field.id
                              }
                              isForRecipient={field.recipientId === recipientId}
                              onSignatureRequest={handleSignatureRequest}
                              onValueChange={(fieldId, value) =>
                                setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
                              }
                              allFieldValues={fieldValues}
                              signingToken={token}
                            />
                          </div>
                        ))}

                        {/* Comment popover */}
                        {commentPopover && commentPopover.page === pageNum && (
                          <div
                            style={{
                              position: "absolute",
                              left: commentPopover.x,
                              top: commentPopover.y,
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
                                onClick={() => { setCommentPopover(null); setCommentText(""); }}
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
                activePanel === "summarize"
                  ? "Summarize"
                  : activePanel === "search"
                  ? "Find"
                  : activePanel === "viewPages"
                  ? "Thumbnails"
                  : activePanel === "download"
                  ? "Download"
                  : ""
              }
              onClose={() => setActivePanel(null)}
            >
              {/* Summarize */}
              {activePanel === "summarize" && (
                <div style={{ textAlign: "center", paddingTop: 32 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "#F0EEFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <Sparkle size={24} weight="bold" color="#4C00FF" />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#130032", marginBottom: 6 }}>
                    Document Summary
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(19,0,50,0.5)", lineHeight: 1.6 }}>
                    Document summary coming soon
                  </p>
                </div>
              )}

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
            {/* Summarize */}
            <SidebarButton
              icon={<Sparkle size={22} weight="bold" />}
              label="Summarize"
              isActive={activePanel === "summarize"}
              onClick={() => togglePanel("summarize")}
            />

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

      {/* Field Navigator (floating) — hidden after completion and in self-sign mode */}
      {!isPostCompletion && !isSelfSign && (
        <FieldNavigator
          currentFieldIndex={currentNavIndex}
          totalFields={requiredMyFields.length}
          completedCount={completedCount}
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
        />
      )}
    </div>
  );
}
