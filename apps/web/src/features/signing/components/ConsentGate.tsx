"use client";

import { useState } from "react";
import { Check, CaretDown } from "@phosphor-icons/react";
import { DocuSignLogo } from "@/components/ui/DocuSignLogo";

interface ConsentGateProps {
  onConsent: () => void;
  onFinishLater: () => void;
  onDecline: () => void;
}

export function ConsentGate({
  onConsent,
  onFinishLater,
  onDecline,
}: ConsentGateProps) {
  const [checked, setChecked] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-8 pt-8 pb-4">
          <DocuSignLogo size="lg" showText />
        </div>

        {/* Body */}
        <div className="px-8 pb-6">
          <p className="text-base mb-6" style={{ color: "#130032", lineHeight: 1.6 }}>
            Please read the{" "}
            <span className="underline font-medium" style={{ color: "#130032" }}>
              Electronic Record and Signature Disclosure
            </span>
            .
          </p>

          {/* Consent checkbox — entire row clickable */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setChecked(!checked)}
          >
            <div
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-all"
              style={{
                border: `2px solid ${checked ? "#4C00FF" : "#BFBFBF"}`,
                background: checked ? "#4C00FF" : "white",
                borderRadius: 4,
              }}
            >
              {checked && <Check size={14} weight="bold" color="white" />}
            </div>
            <span className="text-base" style={{ color: "#130032" }}>
              I agree to use electronic records and signatures.{" "}
              <span style={{ color: "#E53935" }}>*</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 flex items-center justify-between border-t"
          style={{ borderColor: "#E8E8E8" }}
        >
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded border text-sm"
            style={{ borderColor: "#D0D0D0", color: "#130032" }}
          >
            English (US)
            <CaretDown size={12} />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setOtherOpen(!otherOpen)}
                className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-colors"
                style={{ background: "#E0E0E0", color: "#130032" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#D0D0D0")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#E0E0E0")}
              >
                Other Options
                <CaretDown size={12} weight="bold" />
              </button>
              {otherOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOtherOpen(false)} />
                  <div
                    className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-xl border z-20 py-1 min-w-[220px]"
                    style={{ borderColor: "#E0E0E0" }}
                  >
                    <button
                      onClick={() => { setOtherOpen(false); onFinishLater(); }}
                      className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors"
                      style={{ color: "#130032" }}
                    >
                      Finish Later
                    </button>
                    <button
                      className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors opacity-50 cursor-not-allowed"
                      style={{ color: "#130032" }}
                      disabled
                    >
                      Assign to Someone Else
                    </button>
                    <button
                      onClick={() => { setOtherOpen(false); onDecline(); }}
                      className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors"
                      style={{ color: "#130032" }}
                    >
                      Decline to Sign
                    </button>
                    <button
                      className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors opacity-50 cursor-not-allowed"
                      style={{ color: "#130032" }}
                      disabled
                    >
                      Session Information
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={onConsent}
              disabled={!checked}
              className="px-6 py-2.5 rounded text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: "#1B0A3C" }}
              onMouseOver={(e) => { if (checked) e.currentTarget.style.background = "#3D00CC"; }}
              onMouseOut={(e) => (e.currentTarget.style.background = "#1B0A3C")}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
