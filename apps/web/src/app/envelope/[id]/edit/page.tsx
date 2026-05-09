"use client";

import { useReducer, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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

import { getEnvelope, saveFields, sendEnvelope, updateEnvelope, saveEnvelopeAsTemplate } from "@/features/envelopes/api";
import { getEnvelopeFields } from "@/features/editor/api";
import { editorReducer } from "@/features/editor/state/editorReducer";
import { PrepareToolbar, CommentPopover } from "@/features/editor/components/PrepareToolbar";
import { PageNavigator } from "@/features/editor/components/PageNavigator";
import { DocumentCanvas } from "@/features/editor/components/DocumentCanvas";
import type { CommentDot } from "@/features/editor/components/DocumentCanvas";
import { FieldPalette } from "@/features/editor/components/FieldPalette";
import { getRecipientColor } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import type { FieldType, PlacedField, EditorState, EditorRecipient } from "@/features/editor/model/types";
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

// ── Formula Modal ─────────────────────────────────────────────────────────────

const FORMULA_FUNCTIONS = [
  "AddDays(",
  "AddMonths(",
  "AddYears(",
  "DateDiff(",
  "Day(",
  "Days(",
  "Today()",
  "Now()",
  "Floor(",
  "Round(",
  "Abs(",
  "min(",
  "max(",
  "sum(",
  "average(",
  "if(",
];

interface FormulaModalProps {
  field: PlacedField;
  allFields: PlacedField[];
  onClose: () => void;
  onSave: (formula: string, decimalPlaces: number) => void;
}

function FormulaModal({ field, allFields, onClose, onSave }: FormulaModalProps) {
  const [formula, setFormula] = useState(field.formula ?? "");
  const [decimalPlaces, setDecimalPlaces] = useState(field.decimalPlaces ?? 2);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fields that can be referenced (number/date types with labels, excluding self)
  const referenceable = allFields.filter(
    (f) =>
      f.id !== field.id &&
      f.label &&
      ["number", "text", "date_signed", "name", "email", "company", "title"].includes(f.type),
  );

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFormula(val);

    // Show autocomplete after typing [
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const bracketIdx = before.lastIndexOf("[");
    if (bracketIdx !== -1 && !before.slice(bracketIdx).includes("]")) {
      const query = before.slice(bracketIdx + 1);
      setAutocompleteQuery(query);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  const insertLabel = (label: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? formula.length;
    const before = formula.slice(0, cursor);
    const bracketIdx = before.lastIndexOf("[");
    const after = formula.slice(cursor);
    // Replace from [ to cursor with [label]
    const newFormula = formula.slice(0, bracketIdx) + `[${label}]` + after;
    setFormula(newFormula);
    setShowAutocomplete(false);
    // Move cursor after inserted label
    requestAnimationFrame(() => {
      const pos = bracketIdx + label.length + 2;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  };

  const insertFunction = (fn: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? formula.length;
    const newFormula = formula.slice(0, cursor) + fn + formula.slice(cursor);
    setFormula(newFormula);
    requestAnimationFrame(() => {
      const pos = cursor + fn.length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  };

  const filteredLabels = referenceable.filter((f) =>
    (f.label ?? "").toLowerCase().includes(autocompleteQuery.toLowerCase()),
  );

  const [showDropdown, setShowDropdown] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFormula = (f: string): string | null => {
    if (!f.trim()) return null;
    const refs = f.match(/\[([^\]]+)\]/g) || [];
    const knownLabels = new Set(referenceable.map((r) => r.label?.toLowerCase()));
    const invalid = refs.filter((r) => !knownLabels.has(r.slice(1, -1).toLowerCase()));
    if (invalid.length > 0) return `Formula Error. Field${invalid.length > 1 ? "s" : ""} not found: ${invalid.join(", ")}`;
    const cleaned = f.replace(/\[[^\]]+\]/g, "0").replace(/AddDays|AddMonths|AddYears|DateDiff|Day|Days|Today|Now|Floor|Round|Abs|min|max|sum|average|if/gi, "").replace(/[0-9.+\-*/()%, >=<!]/g, "");
    if (cleaned.trim()) return `Formula Error. Invalid characters: ${cleaned.trim()}`;
    return null;
  };

  const handleSave = () => {
    const err = validateFormula(formula);
    if (err) { setValidationError(err); return; }
    onSave(formula, decimalPlaces);
  };

  const allSuggestions = [
    ...referenceable.map((f) => ({ type: "field" as const, label: f.label!, fieldType: f.type })),
    ...FORMULA_FUNCTIONS.map((fn) => ({ type: "function" as const, label: fn, fieldType: "" })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4"
        style={{ fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "rgba(19,0,50,0.9)", margin: 0 }}>
            Set up formula
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(19,0,50,0.4)", fontSize: "20px", padding: "4px" }}
          >
            &times;
          </button>
        </div>

        <div className="px-6 pb-6 pt-3">
          {/* Description */}
          <p style={{ fontSize: "13px", color: "rgba(19,0,50,0.6)", lineHeight: "1.5", margin: "0 0 16px" }}>
            Build a formula from number and date fields in your envelope. Field names must be enclosed in square brackets
            (&quot;[]&quot;). Select from suggested fields and date functions. Once completed click anywhere outside the box
            to make autocomplete disappear and save.
          </p>

          {/* Formula label */}
          <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "rgba(19,0,50,0.9)", marginBottom: "6px" }}>
            Formula
          </label>

          {/* Validation error */}
          {validationError && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "12px", padding: "10px 12px", background: "#FFF5F5", border: "1px solid #FED7D7", borderRadius: "4px" }}>
              <span style={{ color: "#E53E3E", fontSize: "16px", lineHeight: 1, flexShrink: 0 }}>⚠</span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#C53030", margin: "0 0 2px" }}>Formula Error.</p>
                <p style={{ fontSize: "12px", color: "#E53E3E", margin: 0 }}>{validationError.replace("Formula Error. ", "")}</p>
                <p style={{ fontSize: "11px", color: "#E53E3E", margin: "4px 0 0", fontStyle: "italic" }}>For best results, use the autocomplete list of suggested fields and operators to build your formula.</p>
              </div>
            </div>
          )}

          {/* Formula textarea + autocomplete */}
          <div className="relative mb-1">
            <textarea
              ref={textareaRef}
              value={formula}
              onChange={(e) => { handleTextareaChange(e); setValidationError(null); }}
              onFocus={() => setShowDropdown(true)}
              rows={4}
              placeholder="e.g. [Price] * [Quantity] + [Tax]"
              style={{
                width: "100%",
                border: `2px solid ${validationError ? "#E53E3E" : "rgba(19,0,50,0.2)"}`,
                borderRadius: "4px",
                padding: "10px 12px",
                fontSize: "14px",
                fontFamily: "inherit",
                color: "rgba(19,0,50,0.9)",
                outline: "none",
                background: "white",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            {/* Autocomplete dropdown — shows on focus, combines fields + functions */}
            {showDropdown && allSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "100%",
                  background: "white",
                  border: "2px solid rgba(19,0,50,0.2)",
                  borderTop: "none",
                  borderRadius: "0 0 4px 4px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  zIndex: 10,
                }}
              >
                {allSuggestions
                  .filter((s) =>
                    !autocompleteQuery || s.label.toLowerCase().includes(autocompleteQuery.toLowerCase()),
                  )
                  .map((s, idx) => (
                    <button
                      key={`${s.type}-${idx}`}
                      className="w-full text-left hover:bg-purple-50 transition-colors"
                      style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        color: "rgba(19,0,50,0.9)",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(19,0,50,0.06)",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (s.type === "field") {
                          if (showAutocomplete) {
                            insertLabel(s.label);
                          } else {
                            insertFunction(`[${s.label}]`);
                          }
                        } else {
                          insertFunction(s.label);
                        }
                        setShowDropdown(false);
                      }}
                    >
                      {s.type === "field" ? `[${s.label}]` : s.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "rgba(19,0,50,0.4)", margin: "0 0 20px" }}>
            Example: [Total Due]-[Deposit]
          </p>

          {/* Decimal Places */}
          <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "rgba(19,0,50,0.9)", marginBottom: "6px" }}>
            Decimal Places
          </label>
          <select
            value={decimalPlaces}
            onChange={(e) => setDecimalPlaces(Number(e.target.value))}
            style={{
              width: "80px",
              border: "1px solid rgba(19,0,50,0.2)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "14px",
              color: "rgba(19,0,50,0.9)",
              outline: "none",
              background: "white",
              marginBottom: "24px",
            }}
          >
            <option value={0}>0</option>
            <option value={2}>2</option>
          </select>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-8 py-2.5 rounded border text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: "rgba(19,0,50,0.25)", color: "rgba(19,0,50,0.9)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-2.5 rounded text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "#260559" }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Field Properties Panel ───────────────────────────────────────────────────

