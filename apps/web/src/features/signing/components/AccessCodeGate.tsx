"use client";

import { useState } from "react";
import { Lock, Warning } from "@phosphor-icons/react";

interface AccessCodeGateProps {
  onVerified: () => void;
  onVerify: (code: string) => Promise<void>;
  documentName: string;
  senderName: string;
}

export function AccessCodeGate({ onVerified, onVerify, documentName, senderName }: AccessCodeGateProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onVerify(code.trim());
      onVerified();
    } catch {
      setError("Invalid access code. Please check with the sender and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Blurred placeholder behind — mimics a signing page */}
      <div
        className="absolute inset-0"
        style={{
          background: "#F5F5F5",
          filter: "blur(6px)",
          pointerEvents: "none",
        }}
      >
        {/* Fake header bar */}
        <div style={{ height: 64, background: "#1B0A3C" }} />
        {/* Fake page content area */}
        <div className="flex justify-center pt-8 px-4">
          <div
            style={{
              width: 700,
              height: 900,
              background: "white",
              borderRadius: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          />
        </div>
      </div>

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      {/* Access code card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Brand header */}
          <div
            className="px-8 py-5 flex items-center justify-between"
            style={{ background: "#1B0A3C" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1B0A3C" }}>
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
                style={{ background: "#EDE7F6" }}
              >
                <Lock size={18} weight="bold" style={{ color: "#4C00FF" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1B0A3C" }}>
                  {documentName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sent by <span className="font-medium">{senderName}</span>
                </p>
              </div>
            </div>

            <h2 className="text-lg font-bold mb-2" style={{ color: "#1B0A3C" }}>
              Access Code Required
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              The sender has protected this document with an access code. Enter the code you received to continue.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#6B6B6B" }}>
                Access Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                placeholder="Enter your access code…"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none border-2 transition-colors"
                style={{
                  borderColor: error ? "#D93025" : code ? "#1B0A3C" : "#E0E0E0",
                  color: "#1B0A3C",
                  letterSpacing: "0.08em",
                }}
                autoFocus
              />
            </div>

            {error && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg mb-4"
                style={{ background: "#FFEBEE", border: "1px solid #FFCDD2" }}
              >
                <Warning size={16} weight="fill" style={{ color: "#D93025", flexShrink: 0, marginTop: "1px" }} />
                <p className="text-xs" style={{ color: "#C62828" }}>
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={!code.trim() || loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: "#1B0A3C" }}
              onMouseOver={(e) => { if (code.trim() && !loading) e.currentTarget.style.background = "#3D00CC"; }}
              onMouseOut={(e) => (e.currentTarget.style.background = "#1B0A3C")}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={14} weight="bold" />
                  Verify & Continue
                </>
              )}
            </button>
          </div>

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
    </div>
  );
}
