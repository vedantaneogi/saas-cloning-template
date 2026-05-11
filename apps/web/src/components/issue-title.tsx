"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { patchIssue } from "@/lib/api";

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
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  async function save() {
    const trimmed = value.trim();
    if (trimmed === (initial ?? "").trim()) {
      setEditing(false);
      return;
    }
    await patchIssue(workspaceSlug, identifier, { description: trimmed });
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    if (!initial) {
      return (
        <button
          onClick={() => setEditing(true)}
          className="mt-4 block text-small text-text-tertiary hover:text-text-secondary"
        >
          Add description…
        </button>
      );
    }
    return (
      <div
        onClick={() => setEditing(true)}
        className="mt-5 cursor-text space-y-3 rounded-md text-default text-text-secondary hover:bg-row-hover/40"
      >
        {initial.split("\n").map((line, i) => (
          <Paragraph key={i} line={line} />
        ))}
      </div>
    );
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          save();
        }
        if (e.key === "Escape") {
          setValue(initial ?? "");
          setEditing(false);
        }
      }}
      rows={Math.max(4, value.split("\n").length + 1)}
      className="mt-5 w-full resize-none rounded-md border border-border-subtle bg-input p-3 text-default text-text-secondary outline-none focus:border-border-strong"
    />
  );
}

function Paragraph({ line }: { line: string }) {
  if (!line.trim()) return <div className="h-2" />;
  if (line.startsWith("**") && line.endsWith("**")) {
    return <p className="font-semibold text-text-primary">{line.replace(/\*\*/g, "")}</p>;
  }
  if (line.startsWith("- [ ]") || line.startsWith("- [x]")) {
    const done = line.startsWith("- [x]");
    return (
      <label className="flex items-center gap-2 text-text-secondary">
        <input
          type="checkbox"
          defaultChecked={done}
          className="h-3.5 w-3.5 rounded-sm border-border-strong bg-input"
          readOnly
        />
        <span>{line.slice(5).trim()}</span>
      </label>
    );
  }
  return <p>{line}</p>;
}