interface FieldPropertiesPanelProps {
  field: PlacedField;
  recipients: EditorRecipient[];
  allFields: PlacedField[];
  onBack: () => void;
  onUpdate: (updates: Partial<PlacedField>) => void;
  onDelete: () => void;
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid rgba(19,0,50,0.08)" }}>
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ fontSize: "12.5px", fontWeight: 600, color: "rgba(19,0,50,0.8)" }}>{title}</span>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          width="12"
          height="12"
          style={{
            color: "rgba(19,0,50,0.4)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function FieldPropertiesPanel({ field, recipients, allFields, onBack, onUpdate, onDelete }: FieldPropertiesPanelProps) {
  const [localValue, setLocalValue] = useState(field.value ?? "");
  const [localLabel, setLocalLabel] = useState(field.label ?? "");
  const [localX, setLocalX] = useState(field.x.toFixed(1));
  const [localY, setLocalY] = useState(field.y.toFixed(1));
  const [localW, setLocalW] = useState(field.width.toFixed(1));
  const [localH, setLocalH] = useState(field.height.toFixed(1));
  const [localFontSize, setLocalFontSize] = useState(12);
  const [localAlignment, setLocalAlignment] = useState<"left" | "center" | "right">("left");
  // Payment-specific local state
  const [localPaymentAmount, setLocalPaymentAmount] = useState(
    field.paymentAmount != null ? (field.paymentAmount / 100).toFixed(2) : "",
  );
  const [localPaymentCurrency, setLocalPaymentCurrency] = useState(field.paymentCurrency ?? "USD");
  const [localPaymentDescription, setLocalPaymentDescription] = useState(field.paymentDescription ?? "");
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showConditionalRuleEditor, setShowConditionalRuleEditor] = useState(false);
  // Conditional rule editor local state
  const [ruleOn, setRuleOn] = useState<string>(field.conditionalOn ?? "");
  const [ruleCondition, setRuleCondition] = useState<string>(
    field.conditionalOn
      ? (field.conditionalValue === "checked"
        ? "Checked"
        : field.conditionalValue === "not_checked"
        ? "Not Checked"
        : field.conditionalValue === "any"
        ? "Any Value"
        : "Specified Text")
      : "Specified Text",
  );
  const [ruleText, setRuleText] = useState<string>(
    field.conditionalOn && !["checked", "not_checked", "any"].includes(field.conditionalValue ?? "")
      ? (field.conditionalValue ?? "")
      : "",
  );
  const [ruleAction, setRuleAction] = useState<"show" | "hide">(field.conditionalAction ?? "show");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when field changes (another field selected)
  useEffect(() => {
    setLocalValue(field.value ?? "");
    setLocalLabel(field.label ?? "");
    setLocalX(field.x.toFixed(1));
    setLocalY(field.y.toFixed(1));
    setLocalW(field.width.toFixed(1));
    setLocalH(field.height.toFixed(1));
    setLocalFontSize(12);
    setLocalAlignment("left");
    setLocalPaymentAmount(field.paymentAmount != null ? (field.paymentAmount / 100).toFixed(2) : "");
    setLocalPaymentCurrency(field.paymentCurrency ?? "USD");
    setLocalPaymentDescription(field.paymentDescription ?? "");
    setShowConditionalRuleEditor(false);
    setRuleOn(field.conditionalOn ?? "");
    setRuleCondition(
      field.conditionalOn
        ? (field.conditionalValue === "checked"
          ? "Checked"
          : field.conditionalValue === "not_checked"
          ? "Not Checked"
          : field.conditionalValue === "any"
          ? "Any Value"
          : "Specified Text")
        : "Specified Text",
    );
    setRuleText(
      field.conditionalOn && !["checked", "not_checked", "any"].includes(field.conditionalValue ?? "")
        ? (field.conditionalValue ?? "")
        : "",
    );
    setRuleAction(field.conditionalAction ?? "show");
  }, [field.id]);

  const debouncedUpdate = useCallback((updates: Partial<PlacedField>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdate(updates), 300);
  }, [onUpdate]);

  const isTextLike = ["text", "name", "email", "company", "title", "number", "note"].includes(field.type);
  const isDateType = field.type === "date_signed";
  const isDrawingOrSig = field.type === "drawing" || field.type === "signature" || field.type === "initial";

  const recipient = recipients.find((r) => r.id === field.recipientId);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid rgba(19,0,50,0.18)",
    borderRadius: "4px",
    padding: "6px 9px",
    fontSize: "12.5px",
    color: "rgba(19,0,50,0.9)",
    outline: "none",
    background: "white",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    color: "rgba(19,0,50,0.45)",
    marginBottom: "4px",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  };

  return (
    <div
      className="flex-shrink-0 bg-white flex flex-col overflow-hidden"
      style={{ width: "300px", borderRight: "1px solid rgba(19,0,50,0.12)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 flex-shrink-0"
        style={{ height: "44px", borderBottom: "1px solid rgba(19,0,50,0.12)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
          title="Back to Fields"
        >
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(19,0,50,0.65)" }}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(19,0,50,0.9)" }}>
          {FIELD_LABELS[field.type]}
        </span>
        {field.required && (
          <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: 700 }}>*</span>
        )}
        {recipient && (
          <div
            className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ background: recipient.color, fontSize: "9px", fontWeight: 700 }}
            title={recipient.name}
          >
            {recipient.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Payment field properties */}
        {field.type === "payment" && (
          <div className="px-4 py-3 space-y-3" style={{ borderBottom: "1px solid rgba(19,0,50,0.08)" }}>
            <div>
              <label style={labelStyle}>Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={localPaymentAmount}
                placeholder="0.00"
                onChange={(e) => {
                  setLocalPaymentAmount(e.target.value);
                  const dollars = parseFloat(e.target.value);
                  if (!isNaN(dollars) && dollars >= 0) {
                    debouncedUpdate({ paymentAmount: Math.round(dollars * 100) });
                  }
                }}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select
                value={localPaymentCurrency}
                onChange={(e) => {
                  setLocalPaymentCurrency(e.target.value);
                  onUpdate({ paymentCurrency: e.target.value });
                }}
                style={inputStyle}
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="JPY">JPY — Japanese Yen</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input
                type="text"
                value={localPaymentDescription}
                placeholder="e.g. Service fee, Deposit…"
                onChange={(e) => {
                  setLocalPaymentDescription(e.target.value);
                  debouncedUpdate({ paymentDescription: e.target.value || undefined });
                }}
                style={inputStyle}
              />
            </div>
            <div
              className="flex items-start gap-2 px-3 py-2 rounded"
              style={{ background: "#FFF7ED", border: "1px solid #FDE68A" }}
            >
              <svg viewBox="0 0 24 24" fill="#F59E0B" width="14" height="14" style={{ flexShrink: 0, marginTop: "1px" }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span style={{ fontSize: "11.5px", color: "#92400E", lineHeight: 1.4 }}>
                Stub only — no real payment processing. Signer will see the payment info but no charge occurs.
              </span>
            </div>
          </div>
        )}

        {/* Formula field properties */}
        {field.type === "formula" && (
          <div className="px-4 py-3 space-y-3" style={{ borderBottom: "1px solid rgba(19,0,50,0.08)" }}>
            <div>
              <label style={labelStyle}>Formula</label>
              <input
                type="text"
                readOnly
                value={field.formula ?? ""}
                placeholder="No formula set"
                style={{ ...inputStyle, background: "#FAFAFA", cursor: "default", color: field.formula ? "rgba(19,0,50,0.9)" : "rgba(19,0,50,0.35)" }}
              />
            </div>
            <button
              onClick={() => setShowFormulaModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded transition-colors hover:opacity-90"
              style={{
                background: "#4C00FF",
                color: "white",
                fontSize: "12.5px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 700 }}>ƒ</span>
              Set Up Formula
            </button>
            {showFormulaModal && (
              <FormulaModal
                field={field}
                allFields={allFields}
                onClose={() => setShowFormulaModal(false)}
                onSave={(newFormula, newDecimalPlaces) => {
                  onUpdate({ formula: newFormula, decimalPlaces: newDecimalPlaces });
                  setShowFormulaModal(false);
                }}
              />
            )}
          </div>
        )}

        {/* Text/note fields */}
        {isTextLike && (
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(19,0,50,0.08)" }}>
            <label style={labelStyle}>Default text</label>
            <textarea
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                debouncedUpdate({ value: e.target.value || undefined });
              }}
              rows={3}
              placeholder="Optional default value…"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        )}

        {/* Data label — shown for all field types */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(19,0,50,0.08)" }}>
          <label style={labelStyle}>Data label</label>
          <input
            type="text"
            value={localLabel}
            onChange={(e) => {
              setLocalLabel(e.target.value);
              debouncedUpdate({ label: e.target.value || undefined });
            }}
            placeholder={`e.g. ${FIELD_LABELS[field.type]} field`}
            style={inputStyle}
          />
        </div>

        {/* Required toggle — shown for ALL field types */}
        <div className="px-4 py-3 space-y-3" style={{ borderBottom: "1px solid rgba(19,0,50,0.08)" }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: "12.5px", color: "rgba(19,0,50,0.85)", fontWeight: 500 }}>Required</span>
            <button
              onClick={() => onUpdate({ required: !field.required })}
              style={{
                width: "36px",
                height: "20px",
                borderRadius: "10px",
                background: field.required ? "#4C00FF" : "#D1D5DB",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "2px",
                  left: field.required ? "18px" : "2px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "white",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
          {/* Allow image upload (signature/drawing only) */}
          {isDrawingOrSig && (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "12.5px", color: "rgba(19,0,50,0.85)", fontWeight: 500 }}>Allow image upload</span>
              <div
                style={{
                  width: "36px",
                  height: "20px",
                  borderRadius: "10px",
                  background: "#D1D5DB",
                  position: "relative",
                  flexShrink: 0,
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
                title="Coming soon"
              >
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: "2px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Formatting (collapsed by default) */}
        <CollapsibleSection title="Formatting">
          <div className="space-y-3 pt-1">
            <div>
              <label style={labelStyle}>Font size</label>
              <select
                value={localFontSize}
                onChange={(e) => setLocalFontSize(Number(e.target.value))}
                style={{ ...inputStyle }}
              >
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map((s) => (
                  <option key={s} value={s}>{s}pt</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Alignment</label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => setLocalAlignment(align)}
                    className="flex-1 py-1.5 rounded text-xs hover:bg-gray-100 transition-colors"
                    style={{
                      border: `1px solid ${localAlignment === align ? "#4C00FF" : "rgba(19,0,50,0.15)"}`,
                      background: localAlignment === align ? "#F0EEFF" : "transparent",
                      color: localAlignment === align ? "#4C00FF" : "rgba(19,0,50,0.7)",
                      fontWeight: localAlignment === align ? 700 : 500,
                      textTransform: "capitalize",
                    }}
                  >
                    {align === "left" ? "L" : align === "center" ? "C" : "R"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Location & Autoplace (collapsed by default) */}
        <CollapsibleSection title="Location and Autoplace">
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Position X (%)", value: localX, setter: setLocalX, field: "x" },
                { label: "Position Y (%)", value: localY, setter: setLocalY, field: "y" },
                { label: "Width (%)", value: localW, setter: setLocalW, field: "width" },
                { label: "Height (%)", value: localH, setter: setLocalH, field: "height" },
              ].map(({ label, value, setter, field: fieldKey }) => (
                <div key={fieldKey}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => {
                      setter(e.target.value);
                      const num = parseFloat(e.target.value);
                      if (!isNaN(num)) {
                        debouncedUpdate({ [fieldKey]: Math.max(0, Math.min(num, 100)) });
                      }
                    }}
                    style={{ ...inputStyle }}
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
              ))}
            </div>
            <button
              className="w-full py-2 rounded transition-colors hover:bg-gray-50 text-center"
              style={{
                border: "1px solid rgba(19,0,50,0.18)",
                fontSize: "12px",
                color: "rgba(19,0,50,0.55)",
                fontWeight: 500,
              }}
              title="Coming soon"
            >
              Set Up Autoplace
            </button>
          </div>
        </CollapsibleSection>

        {/* Advanced (collapsed by default) — Tooltip */}
        <CollapsibleSection title="Advanced">
          <div className="pt-1">
            <label style={labelStyle}>Tooltip</label>
            <textarea
              placeholder="Enter tooltip text shown on hover..."
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </CollapsibleSection>

        {/* Dropdown Options */}
        {field.type === "dropdown" && (
          <CollapsibleSection title="Dropdown Options">
            <div className="space-y-2 pt-1">
              {(field.options ?? ["Option 1", "Option 2"]).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...(field.options ?? ["Option 1", "Option 2"])];
                      newOpts[i] = e.target.value;
                      onUpdate({ options: newOpts });
                    }}
                    style={{ flex: 1, border: "1px solid rgba(19,0,50,0.18)", borderRadius: "4px", padding: "6px 8px", fontSize: "12px", outline: "none" }}
                  />
                  <button
                    onClick={() => {
                      const newOpts = [...(field.options ?? ["Option 1", "Option 2"])];
                      newOpts.splice(i, 1);
                      onUpdate({ options: newOpts.length > 0 ? newOpts : ["Option 1"] });
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(19,0,50,0.3)", fontSize: "14px" }}
                  >&times;</button>
                </div>
              ))}
              <button
                onClick={() => onUpdate({ options: [...(field.options ?? ["Option 1", "Option 2"]), `Option ${(field.options?.length ?? 2) + 1}`] })}
                style={{ fontSize: "12px", color: "#4C00FF", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
              >
                + Add option
              </button>
            </div>
          </CollapsibleSection>
        )}

        {/* Radio Group */}
        {field.type === "radio" && (
          <CollapsibleSection title="Radio Group">
            <div className="space-y-2 pt-1">
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(19,0,50,0.45)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Group Name</label>
                <input
                  type="text"
                  value={field.groupName ?? ""}
                  onChange={(e) => onUpdate({ groupName: e.target.value })}
                  placeholder="e.g. YesNo_Q1"
                  style={{ width: "100%", border: "1px solid rgba(19,0,50,0.18)", borderRadius: "4px", padding: "6px 8px", fontSize: "12px", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(19,0,50,0.45)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Button Value</label>
                <input
                  type="text"
                  value={field.value ?? ""}
                  onChange={(e) => onUpdate({ value: e.target.value })}
                  placeholder="e.g. Yes"
                  style={{ width: "100%", border: "1px solid rgba(19,0,50,0.18)", borderRadius: "4px", padding: "6px 8px", fontSize: "12px", outline: "none" }}
                />
              </div>
              <p style={{ fontSize: "11px", color: "rgba(19,0,50,0.4)", margin: "4px 0 0" }}>
                Radio buttons with the same group name are mutually exclusive.
              </p>
            </div>
          </CollapsibleSection>
        )}

        {/* Conditional Fields */}
        <CollapsibleSection title="Conditional Fields">
          <div className="space-y-3 pt-1">
            {field.conditionalOn ? (
              <>
                {/* Show existing rule summary */}
                <div style={{ background: "#F8F7FF", border: "1px solid #E8E0FF", borderRadius: "6px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(19,0,50,0.5)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Active Rule</div>
                  <p style={{ fontSize: "12px", color: "rgba(19,0,50,0.8)", margin: "0 0 4px", lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 600 }}>IF</span>{" "}
                    {allFields.find((f) => f.id === field.conditionalOn)?.label || "field"}{" "}
                    <span style={{ fontWeight: 600 }}>IS</span>{" "}
                    {field.conditionalValue === "checked" ? "Checked" : field.conditionalValue === "not_checked" ? "Unchecked" : field.conditionalValue === "any" ? "Any Text" : `"${field.conditionalValue}"`}
                  </p>
                  <p style={{ fontSize: "12px", color: "rgba(19,0,50,0.8)", margin: 0 }}>
                    <span style={{ fontWeight: 600 }}>THEN</span> {(field.conditionalAction ?? "show") === "show" ? "Show" : "Hide"} this field
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConditionalRuleEditor(true)}
                    className="flex-1 py-1.5 rounded text-xs transition-colors hover:bg-purple-50"
                    style={{ border: "1px solid rgba(19,0,50,0.2)", color: "rgba(19,0,50,0.7)", fontWeight: 500, cursor: "pointer", background: "white" }}
                  >
                    Edit Rule
                  </button>
                  <button
                    onClick={() => onUpdate({ conditionalOn: undefined, conditionalValue: undefined, conditionalAction: undefined })}
                    className="flex-1 py-1.5 rounded text-xs transition-colors hover:bg-red-50"
                    style={{ border: "1px solid rgba(239,68,68,0.35)", color: "#EF4444", fontWeight: 500, cursor: "pointer", background: "white" }}
                  >
                    Remove Rule
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowConditionalRuleEditor(true)}
                className="w-full py-2 rounded text-sm transition-colors hover:bg-purple-50"
                style={{ border: "1px solid rgba(19,0,50,0.2)", color: "rgba(19,0,50,0.8)", fontWeight: 600, cursor: "pointer", background: "white", letterSpacing: "0.02em" }}
              >
                CREATE RULE
              </button>
            )}
          </div>
        </CollapsibleSection>

        {/* Conditional Rule Editor Modal */}
        {showConditionalRuleEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowConditionalRuleEditor(false)} />
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md mx-4" style={{ fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif" }}>
              <div className="flex items-center justify-between px-6 pt-5 pb-0">
                <h2 style={{ fontSize: "18px", fontWeight: 600, color: "rgba(19,0,50,0.9)", margin: 0 }}>
                  {field.conditionalOn ? "Edit Conditional Rule" : "Add Conditional Rule"}
                </h2>
                <button onClick={() => setShowConditionalRuleEditor(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(19,0,50,0.4)", fontSize: "20px" }}>&times;</button>
              </div>
              <div className="px-6 pb-6 pt-4 space-y-4">
                {/* IF — trigger field (same recipient only) */}
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(19,0,50,0.5)", width: "40px", flexShrink: 0 }}>IF</span>
                  <select
                    value={ruleOn}
                    onChange={(e) => { setRuleOn(e.target.value); setRuleCondition(""); }}
                    style={{ flex: 1, border: "1px solid rgba(19,0,50,0.2)", borderRadius: "4px", padding: "8px 10px", fontSize: "13px", color: "rgba(19,0,50,0.9)", outline: "none", background: "white" }}
                  >
                    <option value="">Select a field...</option>
                    {allFields
                      .filter((f) => f.id !== field.id && f.recipientId === field.recipientId)
                      .map((f) => (
                        <option key={f.id} value={f.id}>{f.label || f.type} ({f.type})</option>
                      ))}
                  </select>
                </div>

                {/* IS — condition (dynamic per trigger field type) */}
                {(() => {
                  const triggerField = allFields.find((f) => f.id === ruleOn);
                  const triggerType = triggerField?.type;
                  const isCheckboxOrRadio = triggerType === "checkbox" || triggerType === "radio";
                  const isDropdown = triggerType === "dropdown";
                  return (
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(19,0,50,0.5)", width: "40px", flexShrink: 0 }}>IS</span>
                      <select
                        value={ruleCondition || (isCheckboxOrRadio ? "Checked" : "Any Value")}
                        onChange={(e) => setRuleCondition(e.target.value)}
                        style={{ flex: 1, border: "1px solid rgba(19,0,50,0.2)", borderRadius: "4px", padding: "8px 10px", fontSize: "13px", color: "rgba(19,0,50,0.9)", outline: "none", background: "white" }}
                      >
                        {isCheckboxOrRadio && <option value="Checked">Checked</option>}
                        {isCheckboxOrRadio && <option value="Not Checked">Unchecked</option>}
                        <option value="Any Value">Any Text</option>
                        <option value="Specified Text">Specific Value...</option>
                        {isDropdown && triggerField?.options?.map((opt) => (
                          <option key={opt} value={`opt:${opt}`}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* Specific value input */}
                {ruleCondition === "Specified Text" && (
                  <div className="flex items-center gap-3">
                    <span style={{ width: "40px", flexShrink: 0 }} />
                    <input
                      type="text"
                      value={ruleText}
                      onChange={(e) => setRuleText(e.target.value)}
                      placeholder="Enter trigger value..."
                      style={{ flex: 1, border: "1px solid rgba(19,0,50,0.2)", borderRadius: "4px", padding: "8px 10px", fontSize: "13px", color: "rgba(19,0,50,0.9)", outline: "none" }}
                    />
                  </div>
                )}

                {/* THEN — action */}
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(19,0,50,0.5)", width: "40px", flexShrink: 0 }}>THEN</span>
                  <div className="flex gap-2 flex-1">
                    {(["show", "hide"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setRuleAction(a)}
                        className="flex-1 py-2 rounded text-xs transition-colors"
                        style={{
                          border: `1px solid ${ruleAction === a ? "#4C00FF" : "rgba(19,0,50,0.15)"}`,
                          background: ruleAction === a ? "#F0EEFF" : "transparent",
                          color: ruleAction === a ? "#4C00FF" : "rgba(19,0,50,0.7)",
                          fontWeight: ruleAction === a ? 700 : 500,
                          cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                      >
                        {a === "show" ? "Show" : "Hide"} this field
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowConditionalRuleEditor(false)}
                    className="flex-1 py-2.5 rounded border text-sm font-medium hover:bg-gray-50"
                    style={{ borderColor: "rgba(19,0,50,0.25)", color: "rgba(19,0,50,0.9)", cursor: "pointer", background: "white" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!ruleOn) return;
                      const cond = ruleCondition || "Checked";
                      let condValue: string;
                      if (cond === "Checked") condValue = "checked";
                      else if (cond === "Not Checked") condValue = "not_checked";
                      else if (cond === "Any Value") condValue = "any";
                      else if (cond.startsWith("opt:")) condValue = cond.slice(4);
                      else condValue = ruleText || "checked";
                      onUpdate({ conditionalOn: ruleOn, conditionalValue: condValue, conditionalAction: ruleAction });
                      setShowConditionalRuleEditor(false);
                    }}
                    disabled={!ruleOn}
                    className="flex-1 py-2.5 rounded text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
                    style={{ background: "#260559", cursor: ruleOn ? "pointer" : "not-allowed", border: "none" }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save as custom field */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(19,0,50,0.08)" }}>
          <button
            className="w-full flex items-center justify-center gap-2 py-2 rounded transition-colors hover:bg-gray-50"
            style={{
              border: "1px solid rgba(19,0,50,0.18)",
              fontSize: "12.5px",
              color: "rgba(19,0,50,0.7)",
              fontWeight: 500,
            }}
            title="Coming soon"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ color: "rgba(19,0,50,0.4)" }}>
              <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
            </svg>
            Save As Custom Field
          </button>
        </div>

        {/* Delete button */}
        <div className="px-4 py-3">
          <button
            onClick={() => { onDelete(); onBack(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded transition-colors hover:bg-red-600"
            style={{
              background: "#EF4444",
              color: "white",
              fontSize: "12.5px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
            Delete Field
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template Name Modal ──────────────────────────────────────────────────────

function TemplateNameModal({
  defaultName,
  onCancel,
  onConfirm,
  isSaving,
}: {
  defaultName: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(defaultName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #1B0A3C, #4C00FF)" }} />
        <div className="px-8 py-7">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
            style={{ background: "#F0EEFF" }}
          >
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#4C00FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" stroke="#4C00FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-1.5" style={{ color: "#1B0A3C" }}>
            Give your template a name
          </h2>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Before you save, would you like to give your template a name?
          </p>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onConfirm(name.trim());
              if (e.key === "Escape") onCancel();
            }}
            className="w-full px-3 py-2.5 border rounded text-sm outline-none mb-6"
            style={{ borderColor: "rgba(19,0,50,0.18)" }}
            onFocus={(e) => (e.target.style.borderColor = "#4C00FF")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(19,0,50,0.18)")}
          />
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors hover:bg-gray-50"
              style={{ borderColor: "#1B0A3C", color: "#1B0A3C" }}
            >
              Cancel
            </button>
            <button
              onClick={() => { if (name.trim()) onConfirm(name.trim()); }}
              disabled={isSaving || !name.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "#4C00FF" }}
            >
              {isSaving ? "Saving..." : "Save and Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Editor Page ──────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTemplateMode = searchParams.get("mode") === "template";
  const currentUser = useAuthStore((s) => s.user);
  const { toasts, addToast, dismissToast } = useToast();
  const [draggedFieldType, setDraggedFieldType] = useState<FieldType | null>(null);
  const [showNoFieldsModal, setShowNoFieldsModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  // Template mode state
  const [showTemplateNameModal, setShowTemplateNameModal] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  // Field properties panel state
  const [fieldPropertiesOpen, setFieldPropertiesOpen] = useState(false);
  const [selectedFieldForProperties, setSelectedFieldForProperties] = useState<string | null>(null);
  // Advanced Options panel state
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  const [advAutoReminders, setAdvAutoReminders] = useState(false);
  const [advReminderDays, setAdvReminderDays] = useState(3);
  const [advDaysUntilExpiry, setAdvDaysUntilExpiry] = useState(120);
  const [advExpirationAlert, setAdvExpirationAlert] = useState(0);
  const [advSignOnPaper, setAdvSignOnPaper] = useState(false);
  const [advResponsiveSigning, setAdvResponsiveSigning] = useState(true);
  const [advAllowComments, setAdvAllowComments] = useState(true);
  const [advAllowReassign, setAdvAllowReassign] = useState(true);
  // Comment mode state
  const [commentMode, setCommentMode] = useState(false);
  const [commentPos, setCommentPos] = useState<{ x: number; y: number } | null>(null);
  const [commentDots, setCommentDots] = useState<CommentDot[]>([]);
  // pendingCommentDot: the dot being placed, waiting for text entry
  const [pendingCommentDot, setPendingCommentDot] = useState<Omit<CommentDot, "text"> | null>(null);
  // Right panel visibility
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
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

  // Sync advanced options from envelope data when loaded
  useEffect(() => {
    if (!envelope) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = envelope as any;
    if (raw.allow_comments !== undefined) setAdvAllowComments(raw.allow_comments as boolean);
    if (raw.responsive_signing !== undefined) setAdvResponsiveSigning(raw.responsive_signing as boolean);
    if (raw.allow_reassign !== undefined) setAdvAllowReassign(raw.allow_reassign as boolean);
    // Restore reminder_days → pre-fill reminder toggle + days input
    if (typeof raw.reminder_days === "number" && raw.reminder_days > 0) {
      setAdvAutoReminders(true);
      setAdvReminderDays(raw.reminder_days);
    }
    // Restore expires_at → convert back to days-from-now for the Expiration input
    if (raw.expires_at || raw.expiresAt) {
      const expiresAt: string = raw.expires_at ?? raw.expiresAt;
      const msLeft = new Date(expiresAt).getTime() - Date.now();
      const daysLeft = Math.max(1, Math.round(msLeft / (1000 * 60 * 60 * 24)));
      setAdvDaysUntilExpiry(daysLeft);
    }
  }, [envelope]);

  const editorRecipients = (envelope?.recipients ?? [])
    .filter((r) => !["cc", "viewer"].includes((r.role as string)?.toLowerCase()))
    .map((r, idx) => ({
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

  // Set first recipient as active once envelope loads (or refetches with recipients)
  useEffect(() => {
    if (editorRecipients.length > 0 && !state.activeRecipientId) {
      dispatch({ type: "SET_ACTIVE_RECIPIENT", id: editorRecipients[0].id });
    }
  }, [editorRecipients]);

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

  // Auto-open preview when navigated here with ?preview=true (e.g. from detail page "View")
  useEffect(() => {
    if (!isLoading && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("preview") === "true") {
        setShowPreviewModal(true);
      }
    }
  }, [isLoading]);

  const handleCloseWelcome = () => {
    setShowWelcomeModal(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("editor-welcome-seen", "1");
    }
  };

  const handleCommentClick = useCallback(() => {
    setCommentMode((v) => !v);
    // Close any open popover when toggling mode
    setCommentPos(null);
    setPendingCommentDot(null);
  }, []);

  const handleCommentPlace = useCallback((pageNum: number, xPct: number, yPct: number, screenX: number, screenY: number) => {
    // Turn off comment mode immediately, show the popover near the click
    setCommentMode(false);
    const dotId = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setPendingCommentDot({ id: dotId, x: xPct, y: yPct, pageNum, authorName: currentUser?.name ?? "You" });
    // Position popover 12px to the right and slightly below the click
    setCommentPos({ x: screenX + 12, y: screenY + 8 });
  }, []);

  const activeRecipientId = state.activeRecipientId ?? editorRecipients[0]?.id ?? null;
  const activeRecipient = editorRecipients.find((r) => r.id === activeRecipientId);
  const activeTool = state.activeTool;

  // Debounced auto-save
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlight = useRef<Promise<void> | null>(null);
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = saveFields(id, state.fields as any).then(() => {}).catch(() => {}).finally(() => { saveInFlight.current = null; });
      saveInFlight.current = p;
    }, 2000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [state.fields, id]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (saveInFlight.current) await saveInFlight.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveFields(id, state.fields as any);
      return sendEnvelope(id);
    },
    onSuccess: (sentEnvelope) => {
      // If the current user is also a recipient (self-sign flow), redirect them
      // directly to the signing ceremony instead of the agreements list.
      const userEmail = currentUser?.email?.toLowerCase();
      if (userEmail && sentEnvelope?.recipients) {
        const selfRecipient = sentEnvelope.recipients.find(
          (r) =>
            r.email?.toLowerCase() === userEmail &&
            r.signing_token &&
            r.status !== "signed" &&
            r.status !== "declined",
        );
        if (selfRecipient?.signing_token) {
          router.push(`/sign/${selfRecipient.signing_token}`);
          return;
        }
      }
      router.push(`/agreements?filter=sent`);
    },
    onError: (err: Error) => {
      addToast(`Send failed: ${err.message || "Unknown error"}`, "error");
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

  // Confirm save template with a given name
  const handleConfirmSaveTemplate = useCallback(async (name: string) => {
    setIsSavingTemplate(true);
    try {
      // Flush pending field saves
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (saveInFlight.current) await saveInFlight.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveFields(id, state.fields as any);
      await saveEnvelopeAsTemplate(id, name);
      router.push("/templates");
    } catch (err) {
      console.error("Failed to save template:", err);
      addToast("Failed to save template. Please try again.", "error");
      setIsSavingTemplate(false);
      setShowTemplateNameModal(false);
    }
  }, [id, state.fields, router]);

  // Template mode: "Save and Close" — always use name from prepare step
  const handleSaveAsTemplateClick = useCallback(() => {
    const name = envelope?.subject || `Untitled ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    handleConfirmSaveTemplate(name);
  }, [envelope?.subject, handleConfirmSaveTemplate]);

  // Duplicate selected field with a small offset so it's visually distinct
  const handleDuplicate = useCallback(() => {
    if (!state.selectedFieldId) return;
    const original = state.fields.find((f) => f.id === state.selectedFieldId);
    if (!original) return;
    const clone: PlacedField = {
      ...original,
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: Math.min(original.x + 3, 100 - original.width),
      y: Math.min(original.y + 3, 100 - original.height),
    };
    dispatch({ type: "ADD_FIELD", field: clone });
  }, [state.selectedFieldId, state.fields]);

  // Duplicate a specific field by ID (called from the floating toolbar)
  const handleDuplicateField = useCallback((fieldId: string) => {
    const original = state.fields.find((f) => f.id === fieldId);
    if (!original) return;
    const clone: PlacedField = {
      ...original,
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: Math.min(original.x + 3, 100 - original.width),
      y: Math.min(original.y + 3, 100 - original.height),
    };
    dispatch({ type: "ADD_FIELD", field: clone });
  }, [state.fields]);

  // Open the field properties panel for a given field
  const handleOpenFieldProperties = useCallback((fieldId: string) => {
    dispatch({ type: "SELECT_FIELD", id: fieldId });
    setSelectedFieldForProperties(fieldId);
    setFieldPropertiesOpen(true);
  }, []);

  // Double-click on a field opens properties
  const handleFieldDoubleClick = useCallback((fieldId: string) => {
    handleOpenFieldProperties(fieldId);
  }, [handleOpenFieldProperties]);

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
            onSend={handleSendClick}
            isSending={sendMutation.isPending}
            onPreview={() => setShowPreviewModal(true)}
            onOpenSettings={() => setAdvancedOptionsOpen(true)}
            isTemplateMode={isTemplateMode}
            onSaveAsTemplate={handleSaveAsTemplateClick}
            isSavingTemplate={isSavingTemplate}
          />

          {/* Main editor layout — DocuSign order: Left palette | Center canvas | Right navigator */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Field palette OR Field properties panel (~300px) */}
            {(() => {
              const propField = fieldPropertiesOpen && selectedFieldForProperties
                ? state.fields.find((f) => f.id === selectedFieldForProperties) ?? null
                : null;

              if (propField) {
                return (
                  <FieldPropertiesPanel
                    field={propField}
                    recipients={editorRecipients}
                    allFields={state.fields}
                    onBack={() => setFieldPropertiesOpen(false)}
                    onUpdate={(updates) =>
                      dispatch({ type: "UPDATE_FIELD", id: propField.id, updates })
                    }
                    onDelete={() => {
                      dispatch({ type: "REMOVE_FIELD", id: propField.id });
                      setFieldPropertiesOpen(false);
                      setSelectedFieldForProperties(null);
                    }}
                  />
                );
              }

              return (
                <FieldPalette
                  activeTool={activeTool}
                  activeRecipient={activeRecipient}
                  onToolSelect={(tool) => dispatch({ type: "SET_TOOL", tool })}
                  allRecipients={editorRecipients}
                  onRecipientChange={(recipientId) =>
                    dispatch({ type: "SET_ACTIVE_RECIPIENT", id: recipientId })
                  }
                />
              );
            })()}

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
              documentName={allDocs[0]?.name || allDocs[0]?.original_filename || "document.pdf"}
              documents={navigatorDocuments}
              canUndo={(state._past?.length ?? 0) > 0}
              canRedo={(state._future?.length ?? 0) > 0}
              commentMode={commentMode}
              commentDots={commentDots}
              onCommentPlace={handleCommentPlace}
              onFieldClick={(fieldId) => dispatch({ type: "SELECT_FIELD", id: fieldId })}
              onFieldUpdate={(fieldId, updates) =>
                dispatch({ type: "UPDATE_FIELD", id: fieldId, updates })
              }
              onFieldRemove={(fieldId) => {
                dispatch({ type: "REMOVE_FIELD", id: fieldId });
                if (selectedFieldForProperties === fieldId) {
                  setFieldPropertiesOpen(false);
                  setSelectedFieldForProperties(null);
                }
              }}
              onAssignRecipient={(fieldId, recipientId) =>
                dispatch({ type: "UPDATE_FIELD", id: fieldId, updates: { recipientId } })
              }
              onPageClick={handlePageClick}
              onPageVisible={(page) => dispatch({ type: "SET_PAGE", page })}
              onDeselect={() => dispatch({ type: "SELECT_FIELD", id: null })}
              onZoomChange={(zoom) => dispatch({ type: "SET_ZOOM", zoom })}
              onUndo={() => dispatch({ type: "UNDO" })}
              onRedo={() => dispatch({ type: "REDO" })}
              onDuplicate={handleDuplicate}
              onFieldDoubleClick={handleFieldDoubleClick}
              onFieldDuplicate={handleDuplicateField}
              onOpenFieldProperties={handleOpenFieldProperties}
            />

            {/* Right: Page navigator (~280px) */}
            {rightPanelVisible && (
              <PageNavigator
                pageCount={pageCount}
                currentPage={state.currentPage}
                fields={state.fields}
                pageImageUrls={pageImageUrls}
                documents={navigatorDocuments}
                onPageChange={(page) => dispatch({ type: "SET_PAGE", page })}
                envelopeId={id}
                onCommentClick={handleCommentClick}
                onToggleRightPanel={() => setRightPanelVisible(false)}
              />
            )}

            {/* Floating re-show button when panel is hidden */}
            {!rightPanelVisible && (
              <div className="flex-shrink-0 flex flex-col items-center justify-start pt-2 gap-1"
                style={{ width: "36px", borderLeft: "1px solid rgba(19,0,50,0.12)" }}
              >
                <button
                  onClick={() => setRightPanelVisible(true)}
                  className="flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-gray-100"
                  style={{ color: "rgba(19,0,50,0.55)" }}
                  title="Show panel"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                </button>
              </div>
            )}
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

      {/* Template name modal */}
      {showTemplateNameModal && (
        <TemplateNameModal
          defaultName={
            envelope?.subject && envelope.subject !== "Untitled Template"
              ? envelope.subject
              : `Untitled ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
          }
          onCancel={() => setShowTemplateNameModal(false)}
          onConfirm={handleConfirmSaveTemplate}
          isSaving={isSavingTemplate}
        />
      )}

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

      {/* Comment popover — shown after user clicks on canvas in comment mode */}
      {commentPos && (
        <CommentPopover
          envelopeId={id}
          position={commentPos}
          recipients={editorRecipients.map((r) => ({ id: r.id, name: r.name, email: r.email }))}
          onClose={() => {
            setCommentPos(null);
            setPendingCommentDot(null);
          }}
          onPosted={(text) => {
            if (pendingCommentDot) {
              setCommentDots((prev) => [
                ...prev,
                { ...pendingCommentDot, text },
              ]);
            }
            setCommentPos(null);
            setPendingCommentDot(null);
          }}
        />
      )}

      {/* ── Advanced Options slide-out panel ──────────────────────────────── */}
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
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Panel body — scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px" }}>
          {/* Recipient Privileges */}
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
                checked={advAllowReassign}
                onChange={(e) => setAdvAllowReassign(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0"
                style={{ accentColor: "#4C00FF" }}
              />
              <span style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", lineHeight: "1.4" }}>
                Recipients can change signing responsibility or assign a delegate
              </span>
            </label>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(19,0,50,0.10)", marginBottom: "24px" }} />

          {/* Reminders */}
          <div style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(19,0,50,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
              Reminders
            </p>
            <label className="flex items-start gap-3 cursor-pointer select-none" style={{ marginBottom: advAutoReminders ? "12px" : "0" }}>
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
            {advAutoReminders && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label style={{ fontSize: "14px", color: "rgba(19,0,50,0.9)", flex: 1 }}>
                  Send reminder every (days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={advReminderDays}
                  onChange={(e) => setAdvReminderDays(parseInt(e.target.value) || 3)}
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
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(19,0,50,0.10)", marginBottom: "24px" }} />

          {/* Expiration */}
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

          {/* Mobile-Friendly */}
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

          {/* Comments */}
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
            onClick={async () => {
              // Persist reminder_days and expires_at to the backend
              const expiresAt = advDaysUntilExpiry > 0
                ? new Date(Date.now() + advDaysUntilExpiry * 24 * 60 * 60 * 1000).toISOString()
                : undefined;
              try {
                await updateEnvelope(id, {
                  ...(expiresAt ? { expires_at: expiresAt } : {}),
                  reminder_days: advAutoReminders ? advReminderDays : 0,
                  allow_comments: advAllowComments,
                  responsive_signing: advResponsiveSigning,
                  allow_reassign: advAllowReassign,
                });
              } catch (err) {
                console.error("Failed to save advanced options:", err);
                addToast("Failed to save advanced options. Your local changes are preserved.", "error");
              }
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
