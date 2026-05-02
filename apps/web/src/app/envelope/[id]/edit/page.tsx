"use client";

import { useReducer, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { getEnvelope, saveFields, sendEnvelope } from "@/features/envelopes/api";
import { getEnvelopeFields } from "@/features/editor/api";
import { editorReducer } from "@/features/editor/state/editorReducer";
import { PrepareToolbar } from "@/features/editor/components/PrepareToolbar";
import { PageNavigator } from "@/features/editor/components/PageNavigator";
import { DocumentCanvas } from "@/features/editor/components/DocumentCanvas";
import { FieldPalette } from "@/features/editor/components/FieldPalette";
import { getRecipientColor } from "@/lib/utils";
import type { FieldType, PlacedField, EditorState } from "@/features/editor/model/types";
import { FIELD_LABELS, FIELD_DEFAULT_SIZES } from "@/features/editor/model/types";

// ── Preview Modal ────────────────────────────────────────────────────────────

const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = 1056;

function PreviewModal({
  fields,
  recipients,
  pageCount,
  pageImageUrls,
  onClose,
}: {
  fields: import("@/features/editor/model/types").PlacedField[];
  recipients: import("@/features/editor/model/types").EditorRecipient[];
  pageCount: number;
  pageImageUrls: Record<number, string>;
  onClose: () => void;
}) {
  const [viewingAs, setViewingAs] = useState(recipients[0]?.id ?? "");

  const activeRecipient = recipients.find((r) => r.id === viewingAs) ?? recipients[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#F5F5F5" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0 bg-white"
        style={{ height: "52px", borderBottom: "1px solid rgba(19,0,50,0.12)" }}
      >
        {/* Left: close */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold hover:opacity-75 transition-opacity"
          style={{ color: "rgba(19,0,50,0.8)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Preview
        </button>

        {/* Center: viewing-as dropdown */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "13px", color: "rgba(19,0,50,0.55)" }}>Viewing as:</span>
          {recipients.length > 0 ? (
            <select
              value={viewingAs}
              onChange={(e) => setViewingAs(e.target.value)}
              className="focus:outline-none bg-white"
              style={{
                border: "1px solid rgba(19,0,50,0.25)",
                borderRadius: "4px",
                padding: "5px 10px",
                fontSize: "13px",
                color: "rgba(19,0,50,0.9)",
                fontWeight: 500,
              }}
            >
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.email || "Recipient"}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: "13px", color: "rgba(19,0,50,0.55)" }}>No recipients</span>
          )}
        </div>

        {/* Right: read-only badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded"
          style={{ background: "#F0EEFF", fontSize: "12px", fontWeight: 500, color: "#4C00FF" }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
          Read-only Preview
        </div>
      </div>

      {/* Scrollable document area */}
      <div className="flex-1 overflow-auto py-8 px-4">
        {Array.from({ length: pageCount }).map((_, idx) => {
          const pageNum = idx + 1;
          const pageFields = fields.filter((f) => f.page === pageNum);
          return (
            <div key={pageNum} className="flex justify-center mb-10">
              <div
                className="relative flex-shrink-0"
                style={{
                  width: PAGE_WIDTH_PX,
                  height: PAGE_HEIGHT_PX,
                  background: "white",
                  boxShadow: "0 2px 12px rgba(19,0,50,0.10)",
                  border: "1px solid rgba(19,0,50,0.12)",
                }}
              >
                {/* Page image */}
                {pageImageUrls[pageNum] ? (
                  <img
                    src={pageImageUrls[pageNum]}
                    alt={`Page ${pageNum}`}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 pointer-events-none select-none"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 27px, #F5F5F5 27px, #F5F5F5 28px)",
                    }}
                  >
                    <div className="p-12 space-y-3">
                      <div className="text-center mb-10">
                        <div className="h-4 bg-gray-200 rounded w-56 mx-auto mb-3" />
                        <div className="h-2.5 bg-gray-100 rounded w-40 mx-auto mb-1" />
                        <div className="h-2 bg-gray-100 rounded w-48 mx-auto" />
                      </div>
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className={`h-2 bg-gray-100 rounded ${i % 3 === 2 ? "w-4/5" : "w-full"}`} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Read-only field overlays */}
                {pageFields.map((field) => {
                  const recipient = recipients.find((r) => r.id === field.recipientId);
                  const color = recipient?.color ?? "#4C00FF";
                  const isActive = !viewingAs || field.recipientId === viewingAs;
                  return (
                    <div
                      key={field.id}
                      className="absolute flex items-center justify-center pointer-events-none select-none"
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${field.width}%`,
                        height: `${field.height}%`,
                        background: isActive ? `${color}22` : `${color}0A`,
                        border: `2px solid ${isActive ? color : color + "55"}`,
                        borderRadius: "3px",
                        opacity: isActive ? 1 : 0.45,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {/* Recipient color strip on left */}
                      <div
                        className="absolute left-0 top-0 bottom-0"
                        style={{ width: "3px", background: color, borderRadius: "1px 0 0 1px" }}
                      />
                      <span
                        className="text-xs font-semibold truncate px-2"
                        style={{ color, fontSize: "11px" }}
                      >
                        {recipient?.name
                          ? `${recipient.name} — ${field.type.replace("_", " ")}`
                          : field.type.replace("_", " ")}
                        {field.required && (
                          <span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span>
                        )}
                      </span>
                    </div>
                  );
                })}

                {/* "Sign Here" start-indicator for signature fields belonging to active recipient */}
                {pageFields
                  .filter(
                    (f) =>
                      (f.type === "signature" || f.type === "initial") &&
                      (!viewingAs || f.recipientId === viewingAs),
                  )
                  .map((f) => (
                    <div
                      key={`start-${f.id}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${f.x}%`,
                        top: `${f.y + f.height}%`,
                        transform: "translateY(2px)",
                      }}
                    >
                      <div
                        className="flex items-center gap-1 px-2 py-0.5"
                        style={{
                          background: activeRecipient?.color ?? "#4C00FF",
                          borderRadius: "0 0 3px 3px",
                          fontSize: "9px",
                          fontWeight: 700,
                          color: "white",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="white" width="8" height="8">
                          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                        </svg>
                        Sign Here
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-center flex-shrink-0 bg-white"
        style={{ height: "36px", borderTop: "1px solid rgba(19,0,50,0.10)", gap: "16px" }}
      >
        <span style={{ fontSize: "11px", color: "rgba(19,0,50,0.4)" }}>
          Powered by DocuSign Clone
        </span>
        <button
          onClick={onClose}
          className="hover:underline"
          style={{ fontSize: "11px", color: "#4C00FF", background: "none", border: "none", cursor: "pointer" }}
        >
          Back to Editor
        </button>
      </div>
    </div>
  );
}

// ── Welcome Modal ────────────────────────────────────────────────────────────

function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Purple header accent */}
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #1B0A3C, #4C00FF)" }} />
        <div className="px-8 py-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
            style={{ background: "#F0EEFF" }}
          >
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#4C00FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" stroke="#4C00FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#1B0A3C" }}>
            Build agreements with ease
          </h2>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Get started by placing fields on your document. Recipients will fill them in when they sign.
          </p>
          <ul className="space-y-3 mb-8">
            {[
              "Drag and drop fields to collect data and signatures",
              "Preview agreements before sending",
            ].map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm text-gray-600">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "#F0EEFF" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" width="11" height="11">
                    <path d="M20 6L9 17l-5-5" stroke="#4C00FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {bullet}
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors hover:bg-gray-50"
              style={{ borderColor: "#1B0A3C", color: "#1B0A3C" }}
            >
              Learn More
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "#4C00FF" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── No-Fields Modal ──────────────────────────────────────────────────────────

function NoFieldsModal({
  onSendAnyway,
  onAddFields,
}: {
  onSendAnyway: () => void;
  onAddFields: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onAddFields} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #1B0A3C, #4C00FF)" }} />
        <div className="px-7 py-7">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "#FFF7ED" }}
          >
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-1.5" style={{ color: "#1B0A3C" }}>
            Add fields for your recipients
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Fields show your recipients where to sign or enter information. You can still send without them.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={onSendAnyway}
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors hover:bg-gray-50"
              style={{ borderColor: "#D0D0D0", color: "#555" }}
            >
              Send Without Fields
            </button>
            <button
              onClick={onAddFields}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "#4C00FF" }}
            >
              Add Fields
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Success Toast ────────────────────────────────────────────────────────────

function SuccessToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white text-sm font-semibold animate-in fade-in slide-in-from-bottom-4"
      style={{ background: "#00B851", minWidth: "260px" }}>
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="flex-shrink-0">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
      {message}
    </div>
  );
}

// ── Editor Page ──────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [draggedFieldType, setDraggedFieldType] = useState<FieldType | null>(null);
  const [showNoFieldsModal, setShowNoFieldsModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  // Track latest pointer position during drag so we can place accurately on drop
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Load envelope data
  const { data: envelope, isLoading } = useQuery({
    queryKey: ["envelope", id],
    queryFn: () => getEnvelope(id),
  });

  // Load existing fields
  const { data: existingFields } = useQuery({
    queryKey: ["envelope-fields", id],
    queryFn: () => getEnvelopeFields(id),
    enabled: !!envelope,
  });

  const editorRecipients = (envelope?.recipients ?? []).map((r, idx) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    order: (r as any).order ?? idx + 1,
    color: getRecipientColor(idx),
  }));

  // Build page image URLs from ALL documents (concatenated).
  // Also build a DocumentSection array for the PageNavigator so it can show
  // each document separately with its own name and page count.
  const allDocs = envelope?.documents ?? [];
  let totalPageCount = 0;
  const pageImageUrls: Record<number, string> = {};
  const navigatorDocuments: { id: string; name: string; pageCount: number; startPage: number }[] = [];
  for (const doc of allDocs) {
    const docPages = doc.pageCount ?? 1;
    const sectionStart = totalPageCount + 1;
    for (let p = 1; p <= docPages; p++) {
      totalPageCount++;
      pageImageUrls[totalPageCount] = `/api/documents/${doc.id}/pages/${p}`;
    }
    navigatorDocuments.push({
      id: doc.id,
      name: doc.name || doc.original_filename || "Document",
      pageCount: docPages,
      startPage: sectionStart,
    });
  }
  const pageCount = Math.max(1, totalPageCount);

  const [state, dispatch] = useReducer(editorReducer, {
    envelopeId: id,
    documents: [],
    recipients: editorRecipients,
    fields: [],
    selectedFieldId: null,
    activeRecipientId: null,
    currentPage: 1,
    zoom: 1,
    activeTool: "select",
  } satisfies EditorState);

  // Set first recipient as active once envelope loads
  useEffect(() => {
    if (editorRecipients.length > 0 && !state.activeRecipientId) {
      dispatch({ type: "SET_ACTIVE_RECIPIENT", id: editorRecipients[0].id });
    }
  }, [envelope]);

  // Populate fields from API
  useEffect(() => {
    if (existingFields && existingFields.length > 0) {
      dispatch({ type: "SET_FIELDS", fields: existingFields });
    }
  }, [existingFields]);

  // Show welcome modal once per user
  useEffect(() => {
    if (!isLoading && typeof window !== "undefined") {
      const seen = localStorage.getItem("editor-welcome-seen");
      if (!seen) {
        setShowWelcomeModal(true);
      }
    }
  }, [isLoading]);

  const handleCloseWelcome = () => {
    setShowWelcomeModal(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("editor-welcome-seen", "1");
    }
  };

  const activeRecipientId = state.activeRecipientId ?? editorRecipients[0]?.id ?? null;
  const activeRecipient = editorRecipients.find((r) => r.id === activeRecipientId);
  const activeTool = state.activeTool;

  // Debounced auto-save
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.fields.length) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      saveFields(id, state.fields as any).catch(() => {});
    }, 2000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state.fields, id]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await saveFields(id, state.fields as any);
      } catch (e) {
        console.error("Field save failed:", e);
      }
      return sendEnvelope(id);
    },
    onSuccess: () => {
      router.push(`/agreements?filter=sent`);
    },
    onError: (err: Error) => {
      alert(`Send failed: ${err.message || "Unknown error"}`);
    },
  });

  // Intercept send: show modal if no fields placed
  const handleSendClick = useCallback(() => {
    if (state.fields.length === 0) {
      setShowNoFieldsModal(true);
    } else {
      sendMutation.mutate();
    }
  }, [state.fields.length, sendMutation]);

  const placeFieldOnPage = useCallback(
    (type: FieldType, pageNumber: number, x: number, y: number, w: number, h: number) => {
      if (!activeRecipientId) return;
      const { w: fw, h: fh } = FIELD_DEFAULT_SIZES[type] ?? { w: 20, h: 5 };
      const xPct = (x / w) * 100;
      const yPct = (y / h) * 100;

      // Derive document ID from the global page number. Each document occupies a
      // contiguous range of global pages (calculated in navigatorDocuments); find
      // which document owns `pageNumber` and use its id.
      const firstDocId = (() => {
        for (const d of navigatorDocuments) {
          if (pageNumber >= d.startPage && pageNumber < d.startPage + d.pageCount) {
            return d.id;
          }
        }
        // Fallback to first document if no match (should not happen)
        return envelope?.documents?.[0]?.id;
      })();

      const field: PlacedField = {
        id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        recipientId: activeRecipientId,
        documentId: firstDocId,
        page: pageNumber,
        x: Math.max(0, Math.min(xPct - fw / 2, 100 - fw)),
        y: Math.max(0, Math.min(yPct - fh / 2, 100 - fh)),
        width: fw,
        height: fh,
        required: type === "signature" || type === "initial",
      };
      dispatch({ type: "ADD_FIELD", field });
    },
    [activeRecipientId, navigatorDocuments, envelope],
  );

  const handlePageClick = useCallback(
    (pageNumber: number, x: number, y: number, w: number, h: number) => {
      dispatch({ type: "SET_PAGE", page: pageNumber });
      if (activeTool === "select") {
        dispatch({ type: "SELECT_FIELD", id: null });
        return;
      }
      placeFieldOnPage(activeTool as FieldType, pageNumber, x, y, w, h);
    },
    [activeTool, placeFieldOnPage],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (typeof active.id === "string" && active.id.startsWith("palette-")) {
      setDraggedFieldType(active.data.current?.fieldType ?? null);
      dragPointerRef.current = null;
    }
  }, []);

  // Track pointer during drag for accurate drop placement
  // activatorEvent is the initial event; use delta to find current pointer position
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const activator = event.activatorEvent as PointerEvent | MouseEvent | null;
    if (activator && "clientX" in activator) {
      dragPointerRef.current = {
        x: activator.clientX + event.delta.x,
        y: activator.clientY + event.delta.y,
      };
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedFieldType(null);
      const { active, over } = event;
      if (!over || !activeRecipientId) return;

      if (
        typeof active.id === "string" &&
        active.id.startsWith("palette-") &&
        over.data.current?.type === "canvas"
      ) {
        const fieldType = active.data.current?.fieldType as FieldType;
        if (!fieldType) return;

        const pageNumber = (over.data.current?.page ?? 1) as number;

        // Compute pointer position: activatorEvent start + total delta
        let ptr = dragPointerRef.current;
        if (!ptr) {
          const activator = event.activatorEvent as PointerEvent | MouseEvent | null;
          if (activator && "clientX" in activator) {
            ptr = {
              x: activator.clientX + event.delta.x,
              y: activator.clientY + event.delta.y,
            };
          }
        }

        if (ptr && over.rect) {
          const relX = ptr.x - over.rect.left;
          const relY = ptr.y - over.rect.top;
          placeFieldOnPage(fieldType, pageNumber, relX, relY, over.rect.width, over.rect.height);
        } else {
          // Last-resort fallback: center of the drop zone
          placeFieldOnPage(
            fieldType,
            pageNumber,
            over.rect ? over.rect.width / 2 : 400,
            over.rect ? over.rect.height / 2 : 500,
            over.rect ? over.rect.width : 816,
            over.rect ? over.rect.height : 1056,
          );
        }
      }
    },
    [activeRecipientId, placeFieldOnPage],
  );

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F5F5F5" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{
              border: "3px solid rgba(19,0,50,0.12)",
              borderTopColor: "#4C00FF",
            }}
          />
          <p style={{ fontSize: "13px", color: "rgba(19,0,50,0.45)" }}>
            Loading document editor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#F5F5F5" }}>
          {/* Top toolbar */}
          <PrepareToolbar
            envelopeId={id}
            envelopeSubject={envelope?.subject ?? "Untitled Envelope"}
            fields={state.fields}
            recipients={editorRecipients}
            zoom={state.zoom}
            onZoomChange={(zoom) => dispatch({ type: "SET_ZOOM", zoom })}
            onSend={handleSendClick}
            isSending={sendMutation.isPending}
            onPreview={() => setShowPreviewModal(true)}
          />

          {/* Main editor layout — DocuSign order: Left palette | Center canvas | Right navigator */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Field palette (~300px) */}
            <FieldPalette
              activeTool={activeTool}
              activeRecipient={activeRecipient}
              onToolSelect={(tool) => dispatch({ type: "SET_TOOL", tool })}
              allRecipients={editorRecipients}
              onRecipientChange={(recipientId) =>
                dispatch({ type: "SET_ACTIVE_RECIPIENT", id: recipientId })
              }
            />

            {/* Center: Document canvas */}
            <DocumentCanvas
              pageCount={pageCount}
              currentPage={state.currentPage}
              fields={state.fields}
              recipients={editorRecipients}
              selectedFieldId={state.selectedFieldId}
              activeTool={activeTool}
              activeRecipientId={activeRecipientId}
              zoom={state.zoom}
              pageImageUrls={pageImageUrls}
              documentName={allDocs[0]?.name ?? "document.pdf"}
              canUndo={(state._past?.length ?? 0) > 0}
              canRedo={(state._future?.length ?? 0) > 0}
              onFieldClick={(fieldId) => dispatch({ type: "SELECT_FIELD", id: fieldId })}
              onFieldUpdate={(fieldId, updates) =>
                dispatch({ type: "UPDATE_FIELD", id: fieldId, updates })
              }
              onFieldRemove={(fieldId) => dispatch({ type: "REMOVE_FIELD", id: fieldId })}
              onAssignRecipient={(fieldId, recipientId) =>
                dispatch({ type: "UPDATE_FIELD", id: fieldId, updates: { recipientId } })
              }
              onPageClick={handlePageClick}
              onPageVisible={(page) => dispatch({ type: "SET_PAGE", page })}
              onDeselect={() => dispatch({ type: "SELECT_FIELD", id: null })}
              onZoomChange={(zoom) => dispatch({ type: "SET_ZOOM", zoom })}
              onUndo={() => dispatch({ type: "UNDO" })}
              onRedo={() => dispatch({ type: "REDO" })}
            />

            {/* Right: Page navigator (~280px) */}
            <PageNavigator
              pageCount={pageCount}
              currentPage={state.currentPage}
              fields={state.fields}
              pageImageUrls={pageImageUrls}
              documents={navigatorDocuments}
              onPageChange={(page) => dispatch({ type: "SET_PAGE", page })}
            />
          </div>
        </div>

        {/* Drag ghost overlay */}
        <DragOverlay dropAnimation={null}>
          {draggedFieldType && (
            <div
              className="px-3 py-2 text-xs font-bold text-white pointer-events-none"
              style={{
                background: activeRecipient?.color ?? "#4C00FF",
                border: `2px solid ${activeRecipient?.color ?? "#4C00FF"}`,
                borderRadius: "4px",
                boxShadow: "0 4px 12px rgba(19,0,50,0.25)",
                transform: "rotate(-2deg)",
              }}
            >
              {FIELD_LABELS[draggedFieldType]}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Welcome modal — shown once */}
      {showWelcomeModal && <WelcomeModal onClose={handleCloseWelcome} />}

      {/* No-fields modal */}
      {showNoFieldsModal && (
        <NoFieldsModal
          onSendAnyway={() => {
            setShowNoFieldsModal(false);
            sendMutation.mutate();
          }}
          onAddFields={() => setShowNoFieldsModal(false)}
        />
      )}

      {/* Success toast */}
      {showSuccessToast && <SuccessToast message="Your agreement was sent." />}

      {/* Preview modal */}
      {showPreviewModal && (
        <PreviewModal
          fields={state.fields}
          recipients={editorRecipients}
          pageCount={pageCount}
          pageImageUrls={pageImageUrls}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </>
  );
}
