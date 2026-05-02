"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Warning, X } from "@phosphor-icons/react";

interface DeclineDialogProps {
  open: boolean;
  onClose: () => void;
  onDecline: (reason: string) => void;
  isDeclineLoading?: boolean;
}

const DECLINE_REASONS = [
  "I have questions about the document",
  "I need to review with others first",
  "The document contains errors",
  "I disagree with the terms",
  "I signed by mistake",
  "Other reason",
];

export function DeclineDialog({ open, onClose, onDecline, isDeclineLoading }: DeclineDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const finalReason = selectedReason === "Other reason" ? customReason : selectedReason;
  const canDecline = !!finalReason.trim();

  const handleDecline = () => {
    if (canDecline) {
      onDecline(finalReason.trim());
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Decline to Sign" size="md">
      {/* Warning banner */}
      <div
        className="flex items-start gap-3 p-3.5 rounded-xl mb-5"
        style={{ background: "#FFF3E0", border: "1px solid #FFE0B2" }}
      >
        <Warning size={18} weight="fill" color="#F57C00" className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold" style={{ color: "#E65100" }}>
            This is a permanent action
          </p>
          <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
            Once you decline, the sender will be immediately notified. You will need to be
            re-invited to sign this document.
          </p>
        </div>
      </div>

      {/* Reason selection */}
      <div className="mb-4">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1B0A3C" }}>
          Why are you declining? <span className="text-red-500">*</span>
        </p>
        <div className="space-y-2">
          {DECLINE_REASONS.map((reason) => (
            <label
              key={reason}
              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:border-gray-300"
              style={{
                borderColor: selectedReason === reason ? "#1B0A3C" : "#E8E8E8",
                background: selectedReason === reason ? "#F0F0F0" : "transparent",
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  borderColor: selectedReason === reason ? "#1B0A3C" : "#D0D0D0",
                }}
              >
                {selectedReason === reason && (
                  <div className="w-2 h-2 rounded-full" style={{ background: "#1B0A3C" }} />
                )}
              </div>
              <input
                type="radio"
                className="sr-only"
                name="decline-reason"
                value={reason}
                checked={selectedReason === reason}
                onChange={() => setSelectedReason(reason)}
              />
              <span className="text-sm" style={{ color: selectedReason === reason ? "#1B0A3C" : "#1B0A3C" }}>
                {reason}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom reason text area */}
      {selectedReason === "Other reason" && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
            Please describe your reason
          </label>
          <textarea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Please describe why you are declining to sign..."
            rows={3}
            className="w-full px-3 py-2.5 border rounded-lg text-sm outline-none resize-none transition-all"
            style={{ borderColor: "#E0E0E0" }}
            onFocus={(e) => {
              e.target.style.borderColor = "#1B0A3C";
              e.target.style.boxShadow = "0 0 0 3px rgba(27,10,60,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#E0E0E0";
              e.target.style.boxShadow = "none";
            }}
            autoFocus
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
          style={{ borderColor: "#E0E0E0", color: "#6B6B6B" }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Cancel
        </button>
        <button
          onClick={handleDecline}
          disabled={!canDecline || isDeclineLoading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
          style={{ background: "#D93025" }}
          onMouseOver={(e) => { if (canDecline) e.currentTarget.style.background = "#B71C1C"; }}
          onMouseOut={(e) => (e.currentTarget.style.background = "#D93025")}
        >
          {isDeclineLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Declining...
            </>
          ) : (
            <>
              <X size={14} weight="bold" />
              Decline to Sign
            </>
          )}
        </button>
      </div>
    </Dialog>
  );
}
