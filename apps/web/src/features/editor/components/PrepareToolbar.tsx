"use client";

import { useState, useRef, useEffect } from "react";
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
import { postComment } from "@/features/envelopes/api";

interface PrepareToolbarProps {
  envelopeId: string;
  onSend: () => void;
  isSending: boolean;
  onPreview?: () => void;
  onOpenSettings?: () => void;
  isTemplateMode?: boolean;
  onSaveAsTemplate?: () => void;
  isSavingTemplate?: boolean;
}

// ── Comment Popover ───────────────────────────────────────────────────────────

export function CommentPopover({
  envelopeId,
  position,
  onClose,
  onPosted,
  recipients = [],
}: {
  envelopeId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onPosted?: (text: string) => void;
  recipients?: Array<{ id: string; name: string; email: string }>;
}) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const atMatch = before.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1].toLowerCase());
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  const insertMention = (name: string) => {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const atIdx = before.lastIndexOf("@");
    const newText = before.slice(0, atIdx) + `@${name} ` + after;
    setText(newText);
    setShowMentions(false);
    setMentionQuery("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const filteredRecipients = recipients.filter(
    (r) => r.name.toLowerCase().includes(mentionQuery) || r.email.toLowerCase().includes(mentionQuery)
  );

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      await postComment(envelopeId, trimmed);
      onPosted?.(trimmed);
    } catch {
      // silently ignore
    } finally {
      setPosting(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="bg-white rounded-lg"
        style={{
          width: "300px",
          border: "1px solid rgba(19,0,50,0.15)",
          boxShadow: "0 8px 24px rgba(19,0,50,0.14)",
          overflow: "visible",
        }}
      >
        {/* Triangle pointer */}
        <div
          className="absolute -top-2 left-4"
          style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "8px solid rgba(19,0,50,0.15)" }}
        />
        <div
          className="absolute"
          style={{ top: "-6px", left: "17px", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderBottom: "7px solid white" }}
        />

        <div className="p-3 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Comment or type @ to mention someone..."
            rows={3}
            className="w-full resize-none focus:outline-none"
            style={{
              fontSize: "13px",
              color: "rgba(19,0,50,0.9)",
              border: "2px solid #4C00FF",
              borderRadius: "6px",
              padding: "10px",
              fontFamily: "inherit",
              lineHeight: "1.5",
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setShowMentions(false); onClose(); }
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handlePost();
            }}
          />

          {/* @ mention dropdown */}
          {showMentions && filteredRecipients.length > 0 && (
            <div
              className="absolute left-3 right-3 bg-white z-50 overflow-hidden"
              style={{
                bottom: "calc(100% - 8px)",
                border: "1px solid rgba(19,0,50,0.15)",
                borderRadius: "6px",
                boxShadow: "0 4px 16px rgba(19,0,50,0.12)",
                maxHeight: "150px",
                overflowY: "auto",
              }}
            >
              {filteredRecipients.map((r) => (
                <button
                  key={r.id}
                  onClick={() => insertMention(r.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                  style={{ border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <div
                    style={{
                      width: "24px", height: "24px", borderRadius: "50%",
                      background: "#E8E0FF", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "10px", fontWeight: 600, color: "#4C00FF", flexShrink: 0,
                    }}
                  >
                    {r.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "rgba(19,0,50,0.9)", margin: 0 }}>{r.name}</p>
                    <p style={{ fontSize: "11px", color: "rgba(19,0,50,0.45)", margin: 0 }}>{r.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Bottom row: @ icon + people icon + Cancel + Post */}
          <div className="flex items-center mt-2">
            <button
              onClick={() => { setText((t) => t + "@"); setShowMentions(true); setMentionQuery(""); setTimeout(() => textareaRef.current?.focus(), 0); }}
              style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "rgba(19,0,50,0.06)", cursor: "pointer", color: "rgba(19,0,50,0.6)", marginRight: "4px" }}
              title="Mention someone"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0V12a10 10 0 1 0-3.92 7.94"/></svg>
            </button>
            <button
              style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", border: "none", background: "rgba(19,0,50,0.06)", cursor: "pointer", color: "rgba(19,0,50,0.6)" }}
              title="Add people"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </button>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-colors hover:bg-gray-50"
              style={{ border: "1px solid rgba(19,0,50,0.2)", color: "rgba(19,0,50,0.75)", borderRadius: "4px", marginRight: "6px" }}
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={posting || !text.trim()}
              className="px-4 py-1.5 rounded text-xs font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "#4C00FF", borderRadius: "4px" }}
            >
              {posting ? "..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PrepareToolbar ────────────────────────────────────────────────────────────

export function PrepareToolbar({
  envelopeId,
  onSend,
  isSending,
  onPreview,
  onOpenSettings,
  isTemplateMode = false,
  onSaveAsTemplate,
  isSavingTemplate = false,
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
          href={isTemplateMode ? "/templates" : "/agreements"}
          className="flex items-center justify-center w-9 h-9 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800 no-underline"
          title="Close editor"
        >
          <X size={16} weight="bold" />
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Back to prepare */}
        <Link
          href={`/envelope/${envelopeId}/prepare${isTemplateMode ? "?mode=template" : ""}`}
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
            href={`/envelope/${envelopeId}/prepare${isTemplateMode ? "?mode=template" : ""}`}
            className="no-underline transition-colors hover:underline"
            style={{ color: "rgba(19,0,50,0.55)", fontSize: "13px" }}
          >
            {isTemplateMode ? "Create a Template" : "Set Up Envelope"}
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Help, Settings, Preview, Send */}
      <div className="flex items-center gap-2">
        <div className="w-px h-5 bg-gray-200" />

        {/* Help */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-gray-100"
          style={{ color: "rgba(19,0,50,0.55)" }}
          title="Help"
        >
          <Question size={16} weight="bold" />
        </button>

        {/* Settings — opens Advanced Options slide-out panel */}
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-gray-100"
          style={{ color: "rgba(19,0,50,0.55)" }}
          title="Envelope settings"
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

        {/* Send / Save and Close button */}
        {isTemplateMode ? (
          <button
            onClick={onSaveAsTemplate}
            disabled={isSavingTemplate}
            className="flex items-center gap-1.5 px-4 py-1.5 text-white font-semibold transition-opacity disabled:opacity-60"
            style={{
              background: isSavingTemplate ? "#3A00CC" : "#4C00FF",
              fontSize: "13px",
              borderRadius: "4px",
            }}
          >
            {isSavingTemplate ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Save and Close"
            )}
          </button>
        ) : (
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
        )}
      </div>
    </div>
  );
}
