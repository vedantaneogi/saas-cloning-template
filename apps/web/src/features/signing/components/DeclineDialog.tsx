"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

interface DeclineDialogProps {
  open: boolean;
  onClose: () => void;
  onDecline: (reason: string) => void;
  isDeclineLoading?: boolean;
}

export function DeclineDialog({ open, onClose, onDecline, isDeclineLoading }: DeclineDialogProps) {
  const [step, setStep] = useState<"warning" | "reason">("warning");
  const [reason, setReason] = useState("");

  if (!open) return null;

  const handleClose = () => {
    setStep("warning");
    setReason("");
    onClose();
  };

  if (step === "warning") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.5)" }}
      >
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
          <div className="flex items-start justify-between px-8 pt-7 pb-0">
            <h2 className="text-xl font-semibold" style={{ color: "#1B0A3C" }}>
              Decline to sign
            </h2>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <X size={20} weight="bold" color="#1B0A3C" />
            </button>
          </div>

          <div className="px-8 py-5">
            <p className="text-sm leading-relaxed" style={{ color: "#1B0A3C" }}>
              Declining to sign will permanently void this envelope. If you would like to request
              changes to this document, select <strong>Finish Later</strong> and contact the sender
              directly.
            </p>
            <p className="text-sm mt-4" style={{ color: "#1B0A3C" }}>
              Select <strong>Continue</strong> to finish declining.
            </p>
          </div>

          <div className="px-8 py-5 flex items-center justify-end gap-3 border-t" style={{ borderColor: "#E8E8E8" }}>
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-lg text-sm font-semibold border transition-colors"
              style={{ borderColor: "#D0D0D0", color: "#1B0A3C" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Finish Later
            </button>
            <button
              onClick={() => setStep("reason")}
              className="px-7 py-3 rounded-lg text-sm font-bold text-white transition-all"
              style={{ background: "#4C00FF" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#3D00CC")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#4C00FF")}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-start justify-between px-8 pt-7 pb-0">
          <h2 className="text-xl font-semibold" style={{ color: "#1B0A3C" }}>
            Reason for declining
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X size={20} weight="bold" color="#1B0A3C" />
          </button>
        </div>

        <div className="px-8 py-5">
          <p className="text-sm mb-4" style={{ color: "#666" }}>
            Please provide a reason for declining. The sender will be notified.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter your reason for declining..."
            rows={4}
            className="w-full px-4 py-3 border rounded-lg text-sm outline-none resize-none transition-all"
            style={{ borderColor: "#D0D0D0" }}
            onFocus={(e) => {
              e.target.style.borderColor = "#4C00FF";
              e.target.style.boxShadow = "0 0 0 3px rgba(76,0,255,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#D0D0D0";
              e.target.style.boxShadow = "none";
            }}
            autoFocus
          />
        </div>

        <div className="px-8 py-5 flex items-center justify-end gap-3 border-t" style={{ borderColor: "#E8E8E8" }}>
          <button
            onClick={() => setStep("warning")}
            className="px-6 py-3 rounded-lg text-sm font-semibold border transition-colors"
            style={{ borderColor: "#D0D0D0", color: "#1B0A3C" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Back
          </button>
          <button
            onClick={() => onDecline(reason.trim() || "Declined by signer")}
            disabled={isDeclineLoading}
            className="px-7 py-3 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: "#D93025" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#B71C1C")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#D93025")}
          >
            {isDeclineLoading ? "Declining..." : "Decline to Sign"}
          </button>
        </div>
      </div>
    </div>
  );
}
