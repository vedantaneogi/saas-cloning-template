import { Suspense } from "react";
import type { Metadata } from "next";
import { EnvelopeDetailClient } from "./EnvelopeDetailClient";

export const metadata: Metadata = {
  title: "Envelope Detail | Docusign",
  description: "View envelope status, recipients, and documents.",
};

export default function EnvelopeDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-9 h-9 border-[3px] border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#260559", borderTopColor: "transparent" }}
            />
            <p
              className="text-sm"
              style={{
                color: "rgba(19,0,50,0.6)",
                fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif",
              }}
            >
              Loading envelope…
            </p>
          </div>
        </div>
      }
    >
      <EnvelopeDetailClient />
    </Suspense>
  );
}
