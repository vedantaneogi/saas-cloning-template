"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  Copy,
  Trash,
  CaretDown,
} from "@phosphor-icons/react";
import type { PlacedField, FieldType, EditorRecipient } from "../model/types";
import { FIELD_LABELS } from "../model/types";
import { FieldOverlay } from "./FieldOverlay";

const PAGE_WIDTH = 816;  // Letter at 96 dpi
const PAGE_HEIGHT = 1056; // Letter at 96 dpi

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];

export interface CommentDot {
  id: string;
  x: number;
  y: number;
  pageNum: number;
  text: string;
  authorName?: string;
}

function CommentDotOverlay({ dot }: { dot: CommentDot }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMenuOpen(false);
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
      className="absolute z-40"
      style={{
        left: `${dot.x}%`,
        top: `${dot.y}%`,
        transform: "translate(-50%, -50%)",
        pointerEvents: "auto",
      }}
      ref={cardRef}
    >
      {/* Dot */}
      <div
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "#9B8FD8",
          boxShadow: "0 0 0 3px rgba(155,143,216,0.3)",
          cursor: "pointer",
          transition: "transform 0.15s",
          transform: open ? "scale(1.3)" : "scale(1)",
        }}
      />

      {/* Comment card */}
      {open && (
        <div
          className="absolute z-50"
          style={{
            top: "-10px",
            left: "20px",
            width: "260px",
            background: "white",
            borderRadius: "8px",
            border: "1px solid rgba(19,0,50,0.12)",
            boxShadow: "0 8px 24px rgba(19,0,50,0.14)",
            padding: "14px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: avatar + name + kebab */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#E8E0FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 600,
                color: "#4C00FF",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(19,0,50,0.9)", margin: 0 }}>
                {dot.authorName || "You"}
              </p>
              <p style={{ fontSize: "11px", color: "rgba(19,0,50,0.45)", margin: "2px 0 0" }}>
                Posted when the envelope is sent.
              </p>
            </div>
            {/* Kebab menu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                style={{
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  border: "none",
                  background: menuOpen ? "rgba(19,0,50,0.06)" : "transparent",
                  cursor: "pointer",
                  color: "rgba(19,0,50,0.5)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "4px",
                    background: "white",
                    borderRadius: "8px",
                    border: "1px solid rgba(19,0,50,0.12)",
                    boxShadow: "0 8px 24px rgba(19,0,50,0.14)",
                    minWidth: "120px",
                    overflow: "hidden",
                  }}
                >
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    style={{ fontSize: "13px", color: "rgba(19,0,50,0.85)", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    style={{ fontSize: "13px", color: "rgba(19,0,50,0.85)", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
                    onClick={() => { setMenuOpen(false); setOpen(false); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Comment text */}
          <p style={{ fontSize: "13px", color: "rgba(19,0,50,0.85)", margin: 0, lineHeight: "1.5", wordBreak: "break-word" }}>
            {dot.text}
          </p>
        </div>
      )}
    </div>
  );
}

interface PageDropZoneProps {
  pageNumber: number;
  pageImageUrl?: string;
  fields: PlacedField[];
  recipients: EditorRecipient[];
  selectedFieldId: string | null;
  activeTool: FieldType | "select";
  activeRecipientId: string | null;
  zoom: number;
  commentMode?: boolean;
  commentDots?: CommentDot[];
  onCommentPlace?: (pageNum: number, xPct: number, yPct: number, screenX: number, screenY: number) => void;
  onFieldClick: (id: string) => void;
  onFieldUpdate: (id: string, updates: Partial<PlacedField>) => void;
  onFieldRemove: (id: string) => void;
  onAssignRecipient: (fieldId: string, recipientId: string) => void;
  onPageClick: (pageNumber: number, x: number, y: number, w: number, h: number) => void;
  onDeselect: () => void;
  onFieldDoubleClick?: (fieldId: string) => void;
  onFieldDuplicate?: (fieldId: string) => void;
  onOpenFieldProperties?: (fieldId: string) => void;
}

