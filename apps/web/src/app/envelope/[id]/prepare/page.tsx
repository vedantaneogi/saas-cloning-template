"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CaretUp, CaretDown, X, Trash, Info, Desktop, Question, GearSix, PencilSimple, AddressBook, UserPlus, Layout, Key, ChatText, Eye, UserCircle } from "@phosphor-icons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp03Icon } from "@hugeicons/core-free-icons";
import {
  getEnvelope,
  uploadDocument,
  deleteDocument,
  updateEnvelope,
  addRecipient as addRecipientAPI,
  updateRecipient as updateRecipientAPI,
  setRecipientAccessCode,
  setRecipientPrivateMessage,
} from "@/features/envelopes/api";
import { getRecipientColor } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store";

interface RecipientForm {
  id: string;
  name: string;
  email: string;
  role: string;
  order: number;
  color: string;
  privateMessage?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const roleLabel: Record<string, string> = {
  signer: "Needs to Sign",
  in_person: "In Person Signer",
  cc: "Receives a Copy",
  viewer: "Needs to View",
};

export default function PrepareEnvelopePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // ── Section collapse state — all open by default ──────────────────────────
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [recipientsOpen, setRecipientsOpen] = useState(true);
  const [messageOpen, setMessageOpen] = useState(true);

  // ── Advanced Options panel ─────────────────────────────────────────────────
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  const [advSignOnPaper, setAdvSignOnPaper] = useState(false);
  const [advChangeSigningResponsibility, setAdvChangeSigningResponsibility] = useState(false);
  const [advAutoReminders, setAdvAutoReminders] = useState(false);
  const [advDaysUntilExpiry, setAdvDaysUntilExpiry] = useState(120);
  const [advExpirationAlert, setAdvExpirationAlert] = useState(0);
  const [advResponsiveSigning, setAdvResponsiveSigning] = useState(false);
  const [advAllowComments, setAdvAllowComments] = useState(false);
  // Applied advanced option values (committed on "Apply" click)
  const [appliedDaysUntilExpiry, setAppliedDaysUntilExpiry] = useState(120);

  // ── Reminder days (from "Frequency of reminders" dropdown) ────────────────
  const [reminderDays, setReminderDays] = useState(0);

  // ── Dropdown open states ───────────────────────────────────────────────────
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<Record<string, boolean>>({});
  const [addRecipientDropdownOpen, setAddRecipientDropdownOpen] = useState(false);
  const [customizeDropdownOpen, setCustomizeDropdownOpen] = useState<Record<string, boolean>>({});

  // ── Access code dialog ─────────────────────────────────────────────────────
  const [accessCodeDialog, setAccessCodeDialog] = useState<{ recipientId: string; currentCode: string } | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState("");

  // ── Private message dialog ─────────────────────────────────────────────────
  const [privateMessageDialog, setPrivateMessageDialog] = useState<{ recipientId: string } | null>(null);
  const [privateMessageInput, setPrivateMessageInput] = useState("");

  // ── File state ─────────────────────────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; size: number }>>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [justUploadedDocs, setJustUploadedDocs] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Validation state ───────────────────────────────────────────────────────
  const [triedToProceed, setTriedToProceed] = useState(false);

  // ── Recipients ─────────────────────────────────────────────────────────────
  const [recipients, setRecipients] = useState<RecipientForm[]>([
    { id: "r1", name: "", email: "", role: "signer", order: 1, color: getRecipientColor(0) },
  ]);
  const [imOnlySigner, setImOnlySigner] = useState(false);
  const [setSigningOrder, setSetSigningOrder] = useState(false);
  const [signingDiagramOpen, setSigningDiagramOpen] = useState(false);

