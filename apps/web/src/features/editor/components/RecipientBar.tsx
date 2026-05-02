"use client";

import type { EditorRecipient, PlacedField } from "../model/types";

interface RecipientBarProps {
  recipients: EditorRecipient[];
  activeRecipientId: string | null;
  fields: PlacedField[];
  onSelect: (id: string) => void;
}

export function RecipientBar({ recipients, activeRecipientId, fields, onSelect }: RecipientBarProps) {
  const getFieldCountForRecipient = (recipientId: string) =>
    fields.filter((f) => f.recipientId === recipientId).length;

  return (
    <div
      className="flex items-center gap-1.5 px-4 py-2 border-b bg-white flex-shrink-0 overflow-x-auto"
      style={{ borderColor: "#E0E0E0" }}
    >
      <span className="text-xs font-semibold text-gray-400 mr-2 whitespace-nowrap flex-shrink-0">
        Signing order:
      </span>

      {recipients.map((recipient, idx) => {
        const isActive = activeRecipientId === recipient.id;
        const fieldCount = getFieldCountForRecipient(recipient.id);

        return (
          <button
            key={recipient.id}
            onClick={() => onSelect(recipient.id)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 group"
            style={{
              background: isActive ? recipient.color : "transparent",
              color: isActive ? "white" : recipient.color,
              border: `2px solid ${recipient.color}`,
            }}
            title={`${recipient.email} — ${recipient.role}`}
          >
            {/* Routing order badge */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: isActive ? "rgba(255,255,255,0.25)" : `${recipient.color}20`,
                color: isActive ? "white" : recipient.color,
              }}
            >
              {recipient.order}
            </div>
            <span className="font-semibold">{recipient.name}</span>
            <span
              className="text-xs opacity-75"
              style={{ color: isActive ? "rgba(255,255,255,0.85)" : recipient.color }}
            >
              ({recipient.role})
            </span>
            {fieldCount > 0 && (
              <span
                className="text-xs rounded-full px-1.5 font-bold"
                style={{
                  background: isActive ? "rgba(255,255,255,0.2)" : `${recipient.color}15`,
                  color: isActive ? "white" : recipient.color,
                }}
              >
                {fieldCount}
              </span>
            )}
          </button>
        );
      })}

      {recipients.length === 0 && (
        <span className="text-xs text-gray-400 italic">No recipients added</span>
      )}
    </div>
  );
}