function PageDropZone({
  pageNumber,
  pageImageUrl,
  fields,
  recipients,
  selectedFieldId,
  activeTool,
  activeRecipientId: _activeRecipientId,
  zoom,
  commentMode = false,
  commentDots = [],
  onCommentPlace,
  onFieldClick,
  onFieldUpdate,
  onFieldRemove,
  onAssignRecipient,
  onPageClick,
  onDeselect,
  onFieldDoubleClick,
  onFieldDuplicate,
  onOpenFieldProperties,
}: PageDropZoneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `canvas-page-${pageNumber}`,
    data: { type: "canvas", page: pageNumber },
  });

  const pageFields = fields.filter((f) => f.page === pageNumber);

  const getRecipient = (recipientId: string) =>
    recipients.find((r) => r.id === recipientId);

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Comment mode: place a dot instead of a field
      if (commentMode) {
        e.stopPropagation();
        const xPct = (x / rect.width) * 100;
        const yPct = (y / rect.height) * 100;
        onCommentPlace?.(pageNumber, xPct, yPct, e.clientX, e.clientY);
        return;
      }
      if (activeTool === "select") {
        onDeselect();
        return;
      }
      onPageClick(pageNumber, x, y, rect.width, rect.height);
    },
    [activeTool, commentMode, pageNumber, onPageClick, onDeselect, onCommentPlace],
  );

  const scaledWidth = PAGE_WIDTH * zoom;
  const scaledHeight = PAGE_HEIGHT * zoom;

  return (
    <div className="flex justify-center mb-10">
      <div
        ref={(el) => {
          setDropRef(el);
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className="relative flex-shrink-0"
        style={{
          width: scaledWidth,
          height: scaledHeight,
          background: "white",
          cursor: commentMode ? "cell" : activeTool !== "select" ? "crosshair" : "default",
          outline: isOver ? "2px dashed #4C00FF" : "1px solid rgba(19,0,50,0.12)",
          outlineOffset: isOver ? "2px" : "0",
          boxShadow: "0 2px 12px rgba(19,0,50,0.10)",
        }}
        onClick={handlePageClick}
      >
        {/* PDF page or placeholder */}
        {pageImageUrl ? (
          <img
            src={pageImageUrl}
            alt={`Page ${pageNumber}`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div
            className="absolute inset-0 pointer-events-none select-none"
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

        {/* Drop overlay */}
        {isOver && (
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{ background: "rgba(76,0,255,0.05)" }}
          >
            <div className="flex items-center justify-center h-full">
              <div
                className="px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "rgba(76,0,255,0.9)", borderRadius: "4px" }}
              >
                Drop to place field
              </div>
            </div>
          </div>
        )}

        {/* Active tool hint */}
        {activeTool !== "select" && !commentMode && !isOver && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs font-semibold text-white pointer-events-none z-20"
            style={{
              background: "rgba(76,0,255,0.85)",
              backdropFilter: "blur(4px)",
              borderRadius: "4px",
            }}
          >
            Click to place {FIELD_LABELS[activeTool as FieldType]}
          </div>
        )}

        {/* Comment mode hint */}
        {commentMode && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs font-semibold text-white pointer-events-none z-20"
            style={{
              background: "rgba(76,0,255,0.85)",
              backdropFilter: "blur(4px)",
              borderRadius: "4px",
            }}
          >
            Click anywhere to add a comment
          </div>
        )}

        {/* Field overlays */}
        {pageFields.map((field) => {
          const recipient = getRecipient(field.recipientId);
          const color = recipient?.color ?? "#4C00FF";
          const name = recipient?.name ?? "Unknown";
          return (
            <FieldOverlay
              key={field.id}
              field={field}
              recipientColor={color}
              recipientName={name}
              isSelected={selectedFieldId === field.id}
              allRecipients={recipients}
              allFields={fields}
              onSelect={() => onFieldClick(field.id)}
              onUpdate={(updates) => onFieldUpdate(field.id, updates)}
              onRemove={() => onFieldRemove(field.id)}
              onAssignRecipient={(recipientId) => onAssignRecipient(field.id, recipientId)}
              onDoubleClick={() => onFieldDoubleClick?.(field.id)}
              onDuplicate={() => onFieldDuplicate?.(field.id)}
              onOpenProperties={() => onOpenFieldProperties?.(field.id)}
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
            />
          );
        })}

        {/* Comment dots */}
        {commentDots.filter((d) => d.pageNum === pageNumber).map((dot) => (
          <CommentDotOverlay key={dot.id} dot={dot} />
        ))}
      </div>
    </div>
  );
}

// ── Canvas toolbar (undo/redo/copy/delete/zoom) ──────────────────────────────

interface CanvasToolbarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  hasSelection: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
}

