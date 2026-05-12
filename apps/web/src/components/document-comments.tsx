"use client";

import { useEffect, useState } from "react";
import { X, Send, Trash2 } from "lucide-react";
import {
  createDocComment,
  deleteDocComment,
  listDocComments,
  type DocumentComment,
} from "@/lib/api";
import { Avatar } from "@/components/icons";
import { relTime } from "@/lib/time";

export function DocumentComments({
  workspaceSlug,
  docSlug,
  onClose,
}: {
  workspaceSlug: string;
  docSlug: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<DocumentComment[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listDocComments(workspaceSlug, docSlug).then(setItems);
  }, [workspaceSlug, docSlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const created = await createDocComment(workspaceSlug, docSlug, { body });
      setItems((prev) => [...prev, created]);
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: DocumentComment) {
    if (!confirm("Delete comment?")) return;
    await deleteDocComment(workspaceSlug, docSlug, c.id);
    setItems((prev) => prev.filter((x) => x.id !== c.id));
  }

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-border-subtle bg-elevated/40">
      <header className="flex h-[44px] items-center gap-2 border-b border-border-subtle px-3 text-mini text-text-tertiary">
        <span className="font-medium text-text-secondary">Comments</span>
        <span>{items.length}</span>
        <button onClick={onClose} className="ml-auto rounded-sm p-1 hover:bg-row-hover hover:text-text-secondary">
          <X size={12} />
        </button>
      </header>
      <ul className="flex-1 space-y-3 overflow-y-auto p-3">
        {items.length === 0 ? (
          <li className="text-mini text-text-tertiary">No comments yet. Start a thread below.</li>
        ) : (
          items.map((c) => (
            <li key={c.id} className="group rounded-md border border-border-subtle bg-elevated p-2">
              <header className="flex items-center gap-2 text-mini">
                {c.author && <Avatar initials={c.author.initials} color={c.author.color} size={16} />}
                <span className="text-text-primary">{c.author?.name ?? "Unknown"}</span>
                <span className="ml-auto text-text-tertiary">{relTime(c.created_at)}</span>
                <button
                  onClick={() => remove(c)}
                  className="hidden rounded-sm p-0.5 text-text-tertiary hover:bg-row-hover hover:text-priority-urgent group-hover:inline-flex"
                  title="Delete"
                >
                  <Trash2 size={11} />
                </button>
              </header>
              <p className="mt-1 whitespace-pre-wrap text-mini text-text-secondary">{c.body}</p>
            </li>
          ))
        )}
      </ul>
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-border-subtle p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Add a comment…"
          className="flex-1 resize-none rounded-md bg-app px-2 py-1.5 text-mini text-text-primary outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          className="rounded-md bg-accent p-2 text-white shadow-button hover:opacity-90 disabled:opacity-50"
          title="Post"
        >
          <Send size={12} />
        </button>
      </form>
    </aside>
  );
}
