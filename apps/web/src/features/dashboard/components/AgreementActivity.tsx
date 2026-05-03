"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Info, CaretRight } from "@phosphor-icons/react";
import { getEnvelopes } from "@/features/envelopes/api";
import { useAuthStore } from "@/features/auth/store";
import type { Envelope } from "@/features/envelopes/types";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const MUTED_TEXT = "rgba(19, 0, 50, 0.4)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const BORDER_COLOR = "#E0E0E0";
const GREEN = "#00B851";
const BLUE = "#0288D1";
const GRAY_TRACK = "#E5E7EB";

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ProgressInfo {
  completed: number;
  total: number;
  fraction: number;
  label: string;
  barColor: string;
}

function getProgress(envelope: Envelope): ProgressInfo {
  const signers = (envelope.recipients ?? []).filter(
    (r) => r.role === "signer" || !r.role
  );
  const total = signers.length || 1;
  const completed = signers.filter(
    (r) => r.status === "completed" || (r.status as string) === "signed"
  ).length;
  const fraction = completed / total;

  if (envelope.status === "completed") {
    return { completed: total, total, fraction: 1, label: "Completed", barColor: GREEN };
  }
  if (envelope.status === "voided") {
    return { completed, total, fraction: 0, label: "Voided", barColor: "#D93025" };
  }
  if (envelope.status === "declined") {
    return { completed, total, fraction: 0, label: "Declined", barColor: "#D93025" };
  }
  if (envelope.status === "draft") {
    return { completed: 0, total, fraction: 0, label: "Draft", barColor: GRAY_TRACK };
  }

  // sent / delivered — show "You need to sign" or "N of M signed"
  const label =
    completed === 0
      ? "You need to sign"
      : `${completed} of ${total} signed`;

  return { completed, total, fraction, label, barColor: BLUE };
}

function SigningProgressBar({ envelope, currentUserEmail }: { envelope: Envelope; currentUserEmail?: string }) {
  const recipients = envelope.recipients ?? [];
  const isSelfSend = currentUserEmail && recipients.some(
    (r) => r.email?.toLowerCase() === currentUserEmail.toLowerCase() && (r.role === "signer" || !r.role)
  );

  if (!isSelfSend) {
    const statusLabels: Record<string, string> = { sent: "Sent", delivered: "Delivered", completed: "Completed", voided: "Voided", declined: "Declined", draft: "Draft" };
    return (
      <div style={{ minWidth: "140px" }}>
        <p style={{ fontSize: "11px", color: SECONDARY_TEXT, margin: 0, fontFamily: DS_FONT }}>
          {statusLabels[envelope.status] ?? envelope.status}
        </p>
      </div>
    );
  }

  const { fraction, label, barColor } = getProgress(envelope);
  const isVoidedOrDeclined = envelope.status === "voided" || envelope.status === "declined";

  return (
    <div style={{ minWidth: "140px" }}>
      {/* Bar */}
      {!isVoidedOrDeclined && (
        <div
          style={{
            width: "100%",
            height: "4px",
            background: GRAY_TRACK,
            borderRadius: "2px",
            overflow: "hidden",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              width: `${Math.max(fraction * 100, fraction > 0 ? 8 : 0)}%`,
              height: "100%",
              background: barColor,
              borderRadius: "2px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
      {/* Label */}
      <p
        style={{
          fontSize: "11px",
          color: isVoidedOrDeclined ? "#D93025" : SECONDARY_TEXT,
          margin: 0,
          fontFamily: DS_FONT,
          fontWeight: isVoidedOrDeclined ? 500 : 400,
        }}
      >
        {label}
      </p>
    </div>
  );
}

export function AgreementActivity() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["agreement-activity"],
    queryFn: () => getEnvelopes({ perPage: 5, page: 1 }),
  });

  const envelopes = (data?.items ?? []).slice(0, 3);

  if (isLoading) {
    return (
      <div
        className="bg-white"
        style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "8px", fontFamily: DS_FONT }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: BORDER_COLOR }}>
          <h2
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              color: SECONDARY_TEXT,
              fontFamily: DS_FONT,
              margin: 0,
            }}
          >
            AGREEMENT ACTIVITY
          </h2>
        </div>
        <div className="p-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: "48px", background: "#F3F4F6", borderRadius: "6px" }} />
          ))}
        </div>
      </div>
    );
  }

  if (envelopes.length === 0) return null;

  return (
    <div
      className="bg-white"
      style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "8px", fontFamily: DS_FONT }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-4 border-b"
        style={{ borderColor: BORDER_COLOR }}
      >
        <h2
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.6px",
            textTransform: "uppercase",
            color: SECONDARY_TEXT,
            fontFamily: DS_FONT,
            margin: 0,
          }}
        >
          AGREEMENT ACTIVITY
        </h2>
        <Info size={14} color="rgba(19,0,50,0.3)" weight="fill" />
      </div>

      {/* Rows */}
      <div>
        {envelopes.map((envelope, idx) => (
          <div
            key={envelope.id}
            role="button"
            tabIndex={0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "18px 20px",
              borderBottom: idx < envelopes.length - 1 ? `1px solid #F0F0F0` : "none",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,0,50,0.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            onClick={() => router.push(`/agreements/${envelope.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/agreements/${envelope.id}`);
              }
            }}
          >
            {/* Subject + timestamp */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 400,
                  color: PRIMARY_TEXT,
                  margin: "0 0 3px",
                  fontFamily: DS_FONT,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {envelope.subject || "Untitled"}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: MUTED_TEXT,
                  margin: 0,
                  fontFamily: DS_FONT,
                }}
              >
                {getRelativeTime(
                  envelope.lastModified ||
                    (envelope as any).updated_at ||
                    (envelope as any).created_at ||
                    envelope.sentAt
                )}
              </p>
            </div>

            {/* Status or progress bar (bar only for self-send) */}
            <SigningProgressBar envelope={envelope} currentUserEmail={currentUser?.email} />

            {/* Caret — styled as a clickable affordance */}
            <div
              style={{
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                flexShrink: 0,
              }}
            >
              <CaretRight size={16} color="rgba(19,0,50,0.3)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