function CanvasToolbar({
  zoom,
  onZoomChange,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  hasSelection,
  canUndo = false,
  canRedo = false,
}: CanvasToolbarProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const pct = Math.round(zoom * 100);

  return (
    <div
      className="flex items-center justify-center px-4 flex-shrink-0"
      style={{
        height: "40px",
        borderBottom: "1px solid rgba(19,0,50,0.10)",
        background: "white",
        gap: "2px",
      }}
    >
      {/* Undo */}
      <ToolbarBtn onClick={canUndo ? onUndo : undefined} title="Undo (Ctrl+Z)" disabled={!canUndo}>
        <ArrowCounterClockwise size={14} weight="bold" />
      </ToolbarBtn>

      {/* Redo */}
      <ToolbarBtn onClick={canRedo ? onRedo : undefined} title="Redo (Ctrl+Shift+Z)" disabled={!canRedo}>
        <ArrowClockwise size={14} weight="bold" />
      </ToolbarBtn>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Duplicate */}
      <ToolbarBtn onClick={hasSelection ? onDuplicate : undefined} title="Duplicate field" disabled={!hasSelection}>
        <Copy size={14} weight="bold" />
      </ToolbarBtn>

      {/* Delete */}
      <ToolbarBtn onClick={hasSelection ? onDelete : undefined} title="Delete field (Del)" disabled={!hasSelection}>
        <Trash size={14} weight="bold" />
      </ToolbarBtn>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Zoom dropdown */}
      <div className="relative">
        <button
          onClick={() => setZoomOpen((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-1 rounded transition-colors hover:bg-gray-100"
          style={{
            border: "1px solid rgba(19,0,50,0.15)",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 500,
            color: "rgba(19,0,50,0.9)",
            minWidth: "72px",
            justifyContent: "space-between",
          }}
        >
          <span>{pct}%</span>
          <CaretDown size={10} weight="bold" style={{ color: "rgba(19,0,50,0.45)" }} />
        </button>

        {zoomOpen && (
          <div
            className="absolute bottom-full mb-1 left-0 bg-white overflow-hidden z-50"
            style={{
              border: "1px solid rgba(19,0,50,0.15)",
              borderRadius: "4px",
              boxShadow: "0 4px 16px rgba(19,0,50,0.12)",
              minWidth: "90px",
            }}
          >
            {ZOOM_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  onZoomChange(p / 100);
                  setZoomOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors"
                style={{
                  fontSize: "12px",
                  fontWeight: pct === p ? 600 : 400,
                  color: pct === p ? "#4C00FF" : "rgba(19,0,50,0.9)",
                }}
              >
                {p}%
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center justify-center w-7 h-7 rounded transition-colors"
      style={{
        color: disabled ? "rgba(19,0,50,0.25)" : "rgba(19,0,50,0.65)",
        cursor: disabled ? "default" : "pointer",
        borderRadius: "4px",
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background = "#F5F5F5";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

// ── DocumentCanvas ────────────────────────────────────────────────────────────

interface DocumentCanvasProps {
  pageCount: number;
  currentPage: number;
  fields: PlacedField[];
  recipients: EditorRecipient[];
  selectedFieldId: string | null;
  activeTool: FieldType | "select";
  activeRecipientId: string | null;
  zoom: number;
  pageImageUrls?: Record<number, string>;
  documentName?: string;
  documents?: Array<{ id: string; name: string; pageCount: number; startPage: number }>;
  canUndo?: boolean;
  canRedo?: boolean;
  commentMode?: boolean;
  commentDots?: CommentDot[];
  onCommentPlace?: (pageNum: number, xPct: number, yPct: number, screenX: number, screenY: number) => void;
  onFieldClick: (id: string) => void;
  onFieldUpdate: (id: string, updates: Partial<PlacedField>) => void;
  onFieldRemove: (id: string) => void;
  onAssignRecipient: (fieldId: string, recipientId: string) => void;
  onPageClick: (pageNumber: number, x: number, y: number, w: number, h: number) => void;
  onPageVisible: (pageNumber: number) => void;
  onDeselect: () => void;
  onZoomChange?: (zoom: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;
  onFieldDoubleClick?: (fieldId: string) => void;
  onFieldDuplicate?: (fieldId: string) => void;
  onOpenFieldProperties?: (fieldId: string) => void;
}

export function DocumentCanvas({
  pageCount,
  currentPage,
  fields,
  recipients,
  selectedFieldId,
  activeTool,
  activeRecipientId,
  zoom,
  pageImageUrls,
  documentName = "document.pdf",
  documents: docSections,
  canUndo = false,
  canRedo = false,
  commentMode = false,
  commentDots = [],
  onCommentPlace,
  onFieldClick,
  onFieldUpdate,
  onFieldRemove,
  onAssignRecipient,
  onPageClick,
  onPageVisible,
  onDeselect,
  onZoomChange,
  onUndo,
  onRedo,
  onDuplicate,
  onFieldDoubleClick,
  onFieldDuplicate,
  onOpenFieldProperties,
}: DocumentCanvasProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const topRef = useRef<HTMLDivElement>(null);

  // Scroll to page when currentPage changes externally
  useEffect(() => {
    const pageEl = pageRefs.current.get(currentPage);
    if (pageEl && scrollContainerRef.current) {
      pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentPage]);

  // Intersection observer to track visible page
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observers: IntersectionObserver[] = [];
    pageRefs.current.forEach((el, pageNum) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            onPageVisible(pageNum);
          }
        },
        { root: container, threshold: 0.4 },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [pageCount, onPageVisible]);

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z / Ctrl+Y redo, Delete/Backspace remove selected
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        onRedo?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        if (!e.shiftKey) {
          e.preventDefault();
          onUndo?.();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        onRedo?.();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedFieldId) {
        e.preventDefault();
        onFieldRemove(selectedFieldId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onUndo, onRedo, selectedFieldId, onFieldRemove]);

  const handleDelete = selectedFieldId
    ? () => onFieldRemove(selectedFieldId)
    : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#F5F5F5" }}>
      {/* Canvas toolbar */}
      <CanvasToolbar
        zoom={zoom}
        onZoomChange={onZoomChange ?? (() => {})}
        hasSelection={!!selectedFieldId}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onDuplicate={onDuplicate}
        onDelete={handleDelete}
      />

      {/* Scrollable canvas area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative"
        style={{ background: "#F5F5F5" }}
        data-canvas-area="true"
      >
        {/* Top anchor for "Return to top" */}
        <div ref={topRef} />

        <div className="py-8">
          {Array.from({ length: pageCount }).map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <div
                key={pageNum}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                  else pageRefs.current.delete(pageNum);
                }}
              >
                <PageDropZone
                  pageNumber={pageNum}
                  pageImageUrl={pageImageUrls?.[pageNum]}
                  fields={fields}
                  recipients={recipients}
                  selectedFieldId={selectedFieldId}
                  activeTool={activeTool}
                  activeRecipientId={activeRecipientId}
                  zoom={zoom}
                  commentMode={commentMode}
                  commentDots={commentDots}
                  onCommentPlace={onCommentPlace}
                  onFieldClick={onFieldClick}
                  onFieldUpdate={onFieldUpdate}
                  onFieldRemove={onFieldRemove}
                  onAssignRecipient={onAssignRecipient}
                  onPageClick={onPageClick}
                  onDeselect={onDeselect}
                  onFieldDoubleClick={onFieldDoubleClick}
                  onFieldDuplicate={onFieldDuplicate}
                  onOpenFieldProperties={onOpenFieldProperties}
                />
              </div>
            );
          })}
          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </div>

      {/* Bottom status bar: filename + page indicator + return to top */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{
          height: "36px",
          borderTop: "1px solid rgba(19,0,50,0.10)",
          background: "white",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "rgba(19,0,50,0.55)",
            fontWeight: 400,
          }}
        >
          {(() => {
            if (docSections) {
              const doc = docSections.find((d) => currentPage >= d.startPage && currentPage < d.startPage + d.pageCount);
              return doc?.name ?? documentName;
            }
            return documentName;
          })()}
        </span>

        <span
          style={{
            fontSize: "12px",
            color: "rgba(19,0,50,0.55)",
            fontWeight: 400,
          }}
        >
          {currentPage} of {pageCount}
        </span>

        <button
          onClick={() => {
            topRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className="hover:underline transition-colors"
          style={{
            fontSize: "12px",
            color: "#4C00FF",
            fontWeight: 400,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Return to top of the page
        </button>
      </div>
    </div>
  );
}
