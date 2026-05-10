"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createEnvelope } from "@/features/envelopes/api";

const TOTAL_STEPS = 5;
const COMPLETED_STEPS = 3;

export function GetStartedBar() {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  const createEnvelopeMutation = useMutation({
    mutationFn: () =>
      createEnvelope({
        subject: "New Envelope",
        recipients: [],
      }),
    onSuccess: (envelope) => {
      router.push(`/envelope/${envelope.id}/prepare`);
    },
  });

  if (dismissed) return null;

  const pct = Math.round((COMPLETED_STEPS / TOTAL_STEPS) * 100);

  return (
    <div
      className="flex-shrink-0"
      style={{
        background: "white",
        borderBottom: "1px solid rgba(19, 0, 50, 0.1)",
        height: "44px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "0 16px",
      }}
    >
      {/* "Get started" bold label */}
      <span
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "rgba(19, 0, 50, 0.9)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Get started
      </span>

      {/* Inline progress bar — 120px wide, 4px tall, #260559 fill */}
      <div
        style={{
          width: "120px",
          height: "4px",
          background: "#E0E0E0",
          borderRadius: "2px",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "#260559",
            borderRadius: "2px",
          }}
        />
      </div>

      {/* "3/5 actions completed" purple link */}
      <button
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "#4C00FF",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          textDecoration: "none",
        }}
        onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
        onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
      >
        {COMPLETED_STEPS}/{TOTAL_STEPS} actions completed
      </button>

      {/* "What's next?" muted text */}
      <button
        style={{
          fontSize: "13px",
          color: "rgba(19, 0, 50, 0.6)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = "rgba(19, 0, 50, 0.9)")}
        onMouseOut={(e) => (e.currentTarget.style.color = "rgba(19, 0, 50, 0.6)")}
      >
        What&apos;s next?
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* "Send a Document" outlined button */}
      <button
        onClick={() => createEnvelopeMutation.mutate()}
        disabled={createEnvelopeMutation.isPending}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 12px",
          borderRadius: "4px",
          fontSize: "13px",
          fontWeight: 600,
          border: "1px solid #260559",
          color: "#260559",
          background: "white",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          opacity: createEnvelopeMutation.isPending ? 0.6 : 1,
        }}
        onMouseOver={(e) => {
          if (!createEnvelopeMutation.isPending) {
            (e.currentTarget as HTMLButtonElement).style.background = "#F4EEFF";
          }
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "white";
        }}
      >
        {createEnvelopeMutation.isPending ? (
          <span
            style={{
              width: "12px",
              height: "12px",
              border: "2px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "9999px",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }}
          />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        )}
        Send a Document
      </button>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        style={{
          background: "none",
          border: "none",
          padding: "4px",
          cursor: "pointer",
          color: "rgba(19, 0, 50, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          flexShrink: 0,
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = "rgba(19, 0, 50, 0.7)")}
        onMouseOut={(e) => (e.currentTarget.style.color = "rgba(19, 0, 50, 0.4)")}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  );
}
