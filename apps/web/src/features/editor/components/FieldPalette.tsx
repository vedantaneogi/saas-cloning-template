"use client";

import { useState, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  MagnifyingGlass,
  PenNib,
  Signature,
  CalendarBlank,
  User,
  EnvelopeSimple,
  Buildings,
  TextT,
  NumberSquareNine,
  CheckSquare,
  CaretCircleDown,
  RadioButton,
  ThumbsUp,
  ThumbsDown,
  Stamp,
  ChatText,
  MathOperations,
  Paperclip,
  PencilSimpleLine,
  CaretDown,
  CaretRight,
  CreditCard,
  X,
} from "@phosphor-icons/react";
import type { FieldType, EditorRecipient } from "../model/types";
import { FIELD_LABELS, FIELD_PALETTE_CATEGORIES } from "../model/types";
import { cn } from "@/lib/utils";

// Phosphor icon map for field types
const FIELD_ICONS: Record<FieldType, ReactNode> = {
  signature: <Signature size={14} weight="bold" />,
  initial: <PenNib size={14} weight="bold" />,
  date_signed: <CalendarBlank size={14} weight="bold" />,
  name: <User size={14} weight="bold" />,
  email: <EnvelopeSimple size={14} weight="bold" />,
  company: <Buildings size={14} weight="bold" />,
  title: <TextT size={14} weight="bold" />,
  text: <TextT size={14} weight="bold" />,
  number: <NumberSquareNine size={14} weight="bold" />,
  checkbox: <CheckSquare size={14} weight="bold" />,
  dropdown: <CaretCircleDown size={14} weight="bold" />,
  radio: <RadioButton size={14} weight="bold" />,
  approve: <ThumbsUp size={14} weight="bold" />,
  decline: <ThumbsDown size={14} weight="bold" />,
  stamp: <Stamp size={14} weight="bold" />,
  note: <ChatText size={14} weight="bold" />,
  formula: <MathOperations size={14} weight="bold" />,
  attachment: <Paperclip size={14} weight="bold" />,
  drawing: <PencilSimpleLine size={14} weight="bold" />,
  payment: <CreditCard size={14} weight="bold" />,
};

// Avatar initials helper
function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface DraggableFieldItemProps {
  type: FieldType;
  activeTool: FieldType | "select";
  activeRecipient: EditorRecipient | undefined;
  onClick: () => void;
}

