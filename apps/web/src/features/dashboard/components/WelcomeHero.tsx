"use client";

import { useState, useRef } from "react";
import { useAuthStore } from "@/features/auth/store";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createEnvelope } from "@/features/envelopes/api";
import {
  PaperPlaneRight,
  PencilSimpleLine,
  EnvelopeSimple,
  Signature,
  Layout,
  FileText,
  UploadSimple,
  CaretDown,
  CaretRight,
} from "@phosphor-icons/react";

const heroButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "0.625px solid rgba(255, 255, 255, 0.5)",
  borderRadius: "4px",
  color: "white",
  height: "40px",
  fontSize: "16px",
  fontWeight: 500,
  paddingLeft: "16px",
  paddingRight: "16px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  transition: "background 0.15s",
  whiteSpace: "nowrap" as const,
};

export function WelcomeHero() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.name ?? "there";
  const router = useRouter();
  const [startOpen, setStartOpen] = useState(false);
  const [envelopesHovered, setEnvelopesHovered] = useState(false);
  const [templatesHovered, setTemplatesHovered] = useState(false);

  const createEnvelopeMutation = useMutation({
    mutationFn: () =>
      createEnvelope({ subject: "New Envelope", recipients: [] }),
    onSuccess: (envelope) => {
      router.push(`/envelope/${envelope.id}/prepare`);
    },
  });

  return (
    <div
      className="flex flex-col items-center justify-center px-6"
      style={{
        background: "radial-gradient(106.11% 145.09% at 50% -23.62%, rgb(66, 0, 202) 0%, rgb(38, 5, 89) 100%)",
        color: "white",
        width: "100%",
        height: "280px",
      }}
    >
      {/* Welcome heading */}
      <h1
        className="text-center mb-6"
        style={{ fontSize: "24px", fontWeight: 400, color: "white", lineHeight: "30px" }}
      >
        Welcome back, {displayName}
      </h1>

      {/* 4 action buttons in a row */}
      <div className="flex items-center gap-3 flex-wrap justify-center">

        {/* Start ▼ cascading dropdown — solid white background, purple text */}
        <div className="relative">
          <button
            onClick={() => setStartOpen(!startOpen)}
            style={{
              background: "#CAC2FF",
              border: "none",
              borderRadius: "4px",
              color: "rgba(19,0,50,0.9)",
              height: "40px",
              fontSize: "16px",
              fontWeight: 500,
              paddingLeft: "12px",
              paddingRight: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "background 0.15s",
              whiteSpace: "nowrap" as const,
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "#b8adff")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "#CAC2FF")
            }
          >
            Start
            <CaretDown size={14} weight="bold" />
          </button>

          {startOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setStartOpen(false);
                  setEnvelopesHovered(false);
                  setTemplatesHovered(false);
                }}
              />
              <div
                className="absolute left-0 top-full mt-1 bg-white rounded shadow-lg border z-20 py-2"
                style={{ borderColor: "#E0E0E0", minWidth: "220px" }}
              >
                {/* Agreements section */}
                <div
                  className="px-4 py-1"
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#6B7280",
                  }}
                >
                  Agreements
                </div>
                <div
                  className="relative"
                  onMouseEnter={() => setEnvelopesHovered(true)}
                  onMouseLeave={() => setEnvelopesHovered(false)}
                >
                  <button
                    className="flex items-center justify-between w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    style={{ color: "#1B0A3C", background: envelopesHovered ? "#F9F9F9" : "transparent" }}
                  >
                    <span className="flex items-center gap-2">
                      <EnvelopeSimple size={14} weight="bold" />
                      Envelopes
                    </span>
                    <CaretRight size={14} weight="bold" />
                  </button>

                  {/* Envelopes sub-menu */}
                  {envelopesHovered && (
                    <div
                      className="absolute left-full top-0 bg-white rounded shadow-lg border z-30 py-2"
                      style={{ borderColor: "#E0E0E0", minWidth: "200px" }}
                    >
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setEnvelopesHovered(false);
                          createEnvelopeMutation.mutate();
                        }}
                        disabled={createEnvelopeMutation.isPending}
                      >
                        <EnvelopeSimple size={14} weight="bold" />
                        Get Signatures
                      </button>
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setEnvelopesHovered(false);
                        }}
                      >
                        <Signature size={14} weight="bold" />
                        Sign a Document
                      </button>
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setEnvelopesHovered(false);
                          router.push("/templates");
                        }}
                      >
                        <Layout size={14} weight="bold" />
                        Use a Template
                      </button>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div
                  className="my-2 mx-4 border-t"
                  style={{ borderColor: "#F0F0F0" }}
                />

                {/* Templates section */}
                <div
                  className="px-4 py-1"
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#6B7280",
                  }}
                >
                  Templates
                </div>
                <div
                  className="relative"
                  onMouseEnter={() => setTemplatesHovered(true)}
                  onMouseLeave={() => setTemplatesHovered(false)}
                >
                  <button
                    className="flex items-center justify-between w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    style={{ color: "#1B0A3C", background: templatesHovered ? "#F9F9F9" : "transparent" }}
                  >
                    <span className="flex items-center gap-2">
                      <Layout size={14} weight="bold" />
                      Envelope Templates
                    </span>
                    <CaretRight size={14} weight="bold" />
                  </button>

                  {/* Sub-menu */}
                  {templatesHovered && (
                    <div
                      className="absolute left-full top-0 bg-white rounded shadow-lg border z-30 py-2"
                      style={{ borderColor: "#E0E0E0", minWidth: "220px" }}
                    >
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setTemplatesHovered(false);
                          router.push("/templates?action=create");
                        }}
                      >
                        <FileText size={14} weight="bold" />
                        Create an Envelope Template
                      </button>
                      <button
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                        style={{ color: "#1B0A3C" }}
                        onClick={() => {
                          setStartOpen(false);
                          setTemplatesHovered(false);
                          router.push("/templates?action=upload");
                        }}
                      >
                        <UploadSimple size={14} weight="bold" />
                        Upload a Template
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Get Signatures */}
        <button
          onClick={() => createEnvelopeMutation.mutate()}
          style={heroButtonStyle}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <PaperPlaneRight size={18} weight="bold" />
          Get Signatures
        </button>

        {/* Create an Envelope Template */}
        <button
          onClick={() => router.push("/templates?action=create")}
          style={heroButtonStyle}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Layout size={18} weight="bold" />
          Create an Envelope Template
        </button>

        {/* Sign a Document */}
        <button
          style={heroButtonStyle}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <PencilSimpleLine size={18} weight="bold" />
          Sign a Document
        </button>

      </div>
    </div>
  );
}
