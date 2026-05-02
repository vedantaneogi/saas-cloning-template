"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";

interface ConsentGateProps {
  senderName: string;
  documentName: string;
  recipientName?: string;
  onConsent: () => void;
  onDecline: () => void;
}

export function ConsentGate({
  senderName,
  documentName,
  recipientName,
  onConsent,
  onDecline,
}: ConsentGateProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1B0A3C 0%, #2D0A7A 100%)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Brand header */}
        <div
          className="px-8 py-5 flex items-center justify-between"
          style={{ background: "#1B0A3C" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "#1B0A3C" }}
            >
              <svg viewBox="0 0 24 24" fill="white" width="17" height="17">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">DocuSign</span>
          </div>
          <span className="text-white/40 text-xs">Secure Signing</span>
        </div>

        {/* Body */}
        <div className="px-8 py-7">
          {/* Document info */}
          <div
            className="flex items-start gap-3 p-4 rounded-xl mb-6"
            style={{ background: "#F8F7FF", border: "1px solid #E8E0FF" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#FFEBEE" }}
            >
              <svg viewBox="0 0 24 24" fill="#D93025" width="18" height="18">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1B0A3C" }}>
                {documentName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sent by <span className="font-medium">{senderName}</span>
                {recipientName && ` · Signing as ${recipientName}`}
              </p>
            </div>
          </div>

          <h2 className="text-lg font-bold mb-2" style={{ color: "#1B0A3C" }}>
            Electronic Record & Signature Disclosure
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Before you can sign, please review and agree to the following disclosure.
          </p>

          {/* Scrollable disclosure */}
          <div
            className="rounded-xl p-4 mb-5 text-xs leading-relaxed text-gray-600 space-y-2.5 overflow-y-auto"
            style={{ background: "#FAFAFA", border: "1px solid #F0F0F0", maxHeight: "160px" }}
          >
            <p className="font-semibold text-gray-700">CONSENT TO ELECTRONIC SIGNATURES</p>
            <p>
              By proceeding, you agree to sign this document electronically. Your electronic
              signature will have the same legal validity as a handwritten signature.
            </p>
            <p>
              You may withdraw your consent at any time before completing the signing process
              by clicking &ldquo;Decline&rdquo;. After declining, please contact the sender
              to arrange an alternative signing method.
            </p>
            <p>
              To access and retain electronic records, you need: a supported web browser,
              internet access, and the ability to save or print documents.
            </p>
            <p>
              Paper copies of any documents are available upon request. Contact the sender
              for assistance.
            </p>
          </div>

          {/* Consent checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group mb-6">
            <div
              className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all"
              style={{
                borderColor: checked ? "#1B0A3C" : "#D0D0D0",
                background: checked ? "#1B0A3C" : "white",
              }}
              onClick={() => setChecked(!checked)}
            >
              {checked && (
                <Check size={12} weight="bold" color="white" />
              )}
            </div>
            <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
              I agree to use electronic records and signatures and confirm I have read the
              disclosure above.
            </span>
          </label>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
              style={{ borderColor: "#E0E0E0", color: "#6B6B6B" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Decline
            </button>
            <button
              onClick={onConsent}
              disabled={!checked}
              className="flex-2 flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: "#1B0A3C", flex: 2 }}
              onMouseOver={(e) => { if (checked) e.currentTarget.style.background = "#3D00CC"; }}
              onMouseOut={(e) => (e.currentTarget.style.background = "#1B0A3C")}
            >
              Continue
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 text-center border-t"
          style={{ borderColor: "#F0F0F0", background: "#FAFAFA" }}
        >
          <p className="text-xs text-gray-400">
            Powered by <span className="font-bold" style={{ color: "#1B0A3C" }}>DocuSign Clone</span>
            {" "}&middot; Secure, legally binding e-signatures
          </p>
        </div>
      </div>
    </div>
  );
}
