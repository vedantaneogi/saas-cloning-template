"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatDateLong, getRecipientColor } from "@/lib/utils";
import { Check, X as PhosphorX, CopySimple, Link } from "@phosphor-icons/react";
import type { Recipient } from "../types";

// ─── DocuSign design tokens ───────────────────────────────────────────────────
const DS_FONT         = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const COLOR_PRIMARY   = "rgba(19,0,50,0.9)";
const COLOR_SECONDARY = "rgba(19,0,50,0.6)";
const COLOR_MUTED     = "rgba(19,0,50,0.4)";
const COLOR_BORDER    = "rgba(19,0,50,0.1)";
const COLOR_ACCENT    = "#4C00FF";

interface RecipientListProps {
  recipients: Recipient[];
  /** Current envelope status — used to decide whether to show signing links */
  envelopeStatus?: string;
  /** Called when the user clicks "Copy Link" for a recipient */
  onCopySigningLink?: (url: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  signer:            "Needs to Sign",
  approver:          "Needs to Approve",
  cc:                "Receives a Copy",
  certifiedDelivery: "Needs to View",
  viewer:            "Needs to View",
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

// ─── Status icon ──────────────────────────────────────────────────────────────
function RecipientStatusIcon({ status }: { status: Recipient["status"] }) {
  if (status === "completed") {
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "#E6F9ED" }}
      >
        <Check size={14} weight="bold" color="#00B851" />
      </div>
    );
  }
  if (status === "sent") {
    return (
      <div
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={{ borderColor: "#0288D1" }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: "#0288D1" }} />
      </div>
    );
  }
  if (status === "declined") {
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "#FFEBEE" }}
      >
        <PhosphorX size={14} weight="bold" color="#D93025" />
      </div>
    );
  }
  // waiting
  return (
    <div
      className="w-6 h-6 rounded-full border-2 flex-shrink-0"
      style={{ borderColor: COLOR_BORDER }}
    />
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer select-none"
      style={{ fontFamily: DS_FONT }}
    >
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className="relative flex-shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          width: "36px",
          height: "20px",
          background: checked ? "#260559" : "rgba(19,0,50,0.2)",
          outline: "none",
        }}
      >
        <span
          className="absolute top-0.5 rounded-full bg-white shadow transition-transform"
          style={{
            width: "16px",
            height: "16px",
            transform: checked ? "translateX(18px)" : "translateX(2px)",
          }}
        />
      </button>
      <span className="text-sm" style={{ color: COLOR_SECONDARY }}>
        {label}
      </span>
    </label>
  );
}

// ─── Signing link row ─────────────────────────────────────────────────────────
function SigningLinkRow({
  token,
  onCopy,
}: {
  token: string;
  onCopy: (url: string) => void;
}) {
  const [localCopied, setLocalCopied] = useState(false);
  const signingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sign/${token}`
      : `/sign/${token}`;

  const handleCopy = () => {
    onCopy(signingUrl);
    setLocalCopied(true);
    setTimeout(() => setLocalCopied(false), 2000);
  };

  return (
    <div
      className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded"
      style={{ background: "rgba(76,0,255,0.04)", border: `1px solid rgba(76,0,255,0.12)` }}
    >
      <Link size={12} weight="bold" style={{ color: COLOR_ACCENT, flexShrink: 0 }} />
      <span
        className="flex-1 text-xs truncate font-mono"
        style={{ color: COLOR_SECONDARY }}
        title={signingUrl}
      >
        {signingUrl}
      </span>
      <button
        onClick={handleCopy}
        title="Copy signing link"
        className="flex items-center gap-1 text-xs font-medium flex-shrink-0 transition-colors"
        style={{ color: localCopied ? "#00B851" : COLOR_ACCENT, fontFamily: DS_FONT }}
        onMouseEnter={(e) => {
          if (!localCopied) e.currentTarget.style.color = "#3700cc";
        }}
        onMouseLeave={(e) => {
          if (!localCopied) e.currentTarget.style.color = COLOR_ACCENT;
        }}
      >
        <CopySimple size={12} weight="bold" />
        {localCopied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RecipientList({
  recipients,
  envelopeStatus,
  onCopySigningLink,
}: RecipientListProps) {
  const [signingOrderEnabled, setSigningOrderEnabled]     = useState(false);
  const [showRecipientDetails, setShowRecipientDetails]   = useState(false);

  // Show signing links when envelope is sent/delivered and token is available
  const showSigningLinks =
    (envelopeStatus === "sent" || envelopeStatus === "delivered") &&
    typeof onCopySigningLink === "function";

  return (
    <div style={{ fontFamily: DS_FONT }}>
      {/* Controls row */}
      <div className="flex items-center gap-6 mb-5">
        <Toggle
          checked={signingOrderEnabled}
          onChange={() => setSigningOrderEnabled((v) => !v)}
          label="Signing Order"
        />
        <Toggle
          checked={showRecipientDetails}
          onChange={() => setShowRecipientDetails((v) => !v)}
          label="Show recipient details"
        />
      </div>

      {/* Recipients list */}
      {recipients.length === 0 ? (
        <div className="py-12 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            width="40"
            height="40"
            className="mx-auto mb-3"
            style={{ color: COLOR_MUTED, opacity: 0.5 }}
          >
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <p className="text-sm" style={{ color: COLOR_MUTED }}>
            No recipients added
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recipients.map((recipient, idx) => (
            <div
              key={recipient.id}
              className="px-4 py-3.5 rounded-lg border transition-shadow hover:shadow-sm"
              style={{ borderColor: COLOR_BORDER, background: "#FFFFFF" }}
            >
              <div className="flex items-center gap-4">
                {/* Signing order number */}
                {signingOrderEnabled && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: getRecipientColor(idx) }}
                  >
                    {recipient.order ?? idx + 1}
                  </div>
                )}

                {/* Status icon (only when not showing order) */}
                {!signingOrderEnabled && (
                  <RecipientStatusIcon status={recipient.status} />
                )}

                {/* Avatar */}
                <Avatar
                  name={recipient.name}
                  color={getRecipientColor(idx)}
                  size="md"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: COLOR_PRIMARY }}
                  >
                    {recipient.name}
                  </p>
                  {showRecipientDetails && (
                    <p className="text-xs truncate" style={{ color: COLOR_SECONDARY }}>
                      {recipient.email}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: COLOR_MUTED }}>
                    {getRoleLabel(recipient.role)}
                  </p>
                </div>

                {/* Status badge / date */}
                <div className="flex-shrink-0 text-right">
                  {recipient.status === "completed" ? (
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "#00B851" }}>
                        Signed
                      </p>
                      {recipient.signedAt && (
                        <p className="text-xs" style={{ color: COLOR_MUTED }}>
                          {formatDateLong(recipient.signedAt)}
                        </p>
                      )}
                    </div>
                  ) : recipient.status === "sent" ? (
                    <span className="text-xs font-medium" style={{ color: "#0288D1" }}>
                      Sent
                    </span>
                  ) : recipient.status === "declined" ? (
                    <span className="text-xs font-medium" style={{ color: "#D93025" }}>
                      Declined
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: COLOR_MUTED }}>
                      Waiting
                    </span>
                  )}
                </div>
              </div>

              {/* Signing link — shown when envelope is sent and recipient has a token */}
              {showSigningLinks &&
                recipient.signing_token &&
                recipient.status !== "completed" &&
                recipient.status !== "declined" && (
                  <SigningLinkRow
                    token={recipient.signing_token}
                    onCopy={onCopySigningLink!}
                  />
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
