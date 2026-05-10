"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

export function InviteBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="w-full flex items-center px-6 py-3 border-b flex-shrink-0 relative"
      style={{ background: "white", borderColor: "#E0E0E0" }}
    >
      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {/* Info icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4C00FF"
          strokeWidth="2"
          width="18"
          height="18"
          className="flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="8" strokeLinecap="round" strokeWidth="2.5" />
          <line x1="12" y1="11" x2="12" y2="16" strokeLinecap="round" />
        </svg>

        <p className="text-sm" style={{ color: "#1B0A3C" }}>
          You have 4 invites available.{" "}
          <button
            className="font-semibold underline hover:no-underline"
            style={{ color: "#4C00FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Invite now.
          </button>
        </p>
      </div>

      {/* Close button — absolutely positioned so it doesn't shift center */}
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 absolute right-6"
        title="Dismiss"
        aria-label="Dismiss invite banner"
      >
        <X size={16} />
      </button>
    </div>
  );
}
