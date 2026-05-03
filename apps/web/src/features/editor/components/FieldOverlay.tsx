"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { PlacedField, FieldType, EditorRecipient } from "../model/types";
import { FIELD_LABELS } from "../model/types";
import { cn } from "@/lib/utils";

// ── Floating Field Toolbar ────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface FieldToolbarProps {
  field: PlacedField;
  recipient: EditorRecipient | undefined;
  allRecipients: EditorRecipient[];
  onToggleRequired: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenProperties: () => void;
  onAssignRecipient: (recipientId: string) => void;
}

function FieldToolbar({
  field,
  recipient,
  allRecipients,
  onToggleRequired,
  onDuplicate,
  onDelete,
  onOpenProperties,
  onAssignRecipient,
}: FieldToolbarProps) {
  const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recipientDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRecipientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [recipientDropdownOpen]);

  const color = recipient?.color ?? "#4C00FF";
  const initials = recipient ? getInitials(recipient.name) : "?";

  return (
    <div
      className="absolute z-50 flex items-center gap-0 select-none"
      style={{
        bottom: "calc(100% + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "white",
        border: "1px solid rgba(19,0,50,0.18)",
        borderRadius: "6px",
        boxShadow: "0 4px 16px rgba(19,0,50,0.14)",
        height: "34px",
        padding: "0 2px",
        whiteSpace: "nowrap",
        pointerEvents: "all",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Recipient badge + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRecipientDropdownOpen((v) => !v);
          }}
          className="flex items-center gap-1.5 px-2.5 h-full rounded-l-[5px] hover:bg-gray-50 transition-colors"
          style={{ height: "32px" }}
          title={`Assigned to: ${recipient?.name ?? "Unknown"}`}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ background: color, fontSize: "9px", fontWeight: 700 }}
          >
            {initials}
          </div>
          <svg viewBox="0 0 24 24" fill="currentColor" width="9" height="9" style={{ color: "rgba(19,0,50,0.45)" }}>
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>

        {recipientDropdownOpen && allRecipients.length > 0 && (
          <div
            className="absolute top-full left-0 mt-1 bg-white overflow-hidden z-[60]"
            style={{
              border: "1px solid rgba(19,0,50,0.15)",
              borderRadius: "6px",
              boxShadow: "0 8px 24px rgba(19,0,50,0.14)",
              minWidth: "180px",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="px-3 py-1.5"
              style={{ fontSize: "10px", fontWeight: 600, color: "rgba(19,0,50,0.4)", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid rgba(19,0,50,0.08)" }}
            >
              Assign to
            </div>
            {allRecipients.map((r) => (
              <button
                key={r.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignRecipient(r.id);
                  setRecipientDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                  style={{ background: r.color, fontSize: "9px", fontWeight: 700 }}
                >
                  {getInitials(r.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: "12.5px", fontWeight: 500, color: "rgba(19,0,50,0.9)" }}>
                    {r.name}
                  </p>
                </div>
                {r.id === field.recipientId && (
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-200" />

      {/* Required toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleRequired(); }}
        className="flex items-center gap-1.5 px-2.5 transition-colors hover:bg-gray-50"
        style={{ height: "32px" }}
        title={field.required ? "Make optional" : "Make required"}
      >
        {/* Toggle switch */}
        <div
          className="relative"
          style={{
            width: "26px",
            height: "14px",
            borderRadius: "7px",
            background: field.required ? "#4C00FF" : "#D1D5DB",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "2px",
              left: field.required ? "14px" : "2px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "white",
              transition: "left 0.2s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }}
          />
        </div>
        <span style={{ fontSize: "11.5px", color: "rgba(19,0,50,0.75)", fontWeight: 500 }}>
          Required
        </span>
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-200" />

      {/* Duplicate */}
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        className="flex items-center justify-center transition-colors hover:bg-gray-50"
        style={{ height: "32px", width: "32px" }}
        title="Duplicate field"
      >
        <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(19,0,50,0.6)" }}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="flex items-center justify-center transition-colors hover:bg-red-50"
        style={{ height: "32px", width: "32px" }}
        title="Delete field"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ color: "#EF4444" }}>
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-200" />

      {/* Settings / Open Properties */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenProperties(); }}
        className="flex items-center justify-center rounded-r-[5px] transition-colors hover:bg-gray-50"
        style={{ height: "32px", width: "32px" }}
        title="Field properties"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ color: "rgba(19,0,50,0.55)" }}>
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      </button>
    </div>
  );
}

interface ResizeHandle {
  cursor: string;
  position: string; // Tailwind position classes
  xDir: -1 | 0 | 1;
  yDir: -1 | 0 | 1;
}

const RESIZE_HANDLES: ResizeHandle[] = [
  { cursor: "nw-resize", position: "top-0 left-0 -translate-x-1/2 -translate-y-1/2", xDir: -1, yDir: -1 },
  { cursor: "n-resize", position: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2", xDir: 0, yDir: -1 },
  { cursor: "ne-resize", position: "top-0 right-0 translate-x-1/2 -translate-y-1/2", xDir: 1, yDir: -1 },
  { cursor: "e-resize", position: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2", xDir: 1, yDir: 0 },
  { cursor: "se-resize", position: "bottom-0 right-0 translate-x-1/2 translate-y-1/2", xDir: 1, yDir: 1 },
  { cursor: "s-resize", position: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", xDir: 0, yDir: 1 },
  { cursor: "sw-resize", position: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2", xDir: -1, yDir: 1 },
  { cursor: "w-resize", position: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2", xDir: -1, yDir: 0 },
];

// Field type icons as SVG
function FieldTypeIcon({ type, color }: { type: FieldType; color: string }) {
  const iconProps = { fill: color, width: "16", height: "16", viewBox: "0 0 24 24" };
  switch (type) {
    case "signature":
      return <svg {...iconProps}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>;
    case "initial":
      return <svg {...iconProps}><path d="M13 5.08V3h-2v2.08C7.61 5.57 5 8.47 5 12s2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92s-2.61-6.43-6-6.92zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
    case "date_signed":
      return <svg {...iconProps}><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" /></svg>;
    case "text":
      return <svg {...iconProps}><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z" /></svg>;
    case "checkbox":
      return <svg {...iconProps}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>;
    case "dropdown":
      return <svg {...iconProps}><path d="M7 10l5 5 5-5z" /><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" /></svg>;
    case "radio":
      return <svg {...iconProps}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z" /></svg>;
    case "name":
    case "company":
    case "title":
      return <svg {...iconProps}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>;
    case "email":
      return <svg {...iconProps}><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>;
    case "attachment":
      return <svg {...iconProps}><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" /></svg>;
    default:
      return <svg {...iconProps}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /></svg>;
  }
}

interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

// Field types that support a pre-fill / default value
const PREFILLABLE_TYPES = new Set<FieldType>([
  "text", "name", "email", "company", "title", "number", "note",
]);

interface FieldOverlayProps {
  field: PlacedField;
  recipientColor: string;
  recipientName: string;
  isSelected: boolean;
  allRecipients: EditorRecipient[];
  /** All placed fields — used for the "conditional on" picker */
  allFields?: PlacedField[];
  onSelect: () => void;
  onUpdate: (updates: Partial<PlacedField>) => void;
  onRemove: () => void;
  onAssignRecipient: (recipientId: string) => void;
  onDoubleClick?: () => void;
  onDuplicate?: () => void;
  onOpenProperties?: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function FieldOverlay({
  field,
  recipientColor,
  recipientName,
  isSelected,
  allRecipients,
  allFields = [],
  onSelect,
  onUpdate,
  onRemove,
  onAssignRecipient,
  onDoubleClick,
  onDuplicate,
  onOpenProperties,
  containerRef,
}: FieldOverlayProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false });
  const [defaultValueDialog, setDefaultValueDialog] = useState<{ visible: boolean; draft: string }>({
    visible: false,
    draft: "",
  });
  const dragStart = useRef<{ clientX: number; clientY: number; fieldX: number; fieldY: number } | null>(null);
  const resizeStart = useRef<{
    clientX: number; clientY: number;
    fieldX: number; fieldY: number; fieldW: number; fieldH: number;
    xDir: number; yDir: number;
  } | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handler = () => setContextMenu((c) => ({ ...c, visible: false }));
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu.visible]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      onSelect();

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      dragStart.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        fieldX: field.x,
        fieldY: field.y,
      };
      setIsDragging(true);

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragStart.current) return;
        const dx = ev.clientX - dragStart.current.clientX;
        const dy = ev.clientY - dragStart.current.clientY;
        const pct_dx = (dx / rect.width) * 100;
        const pct_dy = (dy / rect.height) * 100;

        onUpdate({
          x: Math.max(0, Math.min(dragStart.current.fieldX + pct_dx, 100 - field.width)),
          y: Math.max(0, Math.min(dragStart.current.fieldY + pct_dy, 100 - field.height)),
        });
      };

      const handleMouseUp = () => {
        dragStart.current = null;
        setIsDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [field, onSelect, onUpdate, containerRef],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      resizeStart.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        fieldX: field.x,
        fieldY: field.y,
        fieldW: field.width,
        fieldH: field.height,
        xDir: handle.xDir,
        yDir: handle.yDir,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizeStart.current) return;
        const dx = ((ev.clientX - resizeStart.current.clientX) / rect.width) * 100;
        const dy = ((ev.clientY - resizeStart.current.clientY) / rect.height) * 100;
        const { fieldX, fieldY, fieldW, fieldH, xDir, yDir } = resizeStart.current;

        let newX = fieldX;
        let newY = fieldY;
        let newW = fieldW;
        let newH = fieldH;

        if (xDir === 1) {
          newW = Math.max(6, fieldW + dx);
        } else if (xDir === -1) {
          newW = Math.max(6, fieldW - dx);
          newX = fieldX + (fieldW - newW);
        }

        if (yDir === 1) {
          newH = Math.max(3, fieldH + dy);
        } else if (yDir === -1) {
          newH = Math.max(3, fieldH - dy);
          newY = fieldY + (fieldH - newH);
        }

        onUpdate({
          x: Math.max(0, Math.min(newX, 100)),
          y: Math.max(0, Math.min(newY, 100)),
          width: Math.min(newW, 100 - newX),
          height: Math.min(newH, 100 - newY),
        });
      };

      const handleMouseUp = () => {
        resizeStart.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [field, onUpdate, containerRef],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
  }, [onSelect]);

  return (
    <>
      <div
        ref={fieldRef}
        className={cn(
          "absolute flex items-center justify-center select-none group transition-shadow",
          isSelected ? "z-20" : "z-10",
        )}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
          background: `${recipientColor}1A`,
          border: `2px solid ${recipientColor}`,
          borderRadius: "3px",
          cursor: isDragging ? "grabbing" : "grab",
          boxShadow: isSelected
            ? `0 0 0 3px ${recipientColor}40, 0 2px 8px rgba(0,0,0,0.15)`
            : `0 1px 3px rgba(0,0,0,0.08)`,
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
        onContextMenu={handleContextMenu}
      >
        {/* Field content */}
        {field.value && PREFILLABLE_TYPES.has(field.type) ? (
          <div className="flex items-center gap-1 px-1.5 pointer-events-none overflow-hidden w-full">
            <span
              className="text-xs truncate italic"
              style={{ color: "#9CA3AF", fontSize: "11px" }}
            >
              {field.value}
            </span>
            {field.required && (
              <span className="text-red-500 text-xs leading-none flex-shrink-0 ml-auto">*</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 px-1 pointer-events-none overflow-hidden w-full justify-center">
            <FieldTypeIcon type={field.type} color={recipientColor} />
            <span
              className="text-xs font-semibold truncate"
              style={{ color: recipientColor, fontSize: "11px" }}
            >
              {FIELD_LABELS[field.type]}
            </span>
            {field.required && (
              <span className="text-red-500 text-xs leading-none flex-shrink-0">*</span>
            )}
          </div>
        )}

        {/* Recipient label at top */}
        <div
          className="absolute -top-5 left-0 text-xs px-1.5 py-0.5 rounded-t font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: recipientColor, color: "white", fontSize: "10px" }}
        >
          {recipientName}
        </div>

        {/* Quick-delete button (only shown when not selected, so toolbar takes over) */}
        {!isSelected && (
          <button
            className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            style={{ fontSize: "12px", zIndex: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Delete field"
          >
            ×
          </button>
        )}

        {/* Floating selection toolbar */}
        {isSelected && (
          <FieldToolbar
            field={field}
            recipient={allRecipients.find((r) => r.id === field.recipientId)}
            allRecipients={allRecipients}
            onToggleRequired={() => onUpdate({ required: !field.required })}
            onDuplicate={() => onDuplicate?.()}
            onDelete={onRemove}
            onOpenProperties={() => onOpenProperties?.()}
            onAssignRecipient={onAssignRecipient}
          />
        )}

        {/* Selection resize handles */}
        {isSelected && RESIZE_HANDLES.map((handle) => (
          <div
            key={handle.cursor.replace("-resize", "")}
            className={cn("absolute w-2.5 h-2.5 bg-white border-2 border-[#1B0A3C] rounded-sm", handle.position)}
            style={{ cursor: handle.cursor, zIndex: 25 }}
            onMouseDown={(e) => handleResizeMouseDown(e, handle)}
          />
        ))}
      </div>

      {/* Default value dialog */}
      {defaultValueDialog.visible && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setDefaultValueDialog({ visible: false, draft: "" })}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border p-4 w-72"
            style={{ borderColor: "#E0E0E0" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-700 mb-2">Set default value</div>
            <div className="text-xs text-gray-400 mb-3">
              This value will be pre-filled for the signer. They can still edit it.
            </div>
            <input
              autoFocus
              type="text"
              value={defaultValueDialog.draft}
              onChange={(e) => setDefaultValueDialog((d) => ({ ...d, draft: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdate({ value: defaultValueDialog.draft || undefined });
                  setDefaultValueDialog({ visible: false, draft: "" });
                } else if (e.key === "Escape") {
                  setDefaultValueDialog({ visible: false, draft: "" });
                }
              }}
              placeholder={`Default ${FIELD_LABELS[field.type].toLowerCase()}…`}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B0A3C]/30"
              style={{ borderColor: "#D0D0D0" }}
            />
            <div className="flex gap-2 mt-3 justify-end">
              {field.value && (
                <button
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded"
                  onClick={() => {
                    onUpdate({ value: undefined });
                    setDefaultValueDialog({ visible: false, draft: "" });
                  }}
                >
                  Clear
                </button>
              )}
              <button
                className="text-xs text-gray-500 hover:bg-gray-100 px-3 py-1.5 rounded"
                onClick={() => setDefaultValueDialog({ visible: false, draft: "" })}
              >
                Cancel
              </button>
              <button
                className="text-xs text-white px-3 py-1.5 rounded font-medium"
                style={{ background: "#1B0A3C" }}
                onClick={() => {
                  onUpdate({ value: defaultValueDialog.draft || undefined });
                  setDefaultValueDialog({ visible: false, draft: "" });
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            borderColor: "#E0E0E0",
            minWidth: "180px",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b" style={{ borderColor: "#F0F0F0" }}>
            {FIELD_LABELS[field.type]} Field
          </div>

          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              onUpdate({ required: !field.required });
              setContextMenu((c) => ({ ...c, visible: false }));
            }}
          >
            <span className="text-gray-500">
              {field.required ? "Make optional" : "Make required"}
            </span>
            {field.required && <span className="ml-auto text-red-500 text-xs font-bold">*</span>}
          </button>

          {PREFILLABLE_TYPES.has(field.type) && (
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={() => {
                setContextMenu((c) => ({ ...c, visible: false }));
                setDefaultValueDialog({ visible: true, draft: field.value ?? "" });
              }}
            >
              <span className="text-gray-500">Set default value</span>
              {field.value && (
                <span className="ml-auto text-gray-400 text-xs truncate max-w-[80px]">{field.value}</span>
              )}
            </button>
          )}

          {/* Conditional on: show for non-checkbox fields when there are checkbox fields available */}
          {field.type !== "checkbox" && allFields.filter((f) => f.type === "checkbox" && f.id !== field.id).length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-gray-400 border-t" style={{ borderColor: "#F0F0F0" }}>
                Conditional on checkbox
              </div>
              {field.conditionalOn && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-500"
                  onClick={() => {
                    onUpdate({ conditionalOn: undefined });
                    setContextMenu((c) => ({ ...c, visible: false }));
                  }}
                >
                  Remove condition
                </button>
              )}
              {allFields
                .filter((f) => f.type === "checkbox" && f.id !== field.id)
                .map((cbField) => (
                  <button
                    key={cbField.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      onUpdate({ conditionalOn: cbField.id });
                      setContextMenu((c) => ({ ...c, visible: false }));
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" className="text-gray-400 flex-shrink-0">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <span className="truncate">{cbField.label || `Checkbox ${cbField.id.slice(0, 6)}`}</span>
                    {field.conditionalOn === cbField.id && (
                      <span className="ml-auto text-[#1B0A3C] text-xs font-medium">Active</span>
                    )}
                  </button>
                ))}
            </>
          )}

          {allRecipients.length > 1 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-gray-400 border-t" style={{ borderColor: "#F0F0F0" }}>
                Assign to
              </div>
              {allRecipients.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => {
                    onAssignRecipient(r.id);
                    setContextMenu((c) => ({ ...c, visible: false }));
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span className={r.id === field.recipientId ? "font-semibold" : ""}>{r.name}</span>
                  {r.id === field.recipientId && <span className="ml-auto text-[#1B0A3C] text-xs">Current</span>}
                </button>
              ))}
            </>
          )}

          <div className="border-t" style={{ borderColor: "#F0F0F0" }}>
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              onClick={() => {
                onRemove();
                setContextMenu((c) => ({ ...c, visible: false }));
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              Delete field
            </button>
          </div>
        </div>
      )}
    </>
  );
}
