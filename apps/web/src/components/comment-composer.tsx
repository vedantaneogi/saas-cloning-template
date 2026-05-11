"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postComment } from "@/lib/api";

export function CommentComposer({ workspaceSlug, identifier }: { workspaceSlug: string; identifier: string }) {
  const [body, setBody] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function submit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await postComment(workspaceSlug, identifier, body.trim());
      setBody("");
      setFocused(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mt-4 rounded-md border border-border-subtle bg-elevated p-3 text-small text-text-secondary"
      onClick={() => setFocused(true)}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        onFocus={() => setFocused(true)}
        placeholder="Leave a reply..."
        rows={focused ? 3 : 1}
        className="w-full resize-none bg-transparent outline-none placeholder:text-text-tertiary"
      />
      {focused && (
        <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2 text-mini text-text-tertiary">
          <span>⌘⏎ to submit</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBody("");
                setFocused(false);
              }}
              className="rounded-md px-2 py-1 hover:bg-row-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!body.trim() || submitting}
              className="rounded-md bg-accent px-3 py-1 text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Posting…" : "Comment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
