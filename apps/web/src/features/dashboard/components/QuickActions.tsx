"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, CaretDown, FileText } from "@phosphor-icons/react";
import { createEnvelope } from "@/features/envelopes/api";

const startMenuItems = [
  { label: "Send an Envelope", action: "create-envelope" },
  { label: "Use a Template", href: "/templates" },
  { label: "Create a Template", href: "/templates" },
  { label: "Sign a Document", href: "/agreements?filter=action-required" },
];

export function QuickActions() {
  const [startOpen, setStartOpen] = useState(false);
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

  return (
    <div className="flex flex-wrap gap-3">
      {/* Start dropdown */}
      <div className="relative">
        <button
          onClick={() => setStartOpen(!startOpen)}
          className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold text-white transition-colors"
          style={{ background: "#1B0A3C" }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#2D1260")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#1B0A3C")}
        >
          <Plus size={16} />
          Start
          <CaretDown size={14} />
        </button>

        {startOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setStartOpen(false)} />
            <div
              className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border z-20 py-1"
              style={{ borderColor: "#E0E0E0" }}
            >
              {startMenuItems.map((item) =>
                item.action === "create-envelope" ? (
                  <button
                    key={item.label}
                    className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setStartOpen(false);
                      createEnvelopeMutation.mutate();
                    }}
                    disabled={createEnvelopeMutation.isPending}
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href!}
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 no-underline"
                    onClick={() => setStartOpen(false)}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </>
        )}
      </div>

      {/* Get Signatures */}
      <button
        onClick={() => createEnvelopeMutation.mutate()}
        disabled={createEnvelopeMutation.isPending}
        className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-colors disabled:opacity-60"
        style={{
          background: "white",
          color: "#1B0A3C",
          border: "1px solid #1B0A3C",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
        onMouseOut={(e) => (e.currentTarget.style.background = "white")}
      >
        {createEnvelopeMutation.isPending ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
          </svg>
        )}
        Get Signatures
      </button>

      {/* Sign a Document */}
      <button
        onClick={() => router.push("/agreements?filter=action-required")}
        className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-colors"
        style={{
          background: "white",
          color: "#1B0A3C",
          border: "1px solid #1B0A3C",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
        onMouseOut={(e) => (e.currentTarget.style.background = "white")}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
        Sign a Document
      </button>

      {/* Use a Template */}
      <button
        onClick={() => router.push("/templates")}
        className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-colors"
        style={{
          background: "white",
          color: "#1B0A3C",
          border: "1px solid #1B0A3C",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#F5F5F5")}
        onMouseOut={(e) => (e.currentTarget.style.background = "white")}
      >
        <FileText size={16} />
        Use a Template
      </button>
    </div>
  );
}
