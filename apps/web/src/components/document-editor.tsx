"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, FolderOpen } from "lucide-react";
import { Avatar } from "@/components/icons";
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
                <div className="absolute left-0 top-full z-30 mt-1 grid grid-cols-5 gap-1 rounded-md border border-border-default bg-elevated p-1.5 shadow-popover">
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
              <button onClick={onDelete} className="flex items-center gap-1 text-text-tertiary hover:text-priority-urgent" aria-label="Delete document">
                <Trash2 size={11} />
                Delete
              </button>
            </span>
          </div>

          {/* Body (markdown source — rendered as plain prose) */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Start writing…"
            className="block w-full resize-none bg-transparent font-mono text-small leading-relaxed text-text-primary outline-none placeholder:text-text-quaternary"
            rows={Math.max(20, body.split("\n").length + 2)}
          />
        </div>
      </div>
    </div>
  );
}
