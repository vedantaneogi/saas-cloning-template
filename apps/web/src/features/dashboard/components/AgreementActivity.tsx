"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, FileText, Info, CaretRight } from "@phosphor-icons/react";
import { getEnvelopes } from "@/features/envelopes/api";
import type { Envelope } from "@/features/envelopes/types";

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

function ActivityStatus({ status }: { status: Envelope["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1" style={{ color: "#16a34a", fontSize: "14px" }}>
        <CheckCircle size={18} color="#16a34a" weight="fill" />
        Completed
      </span>
    );
  }
  if (status === "voided") {
    return (
      <span className="inline-flex items-center gap-1" style={{ color: "#6B7280", fontSize: "14px" }}>
        <XCircle size={18} color="#9CA3AF" weight="fill" />
        Voided
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span className="inline-flex items-center gap-1" style={{ color: "#dc2626", fontSize: "14px" }}>
        <XCircle size={18} color="#dc2626" weight="fill" />
        Declined
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1" style={{ color: "#6B7280", fontSize: "14px" }}>
        <FileText size={18} color="#9CA3AF" weight="fill" />
        Draft
      </span>
    );
  }
  return (
    <span style={{ color: "#6B7280", fontSize: "14px" }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function AgreementActivity() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["agreement-activity"],
    queryFn: () => getEnvelopes({ perPage: 5, page: 1 }),
  });

  const envelopes = (data?.items ?? []).slice(0, 3);

  if (isLoading) {
    return (
      <div className="bg-white" style={{ border: "1px solid #E0E0E0", borderRadius: "8px" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#E0E0E0" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(19,0,50,0.6)", letterSpacing: "0.5px" }}>
            AGREEMENT ACTIVITY
          </h2>
        </div>
        <div className="p-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (envelopes.length === 0) return null;

  return (
    <div className="bg-white" style={{ border: "1px solid #E0E0E0", borderRadius: "8px" }}>
      <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#E0E0E0" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(19,0,50,0.6)", letterSpacing: "0.5px" }}>
          AGREEMENT ACTIVITY
        </h2>
        <Info size={14} color="rgba(19,0,50,0.3)" weight="fill" />
      </div>

      <div>
        {envelopes.map((envelope, idx) => (
          <div
            key={envelope.id}
            className="flex items-center px-5 cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ borderBottom: idx < envelopes.length - 1 ? "1px solid #F0F0F0" : "none", paddingTop: "24px", paddingBottom: "24px" }}
            onClick={() => router.push(`/agreements/${envelope.id}`)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm" style={{ color: "rgba(19,0,50,0.9)", fontWeight: 400 }}>
                {envelope.subject || "Untitled"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(19,0,50,0.4)" }}>
                {getRelativeTime((envelope as any).updated_at || (envelope as any).created_at || (envelope as any).sentAt)}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <ActivityStatus status={envelope.status} />
              <CaretRight size={16} color="rgba(19,0,50,0.3)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
