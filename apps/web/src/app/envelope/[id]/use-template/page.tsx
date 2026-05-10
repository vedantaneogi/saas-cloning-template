"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getEnvelope,
  updateEnvelope,
  addRecipient,
  updateRecipient,
  deleteRecipient,
  sendEnvelope,
  setRecipientAccessCode,
} from "@/features/envelopes/api";
import type { Envelope, EnvelopeDocument, Recipient } from "@/features/envelopes/types";
import { PencilSimple, CaretDown, Key, ChatText, Trash, Eye, UserCircle, AddressBook } from "@phosphor-icons/react";

const PRIMARY_COLOR = "#260559";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
const BORDER_COLOR = "rgba(19, 0, 50, 0.1)";
const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";

const ROLE_OPTIONS = [
  { value: "signer", label: "Needs to Sign" },
  { value: "approver", label: "Needs to Approve" },
  { value: "cc", label: "Receives a Copy" },
  { value: "in_person", label: "In Person Signer" },
  { value: "viewer", label: "Needs to View" },
];

interface RecipientEntry {
  /** Display label from the template role name */
  templateRole: string;
  name: string;
  email: string;
  role: string;
  routing_order: number;
  /** UUID of the already-created envelope recipient (for updates) */
  existingRecipientId?: string;
}

// ── Small inline icons ────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
      <path d="M7 10l5 5 5-5H7z" />
    </svg>
  );
}

// ── Document thumbnail (same approach as DocumentPanel.tsx) ───────────────────

function getExtLabel(docName: string): string {
  const match = docName.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toUpperCase() : "DOC";
}

function getExtColor(ext: string): string {
  switch (ext) {
    case "PDF":
      return "#D93025";
    case "DOCX":
    case "DOC":
      return "#1565C0";
    default:
      return "#555";
  }
}