function DraggableFieldItem({ type, activeTool, activeRecipient, onClick }: DraggableFieldItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: "palette", fieldType: type },
  });

  const isActive = activeTool === type;
  const recipientColor = activeRecipient?.color ?? "#4C00FF";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2.5 py-2 cursor-grab active:cursor-grabbing transition-all select-none group",
      )}
      style={{
        border: isActive
          ? `1px solid ${recipientColor}`
          : "1px solid rgba(19,0,50,0.12)",
        borderRadius: "4px",
        background: isActive ? `${recipientColor}10` : "white",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <span
        style={{
          color: isActive ? recipientColor : "rgba(19,0,50,0.55)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        {FIELD_ICONS[type]}
      </span>
      <span
        style={{
          fontSize: "12.5px",
          fontWeight: 400,
          color: isActive ? recipientColor : "rgba(19,0,50,0.9)",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {FIELD_LABELS[type]}
      </span>
    </div>
  );
}

interface FieldPaletteProps {
  activeTool: FieldType | "select";
  activeRecipient: EditorRecipient | undefined;
  onToolSelect: (tool: FieldType | "select") => void;
  allRecipients?: EditorRecipient[];
  onRecipientChange?: (id: string) => void;
}

export function FieldPalette({
  activeTool,
  activeRecipient,
  onToolSelect,
  allRecipients = [],
  onRecipientChange,
}: FieldPaletteProps) {
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [standardFieldsOpen, setStandardFieldsOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div
      className="flex-shrink-0 bg-white flex flex-col overflow-hidden"
      style={{
        width: "300px",
        borderRight: "1px solid rgba(19,0,50,0.12)",
      }}
    >
      {/* Header: "Fields" title + search */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: "44px",
          borderBottom: "1px solid rgba(19,0,50,0.12)",
        }}
      >
        {searchOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <MagnifyingGlass size={15} weight="bold" style={{ color: "rgba(19,0,50,0.45)", flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Fields"
              autoFocus
              className="flex-1 text-sm outline-none"
              style={{ border: "none", background: "transparent", color: "rgba(19,0,50,0.9)", fontSize: "14px" }}
            />
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
              className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-gray-100"
              style={{ color: "rgba(19,0,50,0.45)" }}
            >
              <X size={12} weight="bold" />
            </button>
          </div>
        ) : (
          <>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(19,0,50,0.9)" }}>
              Fields
            </span>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-gray-100"
              style={{ color: "rgba(19,0,50,0.45)" }}
              title="Search fields"
            >
              <MagnifyingGlass size={15} weight="bold" />
            </button>
          </>
        )}
      </div>

      {/* Recipient selector */}
      <div
        className="px-3 pt-3 pb-2 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(19,0,50,0.08)" }}
      >
        <div className="relative">
          <button
            onClick={() => setRecipientOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-gray-50"
            style={{
              border: "1px solid rgba(19,0,50,0.2)",
              borderRadius: "4px",
              background: "white",
            }}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white"
              style={{
                background: activeRecipient?.color ?? "#4C00FF",
                fontSize: "10px",
                fontWeight: 700,
              }}
            >
              {activeRecipient ? getInitials(activeRecipient.name) : "?"}
            </div>
            <span
              className="flex-1 text-left truncate"
              style={{ fontSize: "13px", fontWeight: 500, color: "rgba(19,0,50,0.9)" }}
            >
              {activeRecipient?.name ?? "Select recipient"}
            </span>
            <CaretDown
              size={12}
              weight="bold"
              style={{
                color: "rgba(19,0,50,0.45)",
                flexShrink: 0,
                transform: recipientOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          </button>

          {/* Dropdown */}
          {recipientOpen && allRecipients.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-1 z-50 bg-white overflow-hidden"
              style={{
                border: "1px solid rgba(19,0,50,0.15)",
                borderRadius: "4px",
                boxShadow: "0 4px 16px rgba(19,0,50,0.12)",
              }}
            >
              {allRecipients.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onRecipientChange?.(r.id);
                    setRecipientOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                    style={{
                      background: r.color,
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(r.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{ fontSize: "13px", fontWeight: 500, color: "rgba(19,0,50,0.9)" }}
                    >
                      {r.name}
                    </p>
                    <p className="truncate" style={{ fontSize: "11px", color: "rgba(19,0,50,0.45)" }}>
                      {r.email}
                    </p>
                  </div>
                  {activeRecipient?.id === r.id && (
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: r.color }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* "Standard Fields" collapsible section + 2-col grids */}
      <div className="flex-1 overflow-y-auto">
        {/* Standard Fields header — collapsible, matches DocuSign */}
        <button
          onClick={() => setStandardFieldsOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(19,0,50,0.08)" }}
        >
          {standardFieldsOpen ? (
            <CaretDown size={12} weight="bold" style={{ color: "rgba(19,0,50,0.45)", flexShrink: 0 }} />
          ) : (
            <CaretRight size={12} weight="bold" style={{ color: "rgba(19,0,50,0.45)", flexShrink: 0 }} />
          )}
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "rgba(19,0,50,0.8)",
            }}
          >
            Standard Fields
          </span>
        </button>

        {standardFieldsOpen && (
          <div className="pb-2">
            {FIELD_PALETTE_CATEGORIES.map((category) => {
              const q = searchQuery.toLowerCase();
              const matchingFields = q
                ? category.fields.filter((type) => (FIELD_LABELS[type] ?? type).toLowerCase().includes(q))
                : category.fields;
              if (matchingFields.length === 0) return null;
              return (
                <div key={category.label} className="px-3 pt-3 pb-1">
                  <p
                    className="px-0.5 mb-2"
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "rgba(19,0,50,0.40)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {category.label}
                  </p>
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: "1fr 1fr" }}
                  >
                    {matchingFields.map((type) => (
                      <DraggableFieldItem
                        key={type}
                        type={type}
                        activeTool={activeTool}
                        activeRecipient={activeRecipient}
                        onClick={() => onToolSelect(activeTool === type ? "select" : type)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div
        className="px-4 py-2.5 flex-shrink-0"
        style={{
          borderTop: "1px solid rgba(19,0,50,0.08)",
          background: "#FAFAFA",
        }}
      >
        <p style={{ fontSize: "11.5px", color: "rgba(19,0,50,0.45)", lineHeight: 1.5 }}>
          {activeTool !== "select"
            ? `Click on the document to place a ${FIELD_LABELS[activeTool as FieldType]} field`
            : "Select a field type, then click on the document to place it"}
        </p>
      </div>
    </div>
  );
}
