"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getEnvelope } from "@/features/envelopes/api";
import { EnvelopeDetail } from "@/features/envelopes/components/EnvelopeDetail";

const DS_FONT = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";

export function EnvelopeDetailClient() {
  const { id } = useParams<{ id: string }>();

  const {
    data: envelope,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["envelope", id],
    queryFn: () => getEnvelope(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-9 h-9 border-[3px] rounded-full animate-spin"
            style={{ borderColor: "#260559", borderTopColor: "transparent" }}
          />
          <p
            className="text-sm"
            style={{ color: "rgba(19,0,50,0.6)", fontFamily: DS_FONT }}
          >
            Loading envelope…
          </p>
        </div>
      </div>
    );
  }

  if (isError || !envelope) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#FFEBEE" }}
          >
            <svg viewBox="0 0 24 24" fill="#D93025" width="28" height="28">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <h2
            className="text-lg font-semibold mb-1"
            style={{ color: "rgba(19,0,50,0.9)", fontFamily: DS_FONT }}
          >
            Envelope not found
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: "rgba(19,0,50,0.6)", fontFamily: DS_FONT }}
          >
            This envelope may have been deleted or you don&apos;t have access.
          </p>
          <a
            href="/agreements"
            className="text-sm font-medium hover:underline"
            style={{ color: "#4C00FF", fontFamily: DS_FONT }}
          >
            ← Back to Agreements
          </a>
        </div>
      </div>
    );
  }

  return <EnvelopeDetail envelope={envelope} />;
}
