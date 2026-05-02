"use client";

import Link from "next/link";
import {
  X,
  ArrowLeft,
  Question,
  Gear,
  CaretRight,
  PaperPlaneTilt,
  Eye,
} from "@phosphor-icons/react";
import type { PlacedField, EditorRecipient } from "../model/types";

interface PrepareToolbarProps {
  envelopeId: string;
  envelopeSubject: string;
  fields: PlacedField[];
  recipients: EditorRecipient[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSend: () => void;
  isSending: boolean;
  onPreview?: () => void;
}

export function PrepareToolbar({
  envelopeId,
  envelopeSubject: _envelopeSubject,
  fields: _fields,
  recipients: _recipients,
  onSend,
  isSending,
  onPreview,
}: PrepareToolbarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 flex-shrink-0 bg-white"
      style={{
        height: "48px",
        borderBottom: "1px solid rgba(19,0,50,0.12)",
      }}
    >
      {/* Left: close + back + breadcrumb */}
      <div className="flex items-center gap-0">
        {/* Close button */}
        <Link
          href="/agreements"
          className="flex items-center justify-center w-9 h-9 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800 no-underline"
          title="Close editor"
        >
          <X size={16} weight="bold" />
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Back to prepare */}
        <Link
          href={`/agreements/${envelopeId}`}
          className="flex items-center justify-center w-9 h-9 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800 no-underline"
          title="Back to prepare"
        >
          <ArrowLeft size={16} weight="bold" />
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-2" />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm">
          <Link
            href={`/agreements/${envelopeId}`}
            className="no-underline transition-colors hover:underline"
            style={{ color: "rgba(19,0,50,0.55)", fontSize: "13px" }}
          >
            Set Up Envelope
          </Link>
          <CaretRight size={12} weight="bold" style={{ color: "rgba(19,0,50,0.35)" }} />
          <span
            className="font-semibold"
            style={{ color: "rgba(19,0,50,0.9)", fontSize: "13px" }}
          >
            Add Fields
          </span>
        </nav>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Help */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-gray-100"
          style={{ color: "rgba(19,0,50,0.55)" }}
          title="Help"
        >
          <Question size={16} weight="bold" />
        </button>

        {/* Settings */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-gray-100"
          style={{ color: "rgba(19,0,50,0.55)" }}
          title="Settings"
        >
          <Gear size={16} weight="bold" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200" />

        {/* Preview button */}
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors hover:bg-gray-50"
          style={{
            border: "1px solid rgba(19,0,50,0.25)",
            color: "rgba(19,0,50,0.9)",
            fontSize: "13px",
            fontWeight: 500,
            borderRadius: "4px",
          }}
          title="Preview"
        >
          <Eye size={14} weight="bold" />
          Preview
        </button>

        {/* View Plans link */}
        <a
          href="#"
          className="no-underline hover:underline transition-colors"
          style={{ color: "#4C00FF", fontSize: "13px", fontWeight: 500 }}
        >
          View Plans
        </a>

        {/* Send button — always clickable; validation happens inside the handler */}
        <button
          onClick={onSend}
          disabled={isSending}
          className="flex items-center gap-1.5 px-4 py-1.5 text-white font-semibold transition-opacity disabled:opacity-60"
          style={{
            background: isSending ? "#3A00CC" : "#4C00FF",
            fontSize: "13px",
            borderRadius: "4px",
          }}
        >
          {isSending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <PaperPlaneTilt size={14} weight="bold" />
              Send
            </>
          )}
        </button>
      </div>
    </div>
  );
}