  // ── Bulk send modal ────────────────────────────────────────────────────────
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("bulk") === "true") {
      setBulkModalOpen(true);
      setBulkStep(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [bulkStep, setBulkStep] = useState<1 | 2 | 3>(1);
  const [bulkMethod, setBulkMethod] = useState<"manual" | "csv">("manual");
  const [bulkCsvFile, setBulkCsvFile] = useState<File | null>(null);
  const [bulkCsvRows, setBulkCsvRows] = useState<Array<{ name: string; email: string; valid: boolean }>>([]);
  const [bulkActiveTab, setBulkActiveTab] = useState<"all" | "errors">("all");
  const bulkCsvInputRef = useRef<HTMLInputElement>(null);

  // ── Message ────────────────────────────────────────────────────────────────
  const [subject, setSubject] = useState("Complete with Docusign:");
  const [message, setMessage] = useState("");

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: envelope } = useQuery({
    queryKey: ["envelope", id],
    queryFn: () => getEnvelope(id),
  });

  // Guard: only pre-populate from API once (on initial load).
  // Without this, every React Query refetch would append/overwrite user edits.
  const didPrePopulateRef = useRef(false);
  const prevIdRef = useRef(id);
  useEffect(() => {
    if (prevIdRef.current !== id) {
      didPrePopulateRef.current = false;
      prevIdRef.current = id;
    }
  }, [id]);

  // ── Pre-populate form from existing envelope data ─────────────────────────
  useEffect(() => {
    if (!envelope || didPrePopulateRef.current) return;
    didPrePopulateRef.current = true;

    if (envelope.subject) setSubject(envelope.subject);
    if (envelope.message) setMessage(envelope.message);
    if (envelope.recipients && envelope.recipients.length > 0) {
      setRecipients(envelope.recipients.map((r, i) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role || "signer",
        order: r.order || i + 1,
        color: getRecipientColor(i),
      })));
      // Restore imOnlySigner if envelope was saved with only the sender as recipient
      const userEmail = currentUser?.email?.toLowerCase();
      if (
        userEmail &&
        envelope.recipients.length === 1 &&
        envelope.recipients[0].email?.toLowerCase() === userEmail
      ) {
        setImOnlySigner(true);
      }
    }
    if (envelope.documents && envelope.documents.length > 0) {
      // Only pre-populate from API on initial load (when we have no local state yet).
      // After uploads the local state takes precedence to preserve file sizes.
      setUploadedFiles((prev) => {
        if (prev.length > 0) return prev;
        return envelope.documents.map((d) => ({
          id: d.id,
          name: d.name || d.original_filename || d.filename || "document.pdf",
          size: 0, // size not returned by API
        }));
      });
    }
  }, [envelope]);

  // ── Upload mutation ────────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
      setUploadingDocs((prev) => ({ ...prev, [file.name]: true }));
      const result = await uploadDocument(id, file);
      setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      return { result, file };
    },
    onSuccess: ({ result, file }) => {
      const docId = result.documentId;
      setUploadingDocs((prev) => {
        const next = { ...prev };
        delete next[file.name];
        return next;
      });
      setUploadedFiles((prev) => [
        ...prev,
        {
          id: docId,
          name: result.name || file.name,
          size: file.size,
        },
      ]);
      // Show green checkmark for 1.5 s
      setJustUploadedDocs((prev) => ({ ...prev, [docId]: true }));
      setTimeout(() => {
        setJustUploadedDocs((prev) => {
          const next = { ...prev };
          delete next[docId];
          return next;
        });
      }, 1500);
      // Invalidate so the editor page gets fresh documents list
      queryClient.invalidateQueries({ queryKey: ["envelope", id] });
    },
    onError: (_err, file) => {
      setUploadingDocs((prev) => {
        const next = { ...prev };
        delete next[file.name];
        return next;
      });
      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[file.name];
        return next;
      });
    },
  });

  // ── Save & continue mutation ───────────────────────────────────────────────
  const saveAndContinueMutation = useMutation({
    mutationFn: async () => {
      // Calculate expires_at from appliedDaysUntilExpiry (days from now)
      const expiresAt = appliedDaysUntilExpiry > 0
        ? new Date(Date.now() + appliedDaysUntilExpiry * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      await updateEnvelope(id, {
        subject: subject || envelope?.subject || "Untitled",
        message,
        reminder_days: reminderDays,
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      });

      // Build a map of persisted recipients keyed by their server-assigned UUID.
      // Recipients pre-populated from the API have a real UUID as `id`; locally-
      // added rows (not yet saved) have a temp id like "r1" or "r<timestamp>".
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const existingIds = new Set(
        (envelope?.recipients ?? []).map((r) => r.id),
      );

      const seen = new Set<string>();
      for (const r of recipients) {
        const email = r.email.trim().toLowerCase();
        if (!r.name.trim() || !email) continue;
        if (seen.has(email)) continue;
        seen.add(email);

        const isPersistedRecipient = UUID_REGEX.test(r.id) && existingIds.has(r.id);
        if (isPersistedRecipient) {
          // Update existing recipient in case name/role/order was changed in the UI.
          await updateRecipientAPI(r.id, {
            name: r.name.trim(),
            email: r.email.trim(),
            role: r.role,
            routing_order: r.order,
            private_message: r.privateMessage || undefined,
          });
        } else {
          // New recipient — add to envelope.
          await addRecipientAPI(id, {
            name: r.name.trim(),
            email: r.email.trim(),
            role: r.role,
            routing_order: r.order,
            private_message: r.privateMessage || undefined,
          });
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["envelope", id] });
      router.push(`/envelope/${id}/edit`);
    },
  });

  // ── File drop ──────────────────────────────────────────────────────────────
  const handleFilesDrop = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) =>
        f.type === "application/pdf" ||
        f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        f.type === "application/msword" ||
        f.name.endsWith(".pdf") ||
        f.name.endsWith(".docx") ||
        f.name.endsWith(".doc"),
    );
    for (const file of fileArray) {
      await uploadMutation.mutateAsync(file);
    }
  };

  // ── Recipient helpers ──────────────────────────────────────────────────────
  const addRecipient = () => {
    const idx = recipients.length;
    setRecipients((prev) => [
      ...prev,
      {
        id: `r${Date.now()}`,
        name: "",
        email: "",
        role: "signer",
        order: idx + 1,
        color: getRecipientColor(idx),
      },
    ]);
  };

  const removeRecipient = (idToRemove: string) => {
    setRecipients((prev) =>
      prev
        .filter((r) => r.id !== idToRemove)
        .map((r, i) => ({ ...r, order: i + 1, color: getRecipientColor(i) })),
    );
  };

  const updateRecipient = (recipientId: string, updates: Partial<RecipientForm>) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === recipientId ? { ...r, ...updates } : r)),
    );
  };

  // ── Close all dropdowns on background click ────────────────────────────────
  const closeAllDropdowns = () => {
    setUploadDropdownOpen(false);
    setAddRecipientDropdownOpen(false);
    setRoleDropdownOpen({});
    setCustomizeDropdownOpen({});
  };

  // ── Bulk send helpers ──────────────────────────────────────────────────────
  const downloadSampleCsv = () => {
    const csv = "name,email\nJohn Smith,john@example.com\nJane Doe,jane@example.com";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sample-bulk-send.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const parseBulkCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setBulkCsvRows([]); return; }
      const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const nameIdx = header.findIndex(h => h === "name");
      const emailIdx = header.findIndex(h => h === "email");
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
        const name = nameIdx >= 0 ? cols[nameIdx] || "" : cols[0] || "";
        const email = emailIdx >= 0 ? cols[emailIdx] || "" : cols[1] || "";
        return { name, email, valid: name.length > 0 && email.includes("@") };
      });
      setBulkCsvRows(parsed);
      setBulkStep(3);
    };
    reader.readAsText(file);
  };

  // ── Proceed guard ──────────────────────────────────────────────────────────
  const hasDocuments = (uploadedFiles.length > 0) || (envelope?.documents?.length ?? 0) > 0;
  const hasValidRecipient = imOnlySigner
    ? true
    : recipients.some((r) => r.name?.trim() && r.email?.trim());
  const isUploading = Object.keys(uploadingDocs).length > 0;
  const canProceed = hasDocuments && hasValidRecipient && !isUploading;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen"
      style={{ background: "#F5F5F5" }}
      onClick={closeAllDropdowns}
    >
      {/* ══════════════════════════════════════════
          Sticky Header
      ══════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 bg-white"
        style={{
          borderBottom: "1px solid #E0E0E0",
          height: "64px",
        }}
      >
        <div
          className="flex items-center justify-between h-full"
          style={{ padding: "0 16px 0 8px" }}
        >
        {/* Left: close + title */}
        <div className="flex items-center" style={{ gap: "12px" }}>
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            style={{ width: "32px", height: "32px" }}
            aria-label="Close"
          >
            <X size={18} weight="bold" color="#333" />
          </button>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 400,
              color: "rgba(19, 0, 50, 0.9)",
              cursor: "default",
            }}
          >
            Set Up Envelope
          </span>
        </div>

        {/* Right: help + settings + CTA */}
        <div className="flex items-center" style={{ gap: "8px" }}>
          <button
            className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            style={{ width: "32px", height: "32px" }}
            aria-label="Help"
          >
            <Question size={20} weight="bold" color="#555" />
          </button>
          <button
            className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            style={{ width: "32px", height: "32px" }}
            aria-label="Settings"
            onClick={() => setAdvancedOptionsOpen(true)}
          >
            <GearSix size={20} weight="bold" color="#555" />
          </button>
          <div className="relative group">
            <button
              onClick={() => {
                if (!canProceed) {
                  setTriedToProceed(true);
                  if (isUploading) {
                    alert("Please wait for all documents to finish uploading before proceeding.");
                    return;
                  }
                  const missing: string[] = [];
                  if (!hasDocuments) missing.push("upload at least one document");
                  if (!hasValidRecipient) missing.push("fill in recipient name and email");
                  alert(`Please ${missing.join(" and ")} before proceeding.`);
                  return;
                }
                saveAndContinueMutation.mutate();
              }}
              disabled={saveAndContinueMutation.isPending || isUploading}
              className="flex items-center gap-2 text-white transition-opacity"
              style={{
                background: canProceed ? "#4C00FF" : "#9CA3AF",
                borderRadius: "4px",
                padding: "8px 20px",
                fontSize: "14px",
                fontWeight: 500,
                opacity: (saveAndContinueMutation.isPending || isUploading) ? 0.5 : 1,
                cursor: (saveAndContinueMutation.isPending || !canProceed) ? "not-allowed" : "pointer",
              }}
            >
              {saveAndContinueMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                imOnlySigner ? "Sign" : "Next: Add Fields"
              )}
            </button>
            {!canProceed && (
              <div
                className="absolute right-0 top-full mt-1 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "rgba(19,0,50,0.85)",
                  color: "#fff",
                  fontSize: "12px",
                  borderRadius: "4px",
                  padding: "6px 10px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                Upload at least one document and add a recipient
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          Scrollable content column
      ══════════════════════════════════════════ */}
      <div style={{ paddingTop: "24px", paddingBottom: "40px" }}>
        <div style={{ maxWidth: "1040px", margin: "0 auto", paddingLeft: "24px", paddingRight: "24px" }}>

          {/* ────────────────────────────────────────
              Section 1 — Add documents
          ──────────────────────────────────────── */}
          <div>
            {/* Section heading row */}
            <button
              className="w-full flex items-center justify-between text-left"
              style={{ padding: "0 0 16px" }}
              onClick={() => setDocumentsOpen((o) => !o)}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 500,
                  color: "rgba(19,0,50,0.9)",
                }}
              >
                Add documents
              </span>
              {documentsOpen ? (
                <CaretUp size={20} weight="bold" color="#555" />
              ) : (
                <CaretDown size={20} weight="bold" color="#555" />
              )}
            </button>

            {documentsOpen && (
              <>
                {/* Thin divider below heading */}
                <div style={{ height: "1px", background: "rgba(19,0,50,0.12)", marginBottom: "16px" }} />

                {/* Drop zone — wrapped in label so clicking anywhere triggers the file picker natively */}
                <label
                  htmlFor="file-upload-input"
                  className="flex flex-col items-center justify-center cursor-pointer transition-colors"
                  style={{
                    background: isDraggingFile ? "rgba(76,0,255,0.04)" : "rgba(19,0,50,0.04)",
                    borderBottom: `1px solid ${isDraggingFile ? "#4C00FF" : "rgb(169,169,169)"}`,
                    borderRadius: "0px",
                    padding: "40px 24px",
                    gap: "12px",
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files) handleFilesDrop(e.dataTransfer.files);
                  }}
                >
                  {/* Upload icon in a rounded square box like real DocuSign */}
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: "48px",
                      height: "48px",
                      background: "rgba(19,0,50,0.08)",
                      borderRadius: "8px",
                    }}
                  >
                    <HugeiconsIcon icon={ArrowUp03Icon} size={24} color="rgba(19,0,50,0.7)" />
                  </div>
                  <p style={{ fontSize: "16px", color: "rgba(19,0,50,0.9)", margin: 0 }}>
                    Drop your files here or
                  </p>

                  {/* Upload split button — stop propagation so clicking the button doesn't also trigger the label */}
                  <div
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="flex items-center gap-2 font-medium text-white"
                      style={{
                        background: "#4C00FF",
                        borderRadius: "4px",
                        padding: "8px 20px",
                        fontSize: "16px",
                        fontWeight: 500,
                      }}
                      onClick={() => setUploadDropdownOpen((o) => !o)}
                    >
                      Upload
                      <CaretDown size={14} weight="bold" color="white" />
                    </button>

                    {uploadDropdownOpen && (
                      <div
                        className="absolute left-0 mt-1 bg-white rounded shadow-lg z-10 py-1"
                        style={{
                          border: "1px solid #E0E0E0",
                          minWidth: "220px",
                          top: "100%",
                        }}
                      >
                        {/* Desktop — click the ref directly so the dropdown closing doesn't cancel the file picker */}
                        <button
                          className="w-full text-left hover:bg-gray-50 transition-colors flex items-center gap-3 cursor-pointer"
                          style={{ padding: "10px 16px", fontSize: "15px", color: "#1B0A3C" }}
                          onClick={() => {
                            // Fire the file input first, then close dropdown in the next frame
                            fileInputRef.current?.click();
                            requestAnimationFrame(() => setUploadDropdownOpen(false));
                          }}
                        >
                          <Desktop size={22} weight="bold" color="#555" />
                          Desktop
                        </button>
                        <button
                          className="w-full text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                          style={{ padding: "10px 16px", fontSize: "15px", color: "#1B0A3C" }}
                          onClick={() => { setUploadDropdownOpen(false); router.push("/templates"); }}
                        >
                          <Layout size={22} weight="bold" color="#555" />
                          Use a template
                        </button>

                        <hr style={{ border: "none", borderTop: "1px solid #E8E8E8", margin: "4px 0" }} />

                        {/* Cloud providers */}
                        <button
                          className="w-full text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                          style={{ padding: "10px 16px", fontSize: "15px", color: "#1B0A3C" }}
                          onClick={() => { setUploadDropdownOpen(false); alert("Coming soon"); }}
                        >
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#888", width: "22px", textAlign: "center", fontFamily: "sans-serif" }}>box</span>
                          Box
                        </button>
                        <button
                          className="w-full text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                          style={{ padding: "10px 16px", fontSize: "15px", color: "#1B0A3C" }}
                          onClick={() => { setUploadDropdownOpen(false); alert("Coming soon"); }}
                        >
                          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 2l4.5 3L12 4l1.5 1L18 2v4.5L15 9l3 2.5V16l-4.5-3L12 14l-1.5-1L6 16v-4.5L9 9 6 6.5V2z" fill="#999"/></svg>
                          Dropbox
                        </button>
                        <button
                          className="w-full text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                          style={{ padding: "10px 16px", fontSize: "15px", color: "#1B0A3C" }}
                          onClick={() => { setUploadDropdownOpen(false); alert("Coming soon"); }}
                        >
                          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 11l8-5-4-3-4 2.5L8 3 4 6l8 5zm0 2L4 8v6l8 5 8-5V8l-8 5z" fill="#bbb"/><path d="M12 13l-8-5v6l8 5V13z" fill="#999"/><path d="M12 13l8-5v6l-8 5V13z" fill="#888"/></svg>
                          Google Drive
                        </button>
                        <button
                          className="w-full text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                          style={{ padding: "10px 16px", fontSize: "15px", color: "#1B0A3C" }}
                          onClick={() => { setUploadDropdownOpen(false); alert("Coming soon"); }}
                        >
                          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 16a4 4 0 01-4-4c0-1.95 1.4-3.57 3.25-3.92A5.5 5.5 0 0116.5 3 5.5 5.5 0 0122 8.5c0 .28-.02.55-.07.82A3.5 3.5 0 0121 16H12z" fill="#aaa" opacity="0.7"/><path d="M8 20a3 3 0 01-3-3c0-1.3.84-2.4 2-2.82V12a5 5 0 015-5c2.34 0 4.29 1.6 4.84 3.77A3.5 3.5 0 0117.5 17.5 3.49 3.49 0 0116 17H8z" fill="#999"/></svg>
                          OneDrive
                        </button>
                      </div>
                    )}
                  </div>
                </label>

                {/* Add More Documents link — only visible after upload */}
                {uploadedFiles.length > 0 && (
                  <div className="flex justify-start mt-3">
                    <button
                      className="hover:underline cursor-pointer"
                      style={{ color: "#4C00FF", fontSize: "14px", fontWeight: 400, background: "none", border: "none", padding: 0 }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Add More Documents
                    </button>
                  </div>
                )}

                {/* In-progress uploads — indeterminate animated bar */}
                {Object.keys(uploadingDocs).map((name) => (
                  <div
                    key={name}
                    className="mt-3 rounded"
                    style={{
                      border: "1px solid #E0E0E0",
                      background: "#FAFAFA",
                      padding: "12px",
                    }}
                  >
                    <div className="flex justify-between mb-2">
                      <span
                        className="truncate"
                        style={{ fontSize: "13px", color: "rgba(19,0,50,0.9)" }}
                      >
                        {name}
                      </span>
                      <span style={{ fontSize: "12px", color: "#4C00FF", fontWeight: 500 }}>
                        Uploading...
                      </span>
                    </div>
                    <div
                      className="rounded-full overflow-hidden"
                      style={{ height: "4px", background: "#E0E0E0", position: "relative" }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          width: "40%",
                          background: "#4C00FF",
                          borderRadius: "9999px",
                          animation: "uploadIndeterminate 1.4s ease-in-out infinite",
                        }}
                      />
                    </div>
                    <style>{`
                      @keyframes uploadIndeterminate {
                        0%   { left: -40%; width: 40%; }
                        50%  { left: 60%; width: 40%; }
                        100% { left: 110%; width: 40%; }
                      }
                    `}</style>
                  </div>
                ))}

                {/* Uploaded file list */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, i) => {
                      const isJustUploaded = justUploadedDocs[file.id];
                      return (
                        <div
                          key={file.id || i}
                          className="flex items-center gap-3 rounded"
                          style={{
                            border: `1px solid ${isJustUploaded ? "#22c55e" : "#E0E0E0"}`,
                            background: isJustUploaded ? "#f0fdf4" : "#FAFAFA",
                            padding: "12px 16px",
                            transition: "border-color 0.3s, background 0.3s",
                          }}
                        >
                          {/* Icon: green checkmark flash, then PDF icon */}
                          {isJustUploaded ? (
                            <div
                              className="flex items-center justify-center flex-shrink-0 rounded"
                              style={{ background: "#dcfce7", width: "36px", height: "36px" }}
                            >
                              <svg viewBox="0 0 24 24" fill="#16a34a" width="20" height="20">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                              </svg>
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-center flex-shrink-0 rounded"
                              style={{ background: "#FFEBEE", width: "36px", height: "36px" }}
                            >
                              <svg viewBox="0 0 24 24" fill="#D93025" width="18" height="18">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className="font-medium truncate"
                              style={{ fontSize: "13px", color: "rgba(19,0,50,0.9)" }}
                            >
                              {file.name || "document.pdf"}
                            </p>
                            {isJustUploaded ? (
                              <p style={{ fontSize: "12px", color: "#16a34a", fontWeight: 500 }}>
                                Uploaded
                              </p>
                            ) : (
                              <p style={{ fontSize: "12px", color: file.size > 0 ? "#999" : "#22c55e" }}>
                                {file.size > 0 ? formatSize(file.size) : "Uploaded"}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              if (file.id) {
                                try { await deleteDocument(file.id); } catch (e) {
                                  console.error("Failed to delete document:", e);
                                }
                              }
                              setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i));
                            }}
                            className="rounded hover:bg-red-50 transition-colors"
                            style={{ padding: "6px" }}
                            aria-label="Remove file"
                          >
                            <Trash size={16} weight="bold" color="#999" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Section divider */}
          <hr style={{ border: "none", borderTop: "1px solid rgba(19,0,50,0.12)", margin: "24px 0" }} />

          {/* ────────────────────────────────────────
              Section 2 — Add recipients
          ──────────────────────────────────────── */}
          <div>
            {/* Section heading row */}
            <button
              className="w-full flex items-center justify-between text-left"
              style={{ padding: "4px 0 16px" }}
              onClick={() => setRecipientsOpen((o) => !o)}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 500,
                  color: "rgba(19,0,50,0.9)",
                }}
              >
                Add recipients
              </span>
              {recipientsOpen ? (
                <CaretUp size={20} weight="bold" color="#555" />
              ) : (
                <CaretDown size={20} weight="bold" color="#555" />
              )}
            </button>

            {recipientsOpen && (
              <div>
                {/* Thin divider below heading */}
                <div style={{ height: "1px", background: "rgba(19,0,50,0.12)", marginBottom: "16px" }} />
                {/* Options rows — stacked vertically like real DocuSign */}
                <div className="mb-4" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label className="flex items-center gap-2 cursor-pointer select-none" style={{ width: "fit-content" }}>
                    <input
                      type="checkbox"
                      checked={imOnlySigner}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setImOnlySigner(checked);
                        if (checked) {
                          const userName = currentUser?.name || envelope?.from || "";
                          const userEmail = currentUser?.email || envelope?.fromEmail || "";
                          setRecipients([{
                            id: "r1",
                            name: userName,
                            email: userEmail,
                            role: "signer",
                            order: 1,
                            color: getRecipientColor(0),
                          }]);
                        } else if (!checked) {
                          setRecipients([{
                            id: "r1",
                            name: "",
                            email: "",
                            role: "signer",
                            order: 1,
                            color: getRecipientColor(0),
                          }]);
                        }
                      }}
                      className="w-4 h-4"
                      style={{ accentColor: "#4C00FF" }}
                    />
                    <span style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)" }}>
                      I&apos;m the only signer
                    </span>
                    <Info size={15} weight="bold" color="rgba(19,0,50,0.5)" />
                  </label>

                  {!imOnlySigner && (
                    <label className="flex items-center gap-2 select-none" style={{ width: "fit-content", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={setSigningOrder}
                        onChange={(e) => setSetSigningOrder(e.target.checked)}
                        className="w-4 h-4"
                        style={{ accentColor: "#4C00FF" }}
                      />
                      <span style={{ fontSize: "14px", color: setSigningOrder ? "rgba(19,0,50,0.9)" : "rgba(19,0,50,0.5)" }}>
                        Set signing order
                      </span>
                      <button
                        className="hover:underline"
                        onClick={(e) => { e.preventDefault(); setSigningDiagramOpen(true); }}
                        style={{ fontSize: "14px", color: "#4C00FF", fontWeight: 400, background: "none", border: "none", cursor: "pointer" }}
                      >
                        View
                      </button>
                      <button
                        className="hover:underline"
                        onClick={(e) => { e.preventDefault(); setBulkModalOpen(true); setBulkStep(1); }}
                        style={{ fontSize: "14px", color: "#4C00FF", fontWeight: 400, background: "none", border: "none", cursor: "pointer" }}
                      >
                        Bulk send
                      </button>
                    </label>
                  )}
                </div>

                {/* Recipient cards — hidden when "I'm the only signer" */}
                {!imOnlySigner && (
                <div className="space-y-3" style={{ marginTop: "16px" }}>
                  {recipients.map((recipient, recipientIdx) => (
                    <div
                      key={recipient.id}
                      style={{
                        border: "1px solid rgba(19,0,50,0.12)",
                        borderLeft: `4px solid ${recipient.color}`,
                        borderRadius: "4px",
                        padding: "16px 24px",
                        background: "#fff",
                        position: "relative",
                      }}
                    >
                      {/* Reorder arrows — always visible when multiple recipients */}
                      {recipients.length > 1 && (
                        <div style={{ position: "absolute", right: "8px", top: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
                          <button
                            disabled={recipientIdx === 0}
                            onClick={() => {
                              if (recipientIdx === 0) return;
                              setRecipients((prev) => {
                                const arr = [...prev];
                                [arr[recipientIdx - 1], arr[recipientIdx]] = [arr[recipientIdx], arr[recipientIdx - 1]];
                                return arr.map((r, i) => ({ ...r, order: i + 1 }));
                              });
                            }}
                            style={{
                              width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center",
                              border: "1px solid rgba(19,0,50,0.15)", borderRadius: "3px", background: "white",
                              cursor: recipientIdx === 0 ? "default" : "pointer",
                              opacity: recipientIdx === 0 ? 0.3 : 1,
                              color: "rgba(19,0,50,0.6)",
                            }}
                            title="Move up"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L1 6h8L5 2z" fill="currentColor"/></svg>
                          </button>
                          <button
                            disabled={recipientIdx === recipients.length - 1}
                            onClick={() => {
                              if (recipientIdx === recipients.length - 1) return;
                              setRecipients((prev) => {
                                const arr = [...prev];
                                [arr[recipientIdx], arr[recipientIdx + 1]] = [arr[recipientIdx + 1], arr[recipientIdx]];
                                return arr.map((r, i) => ({ ...r, order: i + 1 }));
                              });
                            }}
                            style={{
                              width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center",
                              border: "1px solid rgba(19,0,50,0.15)", borderRadius: "3px", background: "white",
                              cursor: recipientIdx === recipients.length - 1 ? "default" : "pointer",
                              opacity: recipientIdx === recipients.length - 1 ? 0.3 : 1,
                              color: "rgba(19,0,50,0.6)",
                            }}
                            title="Move down"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L1 4h8L5 8z" fill="currentColor"/></svg>
                          </button>
                        </div>
                      )}

                      {/* Signing order input — only visible when "Set signing order" is checked */}
                      {setSigningOrder && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <label style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)" }}>Order</label>
                          <input
                            type="number"
                            min={1}
                            value={recipient.order}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value) || 1;
                              const clamped = Math.max(1, Math.min(recipients.length, raw));
                              setRecipients((prev) => {
                                const others = prev
                                  .filter((r) => r.id !== recipient.id)
                                  .sort((a, b) => a.order - b.order);
                                const result: typeof prev = [];
                                let oi = 0;
                                for (let pos = 1; pos <= prev.length; pos++) {
                                  if (pos === clamped) {
                                    result.push({ ...prev.find((r) => r.id === recipient.id)!, order: pos });
                                  } else if (oi < others.length) {
                                    result.push({ ...others[oi], order: pos });
                                    oi++;
                                  }
                                }
                                return result;
                              });
                            }}
                            style={{ width: "60px", padding: "6px 8px", border: "1px solid rgba(19,0,50,0.25)", borderRadius: "4px", fontSize: "14px" }}
                          />
                        </div>
                      )}

                      {/* Row 1: Name + Role dropdown + Customize + Remove */}
                      <div className="flex items-end gap-3 mb-3 flex-wrap">
                        {/* Name */}
                        <div className="flex-1" style={{ minWidth: "160px" }}>
                          <label
                            className="block mb-1"
                            style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", fontWeight: 400 }}
                          >
                            Name <span style={{ color: "#C0392B" }}>*</span>
                          </label>
                          <div className="relative">
                            <AddressBook
                              size={15}
                              weight="bold"
                              color="#aaa"
                              style={{
                                position: "absolute",
                                left: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                pointerEvents: "none",
                              }}
                            />
                            <input
                              type="text"
                              value={recipient.name}
                              onChange={(e) =>
                                updateRecipient(recipient.id, { name: e.target.value })
                              }
                              disabled={imOnlySigner}
                              className="w-full focus:outline-none transition-all"
                              style={{
                                paddingLeft: "36px",
                                paddingRight: "12px",
                                paddingTop: "8px",
                                paddingBottom: "8px",
                                fontSize: "16px",
                                border: `1px solid ${triedToProceed && !recipient.name?.trim() ? "#C0392B" : "rgba(19,0,50,0.25)"}`,
                                borderRadius: "4px",
                                background: imOnlySigner ? "#F3F3F3" : "#fff",
                                color: imOnlySigner ? "#888" : "rgba(19,0,50,0.9)",
                                cursor: imOnlySigner ? "not-allowed" : undefined,
                              }}
                              onFocus={(e) => {
                                if (!imOnlySigner) {
                                  e.target.style.borderColor = "#4C00FF";
                                  e.target.style.boxShadow =
                                    "0 0 0 2px rgba(76,0,255,0.12)";
                                }
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = triedToProceed && !recipient.name?.trim() ? "#C0392B" : "rgba(19,0,50,0.25)";
                                e.target.style.boxShadow = "none";
                              }}
                            />
                            {triedToProceed && !recipient.name?.trim() && (
                              <p style={{ fontSize: "11px", color: "#C0392B", marginTop: "4px" }}>
                                Required
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Role dropdown */}
                        <div
                          className="relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="flex items-center gap-1.5 bg-white transition-colors hover:bg-gray-50"
                            style={{
                              border: "1px solid rgba(19,0,50,0.25)",
                              borderRadius: "4px",
                              padding: "8px 12px",
                              fontSize: "16px",
                              fontWeight: 500,
                              color: "rgba(19,0,50,0.9)",
                              whiteSpace: "nowrap",
                            }}
                            onClick={() =>
                              setRoleDropdownOpen((prev) => ({
                                ...prev,
                                [recipient.id]: !prev[recipient.id],
                              }))
                            }
                          >
                            <PencilSimple size={16} weight="bold" color="rgba(19,0,50,0.7)" />
                            {roleLabel[recipient.role] ?? "Needs to Sign"}
                            <CaretDown size={14} weight="bold" color="rgba(19,0,50,0.7)" />
                          </button>

                          {roleDropdownOpen[recipient.id] && (
                            <div
                              className="absolute bg-white rounded shadow-lg z-10 py-1"
                              style={{
                                border: "1px solid #E0E0E0",
                                minWidth: "200px",
                                top: "100%",
                                left: 0,
                                marginTop: "2px",
                              }}
                            >
                              {(
                                [
                                  { value: "signer", label: "Needs to Sign", icon: <PencilSimple size={16} weight="bold" color="#555" /> },
                                  { value: "in_person", label: "In Person Signer", icon: <UserCircle size={16} weight="bold" color="#555" /> },
                                  { value: "cc", label: "Receives a Copy", icon: <span style={{ fontSize: "11px", fontWeight: 700, color: "#555", lineHeight: 1 }}>CC</span> },
                                  { value: "viewer", label: "Needs to View", icon: <Eye size={16} weight="bold" color="#555" /> },
                                ] as { value: string; label: string; icon: ReactNode }[]
                              ).map(({ value, label, icon }) => (
                                <button
                                  key={value}
                                  className="w-full text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
                                  style={{
                                    padding: "9px 16px",
                                    fontSize: "14px",
                                    color: "#333",
                                  }}
                                  onClick={() => {
                                    updateRecipient(recipient.id, { role: value });
                                    setRoleDropdownOpen((prev) => ({
                                      ...prev,
                                      [recipient.id]: false,
                                    }));
                                  }}
                                >
                                  <span className="flex items-center justify-center" style={{ width: "18px" }}>{icon}</span>
                                  <span style={{ flex: 1 }}>{label}</span>
                                  {recipient.role === value && (
                                    <svg viewBox="0 0 24 24" fill="#4C00FF" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Customize dropdown */}
                        <div
                          className="relative"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                            onClick={() =>
                              setCustomizeDropdownOpen((prev) => ({
                                ...prev,
                                [recipient.id]: !prev[recipient.id],
                              }))
                            }
                          >
                            Customize
                            <CaretDown size={14} weight="bold" color="rgba(19,0,50,0.7)" />
                          </button>

                          {customizeDropdownOpen[recipient.id] && (
                            <div
                              className="absolute bg-white rounded shadow-lg z-10 py-1"
                              style={{
                                border: "1px solid #E0E0E0",
                                minWidth: "260px",
                                top: "100%",
                                left: 0,
                                marginTop: "2px",
                              }}
                            >
                              <button
                                className="w-full text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                                style={{ padding: "12px 16px" }}
                                onClick={() => {
                                  setCustomizeDropdownOpen((prev) => ({ ...prev, [recipient.id]: false }));
                                  setAccessCodeInput("");
                                  setAccessCodeDialog({ recipientId: recipient.id, currentCode: "" });
                                }}
                              >
                                <Key size={20} weight="bold" color="#555" style={{ flexShrink: 0, marginTop: "2px" }} />
                                <div>
                                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#1B0A3C" }}>Add access code</div>
                                  <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>Enter a code that only you and this recipient know.</div>
                                </div>
                              </button>
                              <button
                                className="w-full text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                                style={{ padding: "12px 16px" }}
                                onClick={() => {
                                  setCustomizeDropdownOpen((prev) => ({ ...prev, [recipient.id]: false }));
                                  setPrivateMessageInput(recipient.privateMessage || "");
                                  setPrivateMessageDialog({ recipientId: recipient.id });
                                }}
                              >
                                <ChatText size={20} weight="bold" color="#555" style={{ flexShrink: 0, marginTop: "2px" }} />
                                <div>
                                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#1B0A3C" }}>Add private message</div>
                                  <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                                    {recipient.privateMessage ? "Edit personal note for this recipient." : "Include a personal note with this recipient."}
                                  </div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Private message indicator */}
                        {recipient.privateMessage && (
                          <div title={recipient.privateMessage}>
                            <label className="block font-semibold mb-1 invisible" style={{ fontSize: "12px" }}>&nbsp;</label>
                            <button
                              onClick={() => {
                                setPrivateMessageInput(recipient.privateMessage || "");
                                setPrivateMessageDialog({ recipientId: recipient.id });
                              }}
                              className="flex items-center gap-1 rounded transition-colors hover:bg-purple-50"
                              style={{ padding: "8px 10px", border: "1px solid rgba(76,0,255,0.3)", background: "rgba(76,0,255,0.05)", borderRadius: "4px" }}
                              title="Private message set — click to edit"
                            >
                              <ChatText size={14} weight="bold" color="#4C00FF" />
                              <span style={{ fontSize: "12px", color: "#4C00FF", fontWeight: 500 }}>Note</span>
                            </button>
                          </div>
                        )}

                        {/* Remove button */}
                        {recipients.length > 1 && (
                          <div>
                            <label
                              className="block font-semibold mb-1 invisible"
                              style={{ fontSize: "12px" }}
                            >
                              &nbsp;
                            </label>
                            <button
                              onClick={() => removeRecipient(recipient.id)}
                              className="flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                              style={{
                                width: "36px",
                                height: "36px",
                              }}
                              aria-label="Remove recipient"
                            >
                              <Trash size={16} weight="bold" color="#aaa" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Row 2: Email */}
                      <div style={{ marginTop: "12px" }}>
                        <label
                          className="block mb-1"
                          style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", fontWeight: 400 }}
                        >
                          Email <span style={{ color: "#C0392B" }}>*</span>
                        </label>
                        <input
                          type="email"
                          value={recipient.email}
                          onChange={(e) =>
                            updateRecipient(recipient.id, { email: e.target.value })
                          }
                          disabled={imOnlySigner}
                          className="focus:outline-none transition-all"
                          style={{
                            border: `1px solid ${triedToProceed && !recipient.email?.trim() ? "#C0392B" : "rgba(19,0,50,0.25)"}`,
                            borderRadius: "4px",
                            padding: "8px 16px",
                            fontSize: "16px",
                            width: "100%",
                            maxWidth: "460px",
                            background: imOnlySigner ? "#F3F3F3" : "#fff",
                            color: imOnlySigner ? "#888" : "rgba(19,0,50,0.9)",
                            cursor: imOnlySigner ? "not-allowed" : undefined,
                          }}
                          onFocus={(e) => {
                            if (!imOnlySigner) {
                              e.target.style.borderColor = "#4C00FF";
                              e.target.style.boxShadow = "0 0 0 2px rgba(76,0,255,0.12)";
                            }
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = triedToProceed && !recipient.email?.trim() ? "#C0392B" : "rgba(19,0,50,0.25)";
                            e.target.style.boxShadow = "none";
                          }}
                        />
                        {triedToProceed && !recipient.email?.trim() && (
                          <p style={{ fontSize: "11px", color: "#C0392B", marginTop: "4px" }}>
                            Required
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}

                {/* Add Recipient split button — hidden when user is only signer */}
                {!imOnlySigner && (
                <div
                  className="relative flex items-stretch mt-4"
                  style={{ width: "fit-content" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="flex items-center gap-2 transition-colors hover:bg-gray-50"
                    style={{
                      border: "1px solid rgba(19,0,50,0.5)",
                      borderRight: "none",
                      borderRadius: "4px 0 0 4px",
                      padding: "4px 12px",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "rgba(19,0,50,0.9)",
                      height: "40px",
                      background: "transparent",
                    }}
                    onClick={(e) => { e.stopPropagation(); addRecipient(); }}
                  >
                    <UserPlus size={18} weight="bold" />
                    Add Recipient
                  </button>
                  <button
                    className="flex items-center justify-center transition-colors hover:bg-gray-50"
                    style={{
                      border: "1px solid rgba(19,0,50,0.5)",
                      borderLeft: "1px solid rgba(19,0,50,0.6)",
                      borderRadius: "0 4px 4px 0",
                      padding: "0",
                      width: "40px",
                      height: "40px",
                      color: "rgba(19,0,50,0.9)",
                      background: "transparent",
                    }}
                    onClick={() => setAddRecipientDropdownOpen((o) => !o)}
                    aria-label="More add recipient options"
                  >
                    <CaretDown size={14} weight="bold" />
                  </button>

                  {addRecipientDropdownOpen && (
                    <div
                      className="absolute bg-white rounded shadow-lg z-10 py-1"
                      style={{
                        border: "1px solid #E0E0E0",
                        minWidth: "200px",
                        top: "100%",
                        left: 0,
                        marginTop: "2px",
                      }}
                    >
                      <button
                        className="w-full text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
                        style={{ padding: "10px 16px", fontSize: "14px", color: "#333" }}
                        onClick={() => {
                          setAddRecipientDropdownOpen(false);
                          alert("Coming soon");
                        }}
                      >
                        <AddressBook size={18} weight="bold" color="#555" />
                        Add From Contacts
                      </button>
                    </div>
                  )}
                </div>
                )}

              </div>
            )}
          </div>

          {/* Section divider */}
          <hr style={{ border: "none", borderTop: "1px solid rgba(19,0,50,0.12)", margin: "24px 0" }} />

          {/* ────────────────────────────────────────
              Section 3 — Add message
          ──────────────────────────────────────── */}
          <div>
            {/* Section heading row */}
            <button
              className="w-full flex items-center justify-between text-left"
              style={{ padding: "4px 0 16px" }}
              onClick={() => setMessageOpen((o) => !o)}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 500,
                  color: "rgba(19,0,50,0.9)",
                }}
              >
                Add message
              </span>
              {messageOpen ? (
                <CaretUp size={20} weight="bold" color="#555" />
              ) : (
                <CaretDown size={20} weight="bold" color="#555" />
              )}
            </button>

            {messageOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Thin divider below heading */}
                <div style={{ height: "1px", background: "rgba(19,0,50,0.12)" }} />
                {/* Subject */}
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: "4px" }}>
                    <label
                      style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", fontWeight: 400 }}
                    >
                      Subject <span style={{ color: "#C0392B" }}>*</span>
                    </label>
                    <span style={{ fontSize: "12px", color: "rgba(19,0,50,0.7)", fontWeight: 500 }}>
                      {subject.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    value={subject}
                    maxLength={100}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Complete with Docusign:"
                    className="w-full focus:outline-none transition-all"
                    style={{
                      border: "1px solid rgba(19,0,50,0.25)",
                      borderRadius: "4px",
                      padding: "8px 16px",
                      fontSize: "16px",
                      color: "rgba(19,0,50,0.9)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#4C00FF";
                      e.target.style.boxShadow = "0 0 0 2px rgba(76,0,255,0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(19,0,50,0.25)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Message */}
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: "4px" }}>
                    <label
                      style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", fontWeight: 400 }}
                    >
                      Message
                    </label>
                    <span style={{ fontSize: "12px", color: "rgba(19,0,50,0.7)", fontWeight: 500 }}>
                      {message.length}/10000
                    </span>
                  </div>
                  <textarea
                    value={message}
                    maxLength={10000}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter Message"
                    rows={4}
                    className="w-full focus:outline-none transition-all resize-none"
                    style={{
                      border: "1px solid rgba(19,0,50,0.25)",
                      borderRadius: "4px",
                      padding: "8px 16px",
                      fontSize: "16px",
                      color: "rgba(19,0,50,0.9)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#4C00FF";
                      e.target.style.boxShadow = "0 0 0 2px rgba(76,0,255,0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(19,0,50,0.25)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Frequency of reminders */}
                <div className="flex items-center" style={{ gap: "12px" }}>
                  <label style={{ fontSize: "16px", color: "rgba(19,0,50,0.9)", fontWeight: 400 }}>
                    Frequency of reminders
                  </label>
                  <select
                    className="bg-white focus:outline-none"
                    value={reminderDays}
                    onChange={(e) => setReminderDays(parseInt(e.target.value) || 0)}
                    style={{
                      border: "1px solid rgba(19,0,50,0.25)",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      fontSize: "16px",
                      color: "rgba(19,0,50,0.9)",
                    }}
                  >
                    <option value="0">Every 0 days</option>
                    <option value="1">Every 1 day</option>
                    <option value="2">Every 2 days</option>
                    <option value="3">Every 3 days</option>
                    <option value="7">Every 7 days</option>
                  </select>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Hidden file input — lives at page level so it's always in the DOM, never removed by dropdown close */}
      <input
        ref={fileInputRef}
        id="file-upload-input"
        type="file"
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        multiple
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
        onChange={(e) => {
          if (e.target.files) handleFilesDrop(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Access Code Dialog */}
      {accessCodeDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setAccessCodeDialog(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl"
            style={{ width: "420px", maxWidth: "90vw", padding: "28px", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key size={18} weight="bold" color="#4C00FF" />
                <h2 style={{ fontSize: "17px", fontWeight: 600, color: "rgba(19,0,50,0.9)", margin: 0 }}>
                  Set Access Code
                </h2>
              </div>
              <button
                onClick={() => setAccessCodeDialog(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} weight="bold" color="#555" />
              </button>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(19,0,50,0.6)", marginBottom: "16px" }}>
              The recipient will need to enter this code before they can view or sign the document.
            </p>
            <input
              type="text"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              placeholder="Enter access code…"
              autoFocus
              className="w-full focus:outline-none"
              style={{
                border: "1px solid rgba(19,0,50,0.25)",
                borderRadius: "4px",
                padding: "10px 14px",
                fontSize: "15px",
                color: "rgba(19,0,50,0.9)",
                marginBottom: "20px",
                letterSpacing: "0.05em",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#4C00FF"; e.target.style.boxShadow = "0 0 0 2px rgba(76,0,255,0.12)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(19,0,50,0.25)"; e.target.style.boxShadow = "none"; }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && accessCodeInput.trim() && accessCodeDialog) {
                  const recipId = accessCodeDialog.recipientId;
                  // If the recipient has a real DB id (not a temp r... id), call API
                  if (!recipId.startsWith("r")) {
                    setRecipientAccessCode(recipId, accessCodeInput.trim()).catch(() => {});
                  }
                  setAccessCodeDialog(null);
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAccessCodeDialog(null)}
                style={{
                  padding: "8px 18px", borderRadius: "4px",
                  border: "1px solid rgba(19,0,50,0.25)", background: "white",
                  color: "rgba(19,0,50,0.9)", fontSize: "14px", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!accessCodeInput.trim() || !accessCodeDialog) return;
                  const recipId = accessCodeDialog.recipientId;
                  if (!recipId.startsWith("r")) {
                    setRecipientAccessCode(recipId, accessCodeInput.trim()).catch(() => {});
                  }
                  setAccessCodeDialog(null);
                }}
                disabled={!accessCodeInput.trim()}
                style={{
                  padding: "8px 18px", borderRadius: "4px",
                  background: "#4C00FF", color: "white",
                  fontSize: "14px", fontWeight: 500, cursor: "pointer",
                  border: "none", opacity: accessCodeInput.trim() ? 1 : 0.4,
                }}
              >
                Save Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Message Dialog */}
      {privateMessageDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setPrivateMessageDialog(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl"
            style={{ width: "440px", maxWidth: "90vw", padding: "28px", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ChatText size={18} weight="bold" color="#4C00FF" />
                <h2 style={{ fontSize: "17px", fontWeight: 600, color: "rgba(19,0,50,0.9)", margin: 0 }}>
                  Private Message
                </h2>
              </div>
              <button
                onClick={() => setPrivateMessageDialog(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} weight="bold" color="#555" />
              </button>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(19,0,50,0.6)", marginBottom: "16px" }}>
              This note will be included in the email sent to this recipient. It is private and not visible to other recipients.
            </p>
            <textarea
              value={privateMessageInput}
              onChange={(e) => setPrivateMessageInput(e.target.value)}
              placeholder="Add a personal note for this recipient…"
              autoFocus
              rows={4}
              className="w-full focus:outline-none resize-none"
              style={{
                border: "1px solid rgba(19,0,50,0.25)",
                borderRadius: "4px",
                padding: "10px 14px",
                fontSize: "14px",
                color: "rgba(19,0,50,0.9)",
                marginBottom: "20px",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#4C00FF"; e.target.style.boxShadow = "0 0 0 2px rgba(76,0,255,0.12)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(19,0,50,0.25)"; e.target.style.boxShadow = "none"; }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPrivateMessageDialog(null)}
                style={{
                  padding: "8px 18px", borderRadius: "4px",
                  border: "1px solid rgba(19,0,50,0.25)", background: "white",
                  color: "rgba(19,0,50,0.9)", fontSize: "14px", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!privateMessageDialog) return;
                  const recipId = privateMessageDialog.recipientId;
                  const msg = privateMessageInput.trim();
                  updateRecipient(recipId, { privateMessage: msg || undefined });
                  if (!recipId.startsWith("r")) {
                    setRecipientPrivateMessage(recipId, msg).catch(() => {});
                  }
                  setPrivateMessageDialog(null);
                }}
                style={{
                  padding: "8px 18px", borderRadius: "4px",
                  background: "#4C00FF", color: "white",
                  fontSize: "14px", fontWeight: 500, cursor: "pointer",
                  border: "none",
                }}
              >
                Save Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signing Order Diagram Modal */}
      {signingDiagramOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSigningDiagramOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl"
            style={{ width: "520px", maxWidth: "90vw", padding: "32px", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontSize: "22px", fontWeight: 500, color: "rgba(19,0,50,0.9)", margin: 0 }}>
                Signing Order Diagram
              </h2>
              <button
                onClick={() => setSigningDiagramOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} weight="bold" color="#555" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
              {/* SENDER */}
              <div className="flex items-center gap-4" style={{ width: "100%", padding: "12px 0" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(19,0,50,0.5)", letterSpacing: "0.05em", width: "100px" }}>SENDER</span>
                <div style={{ flex: 1, borderBottom: "2px dashed rgba(19,0,50,0.12)" }} />
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(19,0,50,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 600, color: "rgba(19,0,50,0.6)" }}>
                  {currentUser?.name?.split(" ").map(n => n[0]).join("").substring(0, 2) || "ME"}
                </div>
              </div>

              {/* Vertical connector */}
              <div style={{ width: "2px", height: "20px", background: "rgba(19,0,50,0.12)", marginLeft: "auto", marginRight: "20px" }} />

              {/* Recipients */}
              {recipients.filter(r => r.name || r.email).map((r, i) => (
                <div key={r.id}>
                  <div className="flex items-center gap-4" style={{ width: "100%", padding: "12px 0" }}>
                    <span style={{ fontSize: "14px", color: "rgba(19,0,50,0.7)", width: "100px" }}>{r.order}</span>
                    <div style={{ flex: 1, borderBottom: "2px dashed rgba(19,0,50,0.12)" }} />
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: r.color || "rgba(19,0,50,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <PencilSimple size={18} weight="bold" color="white" />
                    </div>
                  </div>
                  {i < recipients.filter(r2 => r2.name || r2.email).length - 1 && (
                    <div style={{ width: "2px", height: "20px", background: "rgba(19,0,50,0.12)", marginLeft: "auto", marginRight: "20px" }} />
                  )}
                </div>
              ))}

              {/* Vertical connector */}
              <div style={{ width: "2px", height: "20px", background: "rgba(19,0,50,0.12)", marginLeft: "auto", marginRight: "20px" }} />

              {/* COMPLETED */}
              <div className="flex items-center gap-4" style={{ width: "100%", padding: "12px 0" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(19,0,50,0.5)", letterSpacing: "0.05em", width: "100px" }}>COMPLETED</span>
                <div style={{ flex: 1, borderBottom: "2px dashed rgba(19,0,50,0.12)" }} />
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(19,0,50,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="rgba(19,0,50,0.4)" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSigningDiagramOpen(false)}
                style={{
                  padding: "8px 24px",
                  borderRadius: "4px",
                  border: "1px solid rgba(19,0,50,0.25)",
                  background: "white",
                  color: "rgba(19,0,50,0.9)",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Advanced Options slide-out panel
      ══════════════════════════════════════════ */}
      {/* Backdrop */}
      {advancedOptionsOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.25)" }}
          onClick={() => setAdvancedOptionsOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full bg-white z-50 flex flex-col"
        style={{
          width: "400px",
          maxWidth: "100vw",
          borderLeft: "1px solid #E0E0E0",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
          transform: advancedOptionsOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "18px 20px", borderBottom: "1px solid #E0E0E0" }}
        >
          <span style={{ fontSize: "17px", fontWeight: 600, color: "rgba(19,0,50,0.9)" }}>
            Advanced Options
          </span>
          <button
            onClick={() => setAdvancedOptionsOpen(false)}
            className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            style={{ width: "32px", height: "32px" }}
            aria-label="Close"
          >
            <X size={18} weight="bold" color="#555" />
          </button>
        </div>

        {/* Panel body — scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px" }}>

          {/* ── Recipient Privileges ── */}
          <div style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(19,0,50,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
              Recipient Privileges
            </p>
            <label className="flex items-start gap-3 cursor-pointer select-none" style={{ marginBottom: "12px" }}>
              <input
                type="checkbox"
                checked={advSignOnPaper}
                onChange={(e) => setAdvSignOnPaper(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0"
                style={{ accentColor: "#4C00FF" }}
              />
              <span style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", lineHeight: "1.4" }}>
                Recipients can sign on paper
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={advChangeSigningResponsibility}
                onChange={(e) => setAdvChangeSigningResponsibility(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0"
                style={{ accentColor: "#4C00FF" }}
              />
              <span style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", lineHeight: "1.4" }}>
                Recipients can change signing responsibility or assign a delegate
              </span>
            </label>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(19,0,50,0.10)", marginBottom: "24px" }} />

          {/* ── Reminders ── */}
          <div style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(19,0,50,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
              Reminders
            </p>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={advAutoReminders}
                onChange={(e) => setAdvAutoReminders(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0"
                style={{ accentColor: "#4C00FF" }}
              />
              <span style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", lineHeight: "1.4" }}>
                Turn on auto reminders
              </span>
            </label>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(19,0,50,0.10)", marginBottom: "24px" }} />

          {/* ── Expiration ── */}
          <div style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(19,0,50,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
              Expiration
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <label style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", flex: 1 }}>
                Days until envelope expires
              </label>
              <input
                type="number"
                min={1}
                value={advDaysUntilExpiry}
                onChange={(e) => setAdvDaysUntilExpiry(parseInt(e.target.value) || 120)}
                className="focus:outline-none"
                style={{
                  width: "80px",
                  padding: "6px 10px",
                  border: "1px solid rgba(19,0,50,0.25)",
                  borderRadius: "4px",
                  fontSize: "14px",
                  color: "rgba(19,0,50,0.9)",
                  textAlign: "right",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#4C00FF"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(19,0,50,0.25)"; }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <label style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", flex: 1 }}>
                Expiration Alert / Send alert
              </label>
              <input
                type="number"
                min={0}
                value={advExpirationAlert}
                onChange={(e) => setAdvExpirationAlert(parseInt(e.target.value) || 0)}
                className="focus:outline-none"
                style={{
                  width: "80px",
                  padding: "6px 10px",
                  border: "1px solid rgba(19,0,50,0.25)",
                  borderRadius: "4px",
                  fontSize: "14px",
                  color: "rgba(19,0,50,0.9)",
                  textAlign: "right",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#4C00FF"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(19,0,50,0.25)"; }}
              />
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(19,0,50,0.10)", marginBottom: "24px" }} />

          {/* ── Mobile-Friendly ── */}
          <div style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(19,0,50,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
              Mobile-Friendly
            </p>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={advResponsiveSigning}
                onChange={(e) => setAdvResponsiveSigning(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0"
                style={{ accentColor: "#4C00FF" }}
              />
              <span style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", lineHeight: "1.4" }}>
                Enable Responsive Signing for this envelope
              </span>
            </label>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(19,0,50,0.10)", marginBottom: "24px" }} />

          {/* ── Comments ── */}
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(19,0,50,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
              Comments
            </p>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={advAllowComments}
                onChange={(e) => setAdvAllowComments(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0"
                style={{ accentColor: "#4C00FF" }}
              />
              <span style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", lineHeight: "1.4" }}>
                Allow comments
              </span>
            </label>
          </div>
        </div>

        {/* Panel footer */}
        <div
          className="flex-shrink-0 flex justify-end gap-3"
          style={{ padding: "16px 20px", borderTop: "1px solid #E0E0E0" }}
        >
          <button
            onClick={() => setAdvancedOptionsOpen(false)}
            className="hover:bg-gray-50 transition-colors"
            style={{
              padding: "8px 20px",
              borderRadius: "4px",
              border: "1px solid rgba(19,0,50,0.25)",
              background: "white",
              color: "rgba(19,0,50,0.9)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setAppliedDaysUntilExpiry(advDaysUntilExpiry);
              setAdvancedOptionsOpen(false);
            }}
            style={{
              padding: "8px 20px",
              borderRadius: "4px",
              background: "#4C00FF",
              color: "white",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Bulk Send Modal
      ══════════════════════════════════════════ */}
      {bulkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setBulkModalOpen(false)}
        >
          <div
            className="bg-white"
            style={{ width: "560px", maxWidth: "90vw", borderRadius: "12px", padding: "32px", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Step 1: Choose method ── */}
            {bulkStep === 1 && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: 500, color: "rgba(19,0,50,0.9)", margin: 0 }}>
                    Bulk send
                  </h2>
                  <button
                    onClick={() => setBulkModalOpen(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                  >
                    <X size={20} weight="bold" color="#555" />
                  </button>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(19,0,50,0.55)", marginBottom: "24px" }}>
                  Choose how you&apos;d like to upload your recipient list.
                </p>

                {/* Method cards */}
                <div style={{ display: "flex", gap: "16px", marginBottom: "28px" }}>
                  {/* Enter manually */}
                  <button
                    onClick={() => setBulkMethod("manual")}
                    style={{
                      flex: 1,
                      border: `1.5px solid ${bulkMethod === "manual" ? "#4C00FF" : "rgba(19,0,50,0.15)"}`,
                      background: bulkMethod === "manual" ? "rgba(76,0,255,0.04)" : "#fff",
                      borderRadius: "8px",
                      padding: "16px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: `2px solid ${bulkMethod === "manual" ? "#4C00FF" : "rgba(19,0,50,0.3)"}`,
                        flexShrink: 0,
                        marginTop: "2px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {bulkMethod === "manual" && (
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4C00FF" }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 500, color: "rgba(19,0,50,0.9)", marginBottom: "4px" }}>
                        Enter manually
                      </div>
                      <div style={{ fontSize: "13px", color: "rgba(19,0,50,0.55)", lineHeight: "1.4" }}>
                        Best for shorter lists. Type each recipient&apos;s name, role, and email address.
                      </div>
                    </div>
                  </button>

                  {/* Upload a CSV */}
                  <button
                    onClick={() => setBulkMethod("csv")}
                    style={{
                      flex: 1,
                      border: `1.5px solid ${bulkMethod === "csv" ? "#4C00FF" : "rgba(19,0,50,0.15)"}`,
                      background: bulkMethod === "csv" ? "rgba(76,0,255,0.04)" : "#fff",
                      borderRadius: "8px",
                      padding: "16px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: `2px solid ${bulkMethod === "csv" ? "#4C00FF" : "rgba(19,0,50,0.3)"}`,
                        flexShrink: 0,
                        marginTop: "2px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {bulkMethod === "csv" && (
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4C00FF" }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 500, color: "rgba(19,0,50,0.9)", marginBottom: "4px" }}>
                        Upload a CSV
                      </div>
                      <div style={{ fontSize: "13px", color: "rgba(19,0,50,0.55)", lineHeight: "1.4" }}>
                        Required for 10+ recipients. We&apos;ll provide a sample for formatting help.
                      </div>
                    </div>
                  </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={downloadSampleCsv}
                    style={{ fontSize: "14px", color: "#4C00FF", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    ↓ Sample CSV
                  </button>
                  <button
                    onClick={() => {
                      if (bulkMethod === "manual") {
                        setBulkModalOpen(false);
                      } else {
                        setBulkStep(2);
                      }
                    }}
                    style={{
                      background: "#4C00FF",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "8px 24px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2: Upload CSV ── */}
            {bulkStep === 2 && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: 500, color: "rgba(19,0,50,0.9)", margin: 0 }}>
                    Upload a CSV
                  </h2>
                  <button
                    onClick={() => setBulkModalOpen(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                  >
                    <X size={20} weight="bold" color="#555" />
                  </button>
                </div>

                {/* Drop zone */}
                <label
                  className="flex flex-col items-center justify-center cursor-pointer transition-colors"
                  style={{
                    background: "rgba(19,0,50,0.04)",
                    borderBottom: "1px solid rgb(169,169,169)",
                    borderRadius: "0px",
                    padding: "40px 24px",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
                      setBulkCsvFile(file);
                      parseBulkCsv(file);
                    }
                  }}
                >
                  <p style={{ fontSize: "16px", color: "rgba(19,0,50,0.7)", margin: 0 }}>
                    Drag and drop file here
                  </p>
                  <p style={{ fontSize: "13px", color: "rgba(19,0,50,0.4)", margin: 0 }}>
                    Supported Formats: CSV
                  </p>
                  <button
                    onClick={(e) => { e.preventDefault(); bulkCsvInputRef.current?.click(); }}
                    style={{
                      marginTop: "4px",
                      background: "#4C00FF",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "8px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Select File
                  </button>
                </label>

                <p style={{ fontSize: "13px", color: "rgba(19,0,50,0.55)", marginBottom: "24px" }}>
                  For help formatting your list, download the{" "}
                  <button
                    onClick={downloadSampleCsv}
                    style={{ fontSize: "13px", color: "#4C00FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    ↓ Sample CSV
                  </button>
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setBulkMethod("manual"); setBulkStep(1); }}
                    style={{ fontSize: "14px", color: "#4C00FF", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Enter Manually Instead
                  </button>
                  <button
                    disabled={!bulkCsvFile}
                    style={{
                      background: "#4C00FF",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "8px 24px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: bulkCsvFile ? "pointer" : "not-allowed",
                      opacity: bulkCsvFile ? 1 : 0.4,
                    }}
                  >
                    Next
                  </button>
                </div>

                {/* Hidden CSV file input */}
                <input
                  ref={bulkCsvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setBulkCsvFile(file);
                    parseBulkCsv(file);
                    e.target.value = "";
                  }}
                />
              </>
            )}

            {/* ── Step 3: Review recipients ── */}
            {bulkStep === 3 && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: "16px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: 500, color: "rgba(19,0,50,0.9)", margin: 0 }}>
                    Recipients
                  </h2>
                  <button
                    onClick={() => setBulkModalOpen(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                  >
                    <X size={20} weight="bold" color="#555" />
                  </button>
                </div>

                {/* Tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: "0",
                    borderBottom: "1px solid rgba(19,0,50,0.12)",
                    marginBottom: "16px",
                  }}
                >
                  {(["all", "errors"] as const).map((tab) => {
                    const count = tab === "all" ? bulkCsvRows.length : bulkCsvRows.filter(r => !r.valid).length;
                    const label = tab === "all" ? `All Recipients (${count})` : `Errors (${count})`;
                    const isActive = bulkActiveTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setBulkActiveTab(tab)}
                        style={{
                          padding: "8px 16px",
                          fontSize: "14px",
                          color: isActive ? "#4C00FF" : "rgba(19,0,50,0.55)",
                          background: "none",
                          border: "none",
                          borderBottom: isActive ? "2px solid #4C00FF" : "2px solid transparent",
                          cursor: "pointer",
                          fontWeight: isActive ? 500 : 400,
                          marginBottom: "-1px",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Table */}
                <div style={{ border: "1px solid rgba(19,0,50,0.12)", borderRadius: "4px", overflow: "hidden", maxHeight: "300px", overflowY: "auto", marginBottom: "24px" }}>
                  <table className="w-full" style={{ borderCollapse: "collapse" }}>
                    <thead style={{ background: "rgba(19,0,50,0.04)", position: "sticky", top: 0 }}>
                      <tr>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "rgba(19,0,50,0.5)", width: "40px" }}>#</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "rgba(19,0,50,0.5)" }}>Name</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "rgba(19,0,50,0.5)" }}>Email</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "rgba(19,0,50,0.5)" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkCsvRows
                        .filter(r => bulkActiveTab === "all" || !r.valid)
                        .map((r, i) => (
                          <tr key={i} style={{ borderTop: "1px solid rgba(19,0,50,0.06)" }}>
                            <td style={{ padding: "8px 12px", color: "rgba(19,0,50,0.4)", fontSize: "13px" }}>{i + 1}</td>
                            <td style={{ padding: "8px 12px", color: "rgba(19,0,50,0.9)", fontSize: "13px" }}>{r.name || "—"}</td>
                            <td style={{ padding: "8px 12px", color: "rgba(19,0,50,0.9)", fontSize: "13px" }}>{r.email || "—"}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  background: r.valid ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                  color: r.valid ? "#16a34a" : "#dc2626",
                                }}
                              >
                                {r.valid ? "Valid" : "Invalid"}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setBulkStep(2); }}
                    style={{ fontSize: "14px", color: "#4C00FF", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Back to Upload
                  </button>
                  <button
                    onClick={() => {
                      const validRows = bulkCsvRows.filter(r => r.valid);
                      if (validRows.length === 0) return;
                      const newRecipients: RecipientForm[] = validRows.map((r, i) => ({
                        id: `bulk-${Date.now()}-${i}`,
                        name: r.name,
                        email: r.email,
                        role: "signer",
                        order: i + 1,
                        color: getRecipientColor(i),
                      }));
                      setRecipients(newRecipients);
                      setBulkModalOpen(false);
                      setBulkCsvFile(null);
                      setBulkCsvRows([]);
                      setBulkActiveTab("all");
                    }}
                    disabled={bulkCsvRows.filter(r => r.valid).length === 0}
                    style={{
                      background: "#4C00FF",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "8px 24px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: bulkCsvRows.filter(r => r.valid).length === 0 ? "not-allowed" : "pointer",
                      opacity: bulkCsvRows.filter(r => r.valid).length === 0 ? 0.4 : 1,
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