function DocThumbnail({ docId, docName }: { docId: string; docName: string }) {
  const [imgError, setImgError] = useState(false);
  const src = `/api/documents/${docId}/pages/1`;
  const ext = getExtLabel(docName);
  const extColor = getExtColor(ext);

  if (imgError) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #F3F0FF 0%, #EBE5FF 100%)",
        }}
      >
        <svg viewBox="0 0 60 78" fill="none" width="60" height="78" aria-hidden="true">
          <rect x="0" y="0" width="52" height="68" rx="2" fill="#E8EAF6" />
          <path d="M40 0L52 12" stroke="#9FA8DA" strokeWidth="1.5" />
          <rect x="40" y="0" width="12" height="12" rx="1" fill="#C5CAE9" />
          <rect x="0" y="52" width="52" height="16" rx="1" fill={extColor} />
          <text x="26" y="63" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
            {ext}
          </text>
          <rect x="8" y="18" width="28" height="2" rx="1" fill="#C5CAE9" />
          <rect x="8" y="24" width="36" height="2" rx="1" fill="#C5CAE9" />
          <rect x="8" y="30" width="32" height="2" rx="1" fill="#C5CAE9" />
          <rect x="8" y="36" width="20" height="2" rx="1" fill="#C5CAE9" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Page 1 of ${docName}`}
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
      onError={() => setImgError(true)}
    />
  );
}

// ── Document card (right panel) ───────────────────────────────────────────────

function DocumentCard({ doc }: { doc: EnvelopeDocument }) {
  const name = doc.name || doc.original_filename || "Document";
  const pages = doc.pageCount ?? doc.page_count ?? 1;

  return (
    <div
      style={{
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: "8px",
        background: "white",
        overflow: "hidden",
      }}
    >
      {/* Thumbnail */}
      <div style={{ height: "140px", position: "relative", overflow: "hidden" }}>
        <DocThumbnail docId={doc.id} docName={name} />
      </div>

      {/* Info footer */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER_COLOR}` }}>
        <p
          style={{
            margin: "0 0 3px 0",
            fontSize: "13px",
            fontWeight: 600,
            color: PRIMARY_TEXT,
            fontFamily: DS_FONT,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={name}
        >
          {name}
        </p>
        <p style={{ margin: 0, fontSize: "12px", color: MUTED_TEXT, fontFamily: DS_FONT }}>
          {pages} page{pages !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// ── Recipient card (left panel) ───────────────────────────────────────────────

function RecipientCard({
  index,
  recipient,
  total,
  onChange,
  onRemove,
}: {
  index: number;
  recipient: RecipientEntry;
  total: number;
  onChange: <K extends keyof RecipientEntry>(index: number, field: K, value: RecipientEntry[K]) => void;
  onRemove: (index: number) => void;
}) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [showPrivateMessage, setShowPrivateMessage] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [privateMessage, setPrivateMessage] = useState("");

  const roleLabelMap: Record<string, string> = {
    signer: "Needs to Sign",
    approver: "Needs to Approve",
    in_person: "In Person Signer",
    cc: "Receives a Copy",
    viewer: "Needs to View",
  };

  return (
    <div>
      <div
        style={{
          border: "1px solid rgba(19,0,50,0.12)",
          borderLeft: "4px solid #5BC4BF",
          borderRadius: "4px",
          padding: "16px 24px",
          background: "#fff",
        }}
      >
        {/* Role label — only show if custom template role exists (not generic like "Needs to Sign") */}
        {recipient.templateRole && !["Needs to Sign", "Needs to Approve", "Receives a Copy", "In Person Signer", "Needs to View", "Signer"].includes(recipient.templateRole) && (
          <div style={{ fontSize: "15px", fontWeight: 700, color: PRIMARY_TEXT, fontFamily: DS_FONT, marginBottom: "12px" }}>
            {recipient.templateRole}
          </div>
        )}

        {/* Row 1: Name + Role dropdown (disabled) + Customize + Remove */}
        <div className="flex items-end gap-3 mb-3 flex-wrap">
          {/* Name */}
          <div className="flex-1" style={{ minWidth: "160px" }}>
            <label style={{ display: "block", fontSize: "14px", color: "rgba(19,0,50,0.9)", fontWeight: 400, marginBottom: "4px" }}>
              Name <span style={{ color: "#C0392B" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <AddressBook
                size={15}
                weight="bold"
                color="#aaa"
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              />
              <input
                type="text"
                value={recipient.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                placeholder="Full name"
                style={{
                  width: "100%",
                  paddingLeft: "36px",
                  paddingRight: "12px",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  fontSize: "16px",
                  border: "1px solid rgba(19,0,50,0.25)",
                  borderRadius: "4px",
                  background: "#fff",
                  color: "rgba(19,0,50,0.9)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#4C00FF"; e.target.style.boxShadow = "0 0 0 2px rgba(76,0,255,0.12)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(19,0,50,0.25)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Role dropdown — disabled/read-only for template use */}
          <div>
            <button
              disabled
              className="flex items-center gap-1.5 bg-white"
              style={{
                border: "1px solid rgba(19,0,50,0.15)",
                borderRadius: "4px",
                padding: "8px 12px",
                fontSize: "16px",
                fontWeight: 500,
                color: "rgba(19,0,50,0.4)",
                whiteSpace: "nowrap",
                cursor: "default",
                opacity: 0.7,
              }}
            >
              <PencilSimple size={16} weight="bold" color="rgba(19,0,50,0.35)" />
              {roleLabelMap[recipient.role] ?? "Needs to Sign"}
              <CaretDown size={14} weight="bold" color="rgba(19,0,50,0.35)" />
            </button>
          </div>

          {/* Customize dropdown — wired to access code + private message */}
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button
              className="flex items-center gap-1.5 bg-white transition-colors hover:bg-gray-50"
              style={{
                border: "1px solid rgba(19,0,50,0.25)",
                borderRadius: "4px",
                padding: "8px 12px",
                fontSize: "16px",
                fontWeight: 500,
                color: "rgba(19,0,50,0.9)",
              }}
              onClick={() => setCustomizeOpen((v) => !v)}
            >
              Customize
              <CaretDown size={14} weight="bold" color="rgba(19,0,50,0.7)" />
            </button>

            {customizeOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setCustomizeOpen(false)} />
                <div
                  style={{
                    position: "absolute",
                    zIndex: 20,
                    background: "white",
                    border: "1px solid #E0E0E0",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    minWidth: "260px",
                    top: "100%",
                    left: 0,
                    marginTop: "2px",
                    padding: "4px 0",
                  }}
                >
                  <button
                    className="w-full text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                    style={{ padding: "12px 16px", border: "none", background: "none", cursor: "pointer" }}
                    onClick={() => { setCustomizeOpen(false); setShowAccessCode(true); }}
                  >
                    <Key size={20} weight="bold" color="#555" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 500, color: "#1B0A3C" }}>Add access code</div>
                      <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>Enter a code that only you and this recipient know.</div>
                    </div>
                  </button>
                  <button
                    className="w-full text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                    style={{ padding: "12px 16px", border: "none", background: "none", cursor: "pointer" }}
                    onClick={() => { setCustomizeOpen(false); setShowPrivateMessage(true); }}
                  >
                    <ChatText size={20} weight="bold" color="#555" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 500, color: "#1B0A3C" }}>Add private message</div>
                      <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>Include a personal note with this recipient.</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Remove button */}
          {total > 1 && (
            <div>
              <button
                onClick={() => onRemove(index)}
                className="flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                style={{ width: "36px", height: "36px" }}
                aria-label="Remove recipient"
              >
                <Trash size={16} weight="bold" color="#aaa" />
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Email */}
        <div style={{ marginTop: "12px" }}>
          <label style={{ display: "block", fontSize: "14px", color: "rgba(19,0,50,0.9)", fontWeight: 400, marginBottom: "4px" }}>
            Email <span style={{ color: "#C0392B" }}>*</span>
          </label>
          <input
            type="email"
            value={recipient.email}
            onChange={(e) => onChange(index, "email", e.target.value)}
            placeholder="email@example.com"
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: "16px",
              border: "1px solid rgba(19,0,50,0.25)",
              borderRadius: "4px",
              color: "rgba(19,0,50,0.9)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#4C00FF"; e.target.style.boxShadow = "0 0 0 2px rgba(76,0,255,0.12)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(19,0,50,0.25)"; e.target.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* Inline: Access code section */}
      {showAccessCode && (
        <div style={{ borderLeft: "4px solid #5BC4BF", padding: "12px 24px", marginTop: "4px", background: "#FAFAFA", borderRadius: "0 0 4px 4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(19,0,50,0.9)" }}>Access code</span>
            <button onClick={() => { setShowAccessCode(false); setAccessCode(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#D93025" }}>Remove</button>
          </div>
          <input
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Enter access code"
            style={{ width: "100%", maxWidth: "320px", padding: "8px 12px", border: "1px solid rgba(19,0,50,0.25)", borderRadius: "4px", fontSize: "14px", color: "rgba(19,0,50,0.9)", outline: "none", display: "block", marginBottom: "6px" }}
            onBlur={() => {
              if (accessCode.trim() && recipient.existingRecipientId) {
                setRecipientAccessCode(recipient.existingRecipientId, accessCode.trim()).catch(() => {});
              }
            }}
          />
          <div style={{ fontSize: "12px", color: "rgba(19,0,50,0.5)" }}>Codes are not case-sensitive. You must provide this code to the signer.</div>
        </div>
      )}

      {/* Inline: Private message section */}
      {showPrivateMessage && (
        <div style={{ borderLeft: "4px solid #5BC4BF", padding: "12px 24px", marginTop: "4px", background: "#FAFAFA", borderRadius: "0 0 4px 4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(19,0,50,0.9)" }}>Private message</span>
            <button onClick={() => { setShowPrivateMessage(false); setPrivateMessage(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#D93025" }}>Remove</button>
          </div>
          <textarea
            value={privateMessage}
            onChange={(e) => setPrivateMessage(e.target.value)}
            placeholder="Enter a personal note for this recipient..."
            rows={3}
            style={{ width: "100%", maxWidth: "400px", padding: "8px 12px", border: "1px solid rgba(19,0,50,0.25)", borderRadius: "4px", fontSize: "14px", color: "rgba(19,0,50,0.9)", outline: "none", resize: "vertical" }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UseTemplatePage() {
  const { id: envelopeId } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [documents, setDocuments] = useState<EnvelopeDocument[]>([]);
  const [recipients, setRecipients] = useState<RecipientEntry[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageOpen, setMessageOpen] = useState(true);

  // ── Load the envelope (already created from template by TemplateList) ──────
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const env = await getEnvelope(envelopeId);
        setEnvelope(env);
        setDocuments(env.documents ?? []);

        // Pre-fill subject/message
        setSubject(env.subject ?? "");
        setMessage(env.message ?? "");

        // Build recipient entries from envelope recipients
        const envRecipients: Recipient[] = env.recipients ?? [];
        if (envRecipients.length > 0) {
          const roleToLabel: Record<string, string> = {};
          for (const opt of ROLE_OPTIONS) roleToLabel[opt.value] = opt.label;
          setRecipients(
            envRecipients.map((r) => ({
              templateRole: r.template_role_label || roleToLabel[r.role] || r.role || "Signer",
              name: r.name,
              email: r.email,
              role: r.role,
              routing_order: r.order,
              existingRecipientId: r.id,
            }))
          );
        } else {
          setRecipients([
            { templateRole: "Signer", name: "", email: "", role: "signer", routing_order: 1 },
          ]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load envelope. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeId]);

  // ── Field updater ─────────────────────────────────────────────────────────
  function updateField<K extends keyof RecipientEntry>(
    index: number,
    field: K,
    value: RecipientEntry[K]
  ) {
    setRecipients((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  // ── Add blank recipient ───────────────────────────────────────────────────
  function addNewRecipient() {
    const nextOrder = (recipients[recipients.length - 1]?.routing_order ?? 0) + 1;
    setRecipients((prev) => [
      ...prev,
      {
        templateRole: `Recipient ${prev.length + 1}`,
        name: "",
        email: "",
        role: "signer",
        routing_order: nextOrder,
      },
    ]);
  }

  // ── Remove recipient ──────────────────────────────────────────────────────
  async function removeRecipient(index: number) {
    const entry = recipients[index];
    if (entry.existingRecipientId) {
      try {
        await deleteRecipient(entry.existingRecipientId);
      } catch {
        // best-effort
      }
    }
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): string | null {
    for (const r of recipients) {
      if (!r.name.trim()) return "All recipient names are required.";
      if (!r.email.trim()) return "All recipient emails are required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()))
        return `Invalid email address: ${r.email}`;
    }
    if (!subject.trim()) return "Subject is required.";
    return null;
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  async function handleSend() {
    const validErr = validate();
    if (validErr) {
      setError(validErr);
      return;
    }

    setSending(true);
    setError(null);

    try {
      // 1. Save subject + message
      await updateEnvelope(envelopeId, {
        subject: subject.trim(),
        message: message.trim(),
      });

      // 2. Update / add each recipient
      for (const entry of recipients) {
        if (entry.existingRecipientId) {
          await updateRecipient(entry.existingRecipientId, {
            name: entry.name.trim(),
            email: entry.email.trim(),
            role: entry.role,
            routing_order: entry.routing_order,
          });
        } else {
          await addRecipient(envelopeId, {
            name: entry.name.trim(),
            email: entry.email.trim(),
            role: entry.role,
            routing_order: entry.routing_order,
          });
        }
      }

      // 3. Send
      await sendEnvelope(envelopeId);

      // 4. Redirect
      router.push("/agreements");
    } catch (err) {
      console.error(err);
      setError("Failed to send the envelope. Please try again.");
    } finally {
      setSending(false);
    }
  }

  // ── Advanced Edit ─────────────────────────────────────────────────────────
  async function handleAdvancedEdit() {
    // Save current subject/message before navigating to full editor
    try {
      if (subject.trim() || message.trim()) {
        await updateEnvelope(envelopeId, {
          subject: subject.trim(),
          message: message.trim(),
        });
      }
    } catch {
      // Best-effort — navigate regardless
    }
    router.push(`/envelope/${envelopeId}/prepare?from=template`);
  }

  // ── Loading / fatal error ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: DS_FONT,
          color: SECONDARY_TEXT,
          fontSize: "15px",
        }}
      >
        Loading…
      </div>
    );
  }

  if (error && !envelope) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: DS_FONT,
          gap: "16px",
        }}
      >
        <p style={{ color: "#D93025", fontSize: "15px" }}>{error}</p>
        <button
          onClick={() => router.push("/templates")}
          style={{
            background: PRIMARY_COLOR,
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "8px 20px",
            fontSize: "14px",
            cursor: "pointer",
            fontFamily: DS_FONT,
          }}
        >
          Back to Templates
        </button>
      </div>
    );
  }

  // ── Page layout ───────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "white",
        fontFamily: DS_FONT,
      }}
    >
      {/* ── Top header bar ──────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 24px",
          height: "60px",
          borderBottom: `1px solid ${BORDER_COLOR}`,
          flexShrink: 0,
          background: "white",
          zIndex: 10,
        }}
      >
        {/* Close / X */}
        <button
          onClick={() => router.push("/templates")}
          title="Back to Templates"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: MUTED_TEXT,
            display: "flex",
            alignItems: "center",
            padding: "6px",
            borderRadius: "4px",
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = PRIMARY_TEXT;
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(19,0,50,0.06)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = MUTED_TEXT;
            (e.currentTarget as HTMLButtonElement).style.background = "none";
          }}
        >
          <XIcon />
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Settings gear */}
        <button
          title="Settings"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: MUTED_TEXT,
            display: "flex",
            alignItems: "center",
            padding: "6px",
            borderRadius: "4px",
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = PRIMARY_TEXT;
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(19,0,50,0.06)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = MUTED_TEXT;
            (e.currentTarget as HTMLButtonElement).style.background = "none";
          }}
        >
          <GearIcon />
        </button>

        {/* Advanced Edit (outlined) */}
        <button
          onClick={handleAdvancedEdit}
          style={{
            background: "white",
            border: `1.5px solid ${BORDER_COLOR}`,
            borderRadius: "4px",
            padding: "7px 18px",
            fontSize: "14px",
            fontWeight: 600,
            color: PRIMARY_TEXT,
            cursor: "pointer",
            fontFamily: DS_FONT,
            whiteSpace: "nowrap",
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(19,0,50,0.04)")}
          onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "white")}
        >
          Advanced Edit
        </button>

        {/* Send (primary) */}
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            background: sending ? "#5a2d90" : PRIMARY_COLOR,
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "7px 24px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.8 : 1,
            fontFamily: DS_FONT,
            whiteSpace: "nowrap",
            transition: "background 0.15s",
          }}
          onMouseOver={(e) => {
            if (!sending) (e.currentTarget as HTMLButtonElement).style.background = "#3a0870";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = sending ? "#5a2d90" : PRIMARY_COLOR;
          }}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </header>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: `1px solid #FECACA`,
            color: "#B91C1C",
            padding: "10px 24px",
            fontSize: "14px",
            fontFamily: DS_FONT,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#B91C1C", display: "flex" }}
          >
            <XIcon />
          </button>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* ── Left: Recipients + Message ─────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "36px 48px 48px",
            borderRight: `1px solid ${BORDER_COLOR}`,
          }}
        >
          {/* Recipients heading */}
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: PRIMARY_TEXT,
              margin: "0 0 24px 0",
              fontFamily: DS_FONT,
            }}
          >
            Add recipients
          </h2>

          {/* Recipient cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            {recipients.map((r, i) => (
              <RecipientCard
                key={i}
                index={i}
                recipient={r}
                total={recipients.length}
                onChange={updateField}
                onRemove={removeRecipient}
              />
            ))}
          </div>

          {/* No Add Recipient — recipients come from template */}
          <div style={{ marginBottom: "40px" }} />

          {/* Add message section */}
          <div>
            <button
              onClick={() => setMessageOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 0 16px 0",
                fontFamily: DS_FONT,
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: PRIMARY_TEXT,
                  margin: 0,
                  fontFamily: DS_FONT,
                }}
              >
                Add message
              </h2>
              <span style={{ color: MUTED_TEXT, display: "flex", alignItems: "center" }}>
                {messageOpen ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M7 14l5-5 5 5H7z" />
                  </svg>
                ) : (
                  <ChevronDown />
                )}
              </span>
            </button>

            {messageOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Subject */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: SECONDARY_TEXT,
                      marginBottom: "6px",
                      fontFamily: DS_FONT,
                    }}
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: `1px solid ${BORDER_COLOR}`,
                      borderRadius: "4px",
                      fontSize: "14px",
                      color: PRIMARY_TEXT,
                      fontFamily: DS_FONT,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY_COLOR)}
                    onBlur={(e) => (e.target.style.borderColor = BORDER_COLOR)}
                  />
                </div>

                {/* Message */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: SECONDARY_TEXT,
                      marginBottom: "6px",
                      fontFamily: DS_FONT,
                    }}
                  >
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter a message for your recipients…"
                    rows={5}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: `1px solid ${BORDER_COLOR}`,
                      borderRadius: "4px",
                      fontSize: "14px",
                      color: PRIMARY_TEXT,
                      fontFamily: DS_FONT,
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = PRIMARY_COLOR)}
                    onBlur={(e) => (e.target.style.borderColor = BORDER_COLOR)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Document preview ────────────────────────────────────── */}
        <div
          style={{
            width: "280px",
            flexShrink: 0,
            overflowY: "auto",
            padding: "36px 20px 48px",
            background: "#FAFAFA",
          }}
        >
          {documents.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: "60px",
                color: MUTED_TEXT,
                fontSize: "14px",
                fontFamily: DS_FONT,
                gap: "8px",
                textAlign: "center",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="48">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <span>No documents attached</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}

              {/* Return to top */}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: PRIMARY_COLOR,
                  fontSize: "13px",
                  fontFamily: DS_FONT,
                  padding: "8px 0",
                  textAlign: "left",
                  textDecoration: "underline",
                }}
              >
                Return to top of the page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
