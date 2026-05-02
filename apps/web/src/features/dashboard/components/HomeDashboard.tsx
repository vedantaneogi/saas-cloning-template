"use client";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getEnvelopes } from "@/features/envelopes/api";
import { createEnvelope } from "@/features/envelopes/api";
import { TasksPanel } from "./TasksPanel";
import { OverviewPanel } from "./OverviewPanel";
import { AgreementActivity } from "./AgreementActivity";
import { BottomPromoCards } from "./BottomPromoCards";

const CDN_SVG = "https://docucdn-a.akamaihd.net/olive/images/2.110.0/ndse/ndse-IA/emptyStateEnvelopesIA.svg";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const PRIMARY_COLOR = "#260559";
const PRIMARY_TEXT = "rgba(19, 0, 50, 0.9)";
const SECONDARY_TEXT = "rgba(19, 0, 50, 0.6)";
const LINK_COLOR = "#4C00FF";

export function HomeDashboard() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["home-envelope-check"],
    queryFn: () => getEnvelopes({ perPage: 1, page: 1 }),
  });

  const createMut = useMutation({
    mutationFn: () => createEnvelope({ subject: "New Envelope", recipients: [] }),
    onSuccess: (env) => router.push(`/envelope/${env.id}/prepare`),
  });

  if (isLoading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
        <div className="flex gap-6">
          <div className="flex-1 h-48 bg-gray-100 rounded-lg animate-pulse" />
          <div className="w-72 h-48 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const hasData = (data?.total ?? 0) > 0;

  if (!hasData) {
    return (
      <div
        className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex flex-col gap-8"
        style={{ fontFamily: DS_FONT }}
      >
        {/* Empty state card */}
        <div
          className="flex items-center gap-10"
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "40px 48px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            maxWidth: "780px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Illustration */}
          <div style={{ flexShrink: 0, width: "120px" }}>
            <img
              src={CDN_SVG}
              alt=""
              width={120}
              height={120}
              style={{ display: "block", objectFit: "contain" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: PRIMARY_TEXT,
                margin: "0 0 10px",
                fontFamily: DS_FONT,
              }}
            >
              Send your first document for signature
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: SECONDARY_TEXT,
                lineHeight: "1.6",
                margin: "0 0 16px",
                fontFamily: DS_FONT,
              }}
            >
              Ready to streamline your agreement process? Sending an envelope helps you collect
              secure signatures and move your documents forward with confidence.
            </p>
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: LINK_COLOR,
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: DS_FONT,
                textDecoration: "none",
              }}
              onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              Get Signatures
            </button>
          </div>
        </div>

        {/* Bottom promo cards */}
        <div style={{ maxWidth: "780px", margin: "0 auto", width: "100%" }}>
          <BottomPromoCards />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
      <div className="flex gap-6">
        <TasksPanel />
        <OverviewPanel />
      </div>
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <AgreementActivity />
        </div>
        <div className="w-72 flex-shrink-0" />
      </div>
      <BottomPromoCards />
    </div>
  );
}
