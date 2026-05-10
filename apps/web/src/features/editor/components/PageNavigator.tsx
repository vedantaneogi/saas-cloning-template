"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DotsThree, CaretDown, ChatText, EyeSlash } from "@phosphor-icons/react";
import type { PlacedField } from "../model/types";

interface DocumentSection {
  id: string;
  name: string;
  pageCount: number;
  /** Global (1-based) page number of the first page of this document */
  startPage: number;
}

interface PageNavigatorProps {
  pageCount: number;
  currentPage: number;
  fields: PlacedField[];
  pageImageUrls?: Record<number, string>;
  onPageChange: (page: number) => void;
  /** @deprecated Pass `documents` instead for per-doc info. Kept for backwards compat. */
  documentName?: string;
  /** When provided, each document is shown as its own section in the navigator. */
  documents?: DocumentSection[];
  envelopeId?: string;
  onCommentClick?: () => void;
  onToggleRightPanel?: () => void;
}

export function PageNavigator({
  pageCount,
  currentPage,
  fields,
  pageImageUrls,
  onPageChange,
  documentName = "Document",
  documents,
  envelopeId,
  onCommentClick,
  onToggleRightPanel,
}: PageNavigatorProps) {
  const router = useRouter();
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionsOpen) return;
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionsOpen]);

  const getPageFieldCount = (page: number) =>
    fields.filter((f) => f.page === page).length;

  // If multiple documents are supplied, render them section-by-section.
  // Otherwise fall back to the original single-doc layout.
  const sections: DocumentSection[] =
    documents && documents.length > 0
      ? documents
      : [{ id: "default", name: documentName, pageCount, startPage: 1 }];

  return (
    <div
      className="flex-shrink-0 bg-white flex flex-col overflow-hidden"
      style={{
        width: "280px",
        borderLeft: "1px solid rgba(19,0,50,0.12)",
      }}
    >
      {/* Header: Actions dropdown + Comment */}
      <div
        className="px-3 flex items-center gap-2 flex-shrink-0"
        style={{
          height: "44px",
          borderBottom: "1px solid rgba(19,0,50,0.12)",
        }}
      >
        <div className="relative" ref={actionsRef}>
          <button
            onClick={() => setActionsOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-gray-50"
            style={{
              border: "1px solid rgba(19,0,50,0.2)",
              borderRadius: "4px",
              fontSize: "12.5px",
              fontWeight: 500,
              color: "rgba(19,0,50,0.9)",
            }}
          >
            Actions
            <CaretDown size={10} weight="bold" style={{ color: "rgba(19,0,50,0.45)", marginLeft: "2px" }} />
          </button>
          {actionsOpen && envelopeId && (
            <div
              className="absolute top-full mt-1 left-0 bg-white z-50 overflow-hidden"
              style={{ border: "1px solid rgba(19,0,50,0.15)", borderRadius: "6px", boxShadow: "0 8px 24px rgba(19,0,50,0.12)", minWidth: "180px" }}
            >
              {["Edit Message", "Edit Recipients", "Edit Documents"].map((label) => (
                <button
                  key={label}
                  onClick={() => { setActionsOpen(false); router.push(`/envelope/${envelopeId}/prepare`); }}
                  className="w-full px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                  style={{ fontSize: "13px", color: "rgba(19,0,50,0.85)" }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          {onCommentClick && (
            <button
              onClick={onCommentClick}
              className="flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-gray-100"
              style={{ color: "rgba(19,0,50,0.55)" }}
              title="Toggle comments"
            >
              <ChatText size={18} weight="bold" />
            </button>
          )}
          {onToggleRightPanel && (
            <button
              onClick={onToggleRightPanel}
              className="flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-gray-100"
              style={{ color: "rgba(19,0,50,0.55)" }}
              title="Hide panel"
            >
              <EyeSlash size={18} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* Per-document sections */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((doc, sectionIdx) => (
          <div key={doc.id}>
            {/* Document info header */}
            <div
              className="px-3 py-3 flex-shrink-0"
              style={{
                borderBottom: "1px solid rgba(19,0,50,0.08)",
                background: sectionIdx > 0 ? "rgba(19,0,50,0.02)" : "white",
              }}
            >
              <div className="flex items-start gap-2">
                {/* Doc icon */}
                <div
                  className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: "#F0EEFF" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                      stroke="#4C00FF"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="14 2 14 8 20 8"
                      stroke="#4C00FF"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate font-medium leading-tight"
                    style={{ fontSize: "12.5px", color: "rgba(19,0,50,0.9)" }}
                    title={doc.name}
                  >
                    {doc.name}
                  </p>
                  <p style={{ fontSize: "11px", color: "rgba(19,0,50,0.45)", marginTop: "2px" }}>
                    {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
                  </p>
                  {sections.length > 1 && (
                    <p style={{ fontSize: "11px", color: "rgba(19,0,50,0.35)", marginTop: "1px" }}>
                      Document {sectionIdx + 1} of {sections.length}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Page thumbnails for this document */}
            <div className="py-2 px-2 space-y-2">
              {Array.from({ length: doc.pageCount }).map((_, idx) => {
                const globalPage = doc.startPage + idx;
                const isActive = currentPage === globalPage;
                const fieldCount = getPageFieldCount(globalPage);
                const thumbUrl = pageImageUrls?.[globalPage];

                return (
                  <div key={globalPage}>
                    <button
                      onClick={() => onPageChange(globalPage)}
                      className="w-full flex flex-col items-center overflow-hidden transition-all group"
                      style={{
                        border: isActive
                          ? "2px solid #4C00FF"
                          : "2px solid rgba(19,0,50,0.10)",
                        borderRadius: "4px",
                        background: "white",
                        boxShadow: isActive
                          ? "0 0 0 2px rgba(76,0,255,0.12)"
                          : "none",
                      }}
                      title={`Page ${globalPage}${fieldCount > 0 ? ` · ${fieldCount} fields` : ""}`}
                    >
                      {/* Thumbnail */}
                      <div
                        className="w-full relative"
                        style={{ aspectRatio: "3/4", background: "#F7F7F8" }}
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={`Page ${globalPage}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full p-2 flex flex-col gap-1">
                            <div className="h-1 rounded-sm bg-gray-200 w-full" />
                            <div className="h-1 rounded-sm bg-gray-200 w-4/5" />
                            <div className="h-1 rounded-sm bg-gray-100 w-full mt-0.5" />
                            <div className="h-1 rounded-sm bg-gray-100 w-11/12" />
                            <div className="h-1 rounded-sm bg-gray-100 w-4/5" />
                            <div className="h-1 rounded-sm bg-gray-100 w-full mt-0.5" />
                            <div className="h-1 rounded-sm bg-gray-100 w-3/4" />
                            <div className="flex-1" />
                            <div className="h-px bg-gray-200 w-1/2 mx-auto" />
                          </div>
                        )}

                        {/* Field count badge */}
                        {fieldCount > 0 && (
                          <div
                            className="absolute top-1 right-1 text-white font-bold rounded-full w-4 h-4 flex items-center justify-center"
                            style={{
                              background: "#4C00FF",
                              fontSize: "9px",
                            }}
                          >
                            {fieldCount}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Page number row with three-dot menu */}
                    <div className="flex items-center justify-between px-1 pt-1">
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "#4C00FF" : "rgba(19,0,50,0.45)",
                        }}
                      >
                        {globalPage}
                      </span>
                      <button
                        className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-gray-100 opacity-0 group-hover:opacity-100"
                        style={{ color: "rgba(19,0,50,0.45)" }}
                        onClick={(e) => e.stopPropagation()}
                        title="Page options"
                      >
                        <DotsThree size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Separator between documents */}
            {sectionIdx < sections.length - 1 && (
              <div style={{ height: "1px", background: "rgba(19,0,50,0.12)", margin: "4px 0" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
