"use client";

import { useState } from "react";
import type { EnvelopeDocument } from "../types";

// ─── DocuSign design tokens ───────────────────────────────────────────────────
const DS_FONT       = "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif";
const COLOR_PRIMARY = "rgba(19,0,50,0.9)";
const COLOR_MUTED   = "rgba(19,0,50,0.4)";
const COLOR_BORDER  = "rgba(19,0,50,0.1)";

interface DocumentPanelProps {
  documents: EnvelopeDocument[];
  envelopeId?: string;
}

// ─── Derive a short extension label (PDF / DOC / DOCX / …) from filename ────
function getExtLabel(docName: string): string {
  const match = docName.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toUpperCase() : "DOC";
}

// ─── Pick a badge colour per extension ───────────────────────────────────────
function getExtColor(ext: string): string {
  switch (ext) {
    case "PDF":  return "#D93025";
    case "DOCX":
    case "DOC":  return "#1565C0";
    default:     return "#555";
  }
}

// ─── PDF/DOC page thumbnail ───────────────────────────────────────────────────
function DocThumbnail({ docId, docName }: { docId: string; docName: string }) {
  const [imgError, setImgError] = useState(false);
  const src = `/api/documents/${docId}/pages/1`;

  const ext      = getExtLabel(docName);
  const extColor = getExtColor(ext);

  if (imgError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {/* Document-type-aware page illustration fallback */}
        <svg viewBox="0 0 60 78" fill="none" width="60" height="78" aria-hidden="true">
          <rect x="0" y="0" width="52" height="68" rx="2" fill="#E8EAF6" />
          <path d="M40 0L52 12" stroke="#9FA8DA" strokeWidth="1.5" />
          <rect x="40" y="0" width="12" height="12" rx="1" fill="#C5CAE9" />
          <rect x="0" y="52" width="52" height="16" rx="1" fill={extColor} />
          <text x="26" y="63" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">{ext}</text>
          <rect x="8" y="18" width="28" height="2" rx="1" fill="#C5CAE9" />
          <rect x="8" y="24" width="36" height="2" rx="1" fill="#C5CAE9" />
          <rect x="8" y="30" width="32" height="2" rx="1" fill="#C5CAE9" />
          <rect x="8" y="36" width="20" height="2" rx="1" fill="#C5CAE9" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Page 1 of ${docName}`}
      className="w-full h-full object-cover object-top"
      onError={() => setImgError(true)}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DocumentPanel({ documents, envelopeId }: DocumentPanelProps) {
  return (
    <aside
      className="w-64 flex-shrink-0 border-l bg-white overflow-y-auto"
      style={{ borderColor: COLOR_BORDER, fontFamily: DS_FONT }}
    >
      {/* Panel header */}
      <div
        className="px-4 pt-5 pb-3 sticky top-0 bg-white z-10"
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: COLOR_PRIMARY, fontSize: "13px", letterSpacing: "0.01em" }}
        >
          Documents
        </h3>
      </div>

      {/* Documents list */}
      <div className="px-4 pb-4 space-y-4">
        {documents.length === 0 ? (
          <div className="py-14 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(76,0,255,0.06)" }}
            >
              <svg viewBox="0 0 24 24" fill="rgba(19,0,50,0.3)" width="26" height="26">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7H20.5v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: COLOR_MUTED }}>
              No documents attached
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="group cursor-pointer">
              {/* Thumbnail card */}
              <div
                className="border rounded overflow-hidden transition-shadow hover:shadow-md relative"
                style={{ borderColor: COLOR_BORDER, background: "#F7F7F9" }}
              >
                <div className="w-full" style={{ height: "180px", position: "relative" }}>
                  <DocThumbnail docId={doc.id} docName={doc.name} />
                  {/* View overlay on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    style={{ background: "rgba(19,0,50,0.14)" }}
                    onClick={() => window.open(envelopeId ? `/api/envelopes/${envelopeId}/download` : `/api/documents/${doc.id}/download`, '_blank')}
                  >
                    <span
                      className="text-xs font-semibold px-3 py-1.5 rounded"
                      style={{ background: "#260559", color: "white" }}
                    >
                      View
                    </span>
                  </div>
                </div>
              </div>

              {/* Doc label below thumbnail */}
              <div className="mt-2">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: COLOR_PRIMARY }}
                  title={doc.name}
                >
                  {doc.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: COLOR_MUTED }}>
                  {doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
