"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, FolderOpen, History, MessageSquare, Eye, Pencil } from "lucide-react";
import { Avatar } from "@/components/icons";
import { MarkdownView } from "@/components/markdown-view";
import { DocumentComments } from "@/components/document-comments";
import { DocumentVersions } from "@/components/document-versions";
import { deleteDocument, patchDocument, type Document } from "@/lib/api";

const ICON_CHOICES = ["📄", "📘", "🛠️", "🧪", "🔒", "💡", "📐", "📊", "🚀"];

export function DocumentEditor({
  workspaceSlug,
  doc,
}: {
  workspaceSlug: string;
  doc: Document;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [icon, setIcon] = useState(doc.icon);
  const [savingFlash, setSavingFlash] = useState<"idle" | "saving" | "saved">("idle");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [side, setSide] = useState<"history" | "comments" | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef({ title: doc.title, body: doc.body, icon: doc.icon });

  const queueSave = useCallback(
    (next: { title: string; body: string; icon: string }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const patch: Parameters<typeof patchDocument>[2] = {};
        if (next.title !== lastSent.current.title) patch.title = next.title;
        if (next.body !== lastSent.current.body) patch.body = next.body;
        if (next.icon !== lastSent.current.icon) patch.icon = next.icon;
        if (Object.keys(patch).length === 0) return;
        setSavingFlash("saving");
        try {
          await patchDocument(workspaceSlug, doc.slug_id, patch);
          lastSent.current = next;
          setSavingFlash("saved");
          setTimeout(() => setSavingFlash("idle"), 1200);
        } catch {
          setSavingFlash("idle");
        }
      }, 500);
    },
    [workspaceSlug, doc.slug_id]
  );

  useEffect(() => {
    queueSave({ title, body, icon });
  }, [title, body, icon, queueSave]);

  async function onDelete() {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    try {
      await deleteDocument(workspaceSlug, doc.slug_id);
      router.push(`/${workspaceSlug}/documents`);
    } catch (e) {
      console.error(e);
    }
  }

  function insertSlashItem(insert: string) {
    const ta = bodyRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    // Find the slash position (last "/" before cursor on this line).
    const before = body.slice(0, pos);
    const lineStart = before.lastIndexOf("\n") + 1;
    const linePrefix = before.slice(lineStart, pos);
    const slashIdx = linePrefix.lastIndexOf("/");
    const start = lineStart + (slashIdx >= 0 ? slashIdx : 0);
    const next = body.slice(0, start) + insert + body.slice(pos);
    setBody(next);
    setSlashOpen(false);
    setSlashFilter("");
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + insert.length;
      ta.setSelectionRange(cursor, cursor);
    });
  }

  function onBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "/" && !slashOpen) {
      const ta = e.currentTarget;
      const pos = ta.selectionStart;
      const before = body.slice(0, pos);
      const lineStart = before.lastIndexOf("\n") + 1;
      const linePrefix = before.slice(lineStart, pos);
      if (linePrefix.trim() === "") {
        setSlashOpen(true);
        setSlashFilter("");
      }
    } else if (e.key === "Escape" && slashOpen) {
      e.preventDefault();
      setSlashOpen(false);
    }
  }

  function onBodyChange(value: string) {
    setBody(value);
    if (slashOpen) {
      const ta = bodyRef.current;
      if (!ta) return;
      const pos = ta.selectionStart;
      const before = value.slice(0, pos);
      const lineStart = before.lastIndexOf("\n") + 1;
      const linePrefix = before.slice(lineStart, pos);
      const m = linePrefix.match(/\/([^\s]*)$/);
      if (!m) setSlashOpen(false);
      else setSlashFilter(m[1].toLowerCase());
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-10 py-10">
        <div className="mx-auto max-w-[760px]">
          {/* Header row */}
          <div className="mb-6 flex items-start gap-3">
            <div className="relative">
              <button
                onClick={() => setIconPickerOpen((o) => !o)}
                aria-label="Change icon"
                className="text-display leading-none hover:opacity-70"
              >
                {icon}
              </button>
              {iconPickerOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 grid grid-cols-5 gap-1 rounded-md bg-elevated p-1.5 shadow-popover">
                  {ICON_CHOICES.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setIcon(c);
                        setIconPickerOpen(false);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-sm text-default hover:bg-row-hover"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="flex-1 bg-transparent text-title2 font-semibold text-text-primary outline-none placeholder:text-text-quaternary"
            />
          </div>

          {/* Meta row */}
          <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-mini text-text-tertiary">
            {doc.project_id && doc.project_slug_id && (
              <Link
                href={`/${workspaceSlug}/project/${doc.project_slug_id}`}
                className="flex items-center gap-1.5 hover:text-text-secondary"
              >
                <FolderOpen size={11} />
                {doc.project_name}
              </Link>
            )}
            {doc.creator && (
              <span className="flex items-center gap-1.5">
                <Avatar initials={doc.creator.initials} color={doc.creator.color} size={14} />
                <span>{doc.creator.name}</span>
              </span>
            )}
            <span>Updated {new Date(doc.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
            <span className="ml-auto flex items-center gap-3">
              <span aria-live="polite" className="text-text-quaternary">
                {savingFlash === "saving" ? "Saving…" : savingFlash === "saved" ? "Saved" : ""}
              </span>
              <button
                onClick={() => setMode((m) => (m === "write" ? "preview" : "write"))}
                className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 hover:bg-row-hover hover:text-text-secondary"
                title={mode === "write" ? "Preview" : "Write"}
              >
                {mode === "write" ? <Eye size={11} /> : <Pencil size={11} />}
                {mode === "write" ? "Preview" : "Write"}
              </button>
              <button
                onClick={() => setSide((s) => (s === "history" ? null : "history"))}
                className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 hover:bg-row-hover hover:text-text-secondary"
              >
                <History size={11} /> History
              </button>
              <button
                onClick={() => setSide((s) => (s === "comments" ? null : "comments"))}
                className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 hover:bg-row-hover hover:text-text-secondary"
              >
                <MessageSquare size={11} /> Comments
              </button>
              <button onClick={onDelete} className="flex items-center gap-1 text-text-tertiary hover:text-priority-urgent" aria-label="Delete document">
                <Trash2 size={11} />
                Delete
              </button>
            </span>
          </div>

          {/* Body */}
          {mode === "write" ? (
            <div className="relative">
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                onKeyDown={onBodyKeyDown}
                placeholder="Start writing… (press / for menu)"
                className="block w-full resize-none bg-transparent font-mono text-small leading-relaxed text-text-primary outline-none placeholder:text-text-quaternary"
                rows={Math.max(20, body.split("\n").length + 2)}
              />
              {slashOpen && <SlashMenu filter={slashFilter} onPick={insertSlashItem} onClose={() => setSlashOpen(false)} />}
            </div>
          ) : (
            <div className="text-default leading-relaxed">
              <MarkdownView source={body} workspaceSlug={workspaceSlug} />
            </div>
          )}
        </div>
      </div>
      {side === "history" && (
        <DocumentVersions workspaceSlug={workspaceSlug} docSlug={doc.slug_id} onRestored={() => router.refresh()} onClose={() => setSide(null)} />
      )}
      {side === "comments" && (
        <DocumentComments workspaceSlug={workspaceSlug} docSlug={doc.slug_id} onClose={() => setSide(null)} />
      )}
    </div>
  );
}

const SLASH_ITEMS = [
  { key: "h1", label: "Heading 1", hint: "Large section title", insert: "# " },
  { key: "h2", label: "Heading 2", hint: "Subsection", insert: "## " },
  { key: "h3", label: "Heading 3", hint: "Smaller heading", insert: "### " },
  { key: "ul", label: "Bulleted list", hint: "Unordered list", insert: "- " },
  { key: "ol", label: "Numbered list", hint: "Ordered list", insert: "1. " },
  { key: "task", label: "Task list", hint: "Checkboxes", insert: "- [ ] " },
  { key: "quote", label: "Quote", hint: "Highlighted callout", insert: "> " },
  { key: "code", label: "Code block", hint: "Fenced code", insert: "```\n\n```\n" },
  { key: "hr", label: "Divider", hint: "Horizontal rule", insert: "---\n" },
  { key: "issue", label: "Issue reference", hint: "Insert [TEAM-#]", insert: "[]" },
];

function SlashMenu({ filter, onPick, onClose }: { filter: string; onPick: (insert: string) => void; onClose: () => void }) {
  const matches = SLASH_ITEMS.filter((it) => !filter || it.label.toLowerCase().includes(filter) || it.key.includes(filter));
  if (matches.length === 0) return null;
  return (
    <div className="absolute left-0 top-6 z-30 w-[260px] rounded-md bg-elevated p-1 shadow-popover">
      <ul>
        {matches.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              onClick={() => onPick(it.insert)}
              className="flex w-full flex-col rounded-sm px-2 py-1.5 text-left text-mini hover:bg-row-hover"
            >
              <span className="text-text-primary">{it.label}</span>
              <span className="text-text-tertiary">{it.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="px-2 pb-1 pt-0.5 text-micro text-text-quaternary">Esc to close</div>
    </div>
  );
}
