"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { patchIssue } from "@/lib/api";
import { MarkdownEditor } from "@/components/markdown-editor";

export function IssueTitle({
  workspaceSlug,
  identifier,
  initial,
}: {
  workspaceSlug: string;
  identifier: string;
  initial: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      // Move caret to end
      const len = ref.current?.value.length ?? 0;
      ref.current?.setSelectionRange(len, len);
    }
  }, [editing]);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initial) {
      setValue(initial);
      setEditing(false);
      return;
    }
    await patchIssue(workspaceSlug, identifier, { title: trimmed });
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <h1
        onClick={() => setEditing(true)}
        className="cursor-text rounded-md text-title2 font-semibold leading-tight text-text-primary hover:bg-row-hover"
      >
        {initial}
      </h1>
    );
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          save();
        }
        if (e.key === "Escape") {
          setValue(initial);
          setEditing(false);
        }
      }}
      rows={1}
      className="w-full resize-none bg-transparent text-title2 font-semibold leading-tight text-text-primary outline-none"
    />
  );
}

export function IssueDescription({
  workspaceSlug,
  identifier,
  initial,
}: {
  workspaceSlug: string;
  identifier: string;
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const router = useRouter();
  const last = useRef(initial ?? "");

  async function save() {
    const trimmed = value.trim();
    if (trimmed === last.current.trim()) return;
    await patchIssue(workspaceSlug, identifier, { description: trimmed });
    last.current = trimmed;
    router.refresh();
  }

  return (
    <div
      className="mt-5"
      onBlur={(e) => {
        // Only save when focus leaves the whole editor, not on internal moves.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) save();
      }}
    >
      <MarkdownEditor
        value={value}
        onChange={setValue}
        placeholder="Add description…"
        minHeight={120}
      />
    </div>
  );
}

