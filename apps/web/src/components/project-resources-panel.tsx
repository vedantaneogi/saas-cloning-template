"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link as LinkIconLucide, Plus, X } from "lucide-react";
import { createProjectResource, deleteProjectResource, type ProjectResource } from "@/lib/api";

export function ProjectResourcesPanel({
  workspaceSlug,
  projectSlug,
  initial,
}: {
  workspaceSlug: string;
  projectSlug: string;
  initial: ProjectResource[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ProjectResource[]>(initial);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  async function submit() {
    if (!url.trim()) return;
    const created = await createProjectResource(workspaceSlug, projectSlug, {
      url: url.trim(),
      title: title.trim() || undefined,
    });
    setItems([...items, created]);
    setUrl("");
    setTitle("");
    setAdding(false);
    router.refresh();
  }

  async function remove(id: string) {
    await deleteProjectResource(workspaceSlug, projectSlug, id);
    setItems(items.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <section className="mb-8">
      <header className="mb-2 flex items-center gap-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
        <LinkIconLucide size={12} />
        <span>Resources</span>
        {items.length > 0 && <span className="text-text-quaternary">{items.length}</span>}
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="ml-auto flex items-center gap-1 rounded-md px-1 py-0.5 text-mini hover:bg-row-hover hover:text-text-secondary"
        >
          <Plus size={11} /> {adding ? "Cancel" : "Add"}
        </button>
      </header>
      {adding && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-border-subtle bg-elevated px-3 py-2 text-small">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="https://…"
            className="flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-40 bg-transparent text-text-secondary outline-none placeholder:text-text-tertiary"
          />
          <button
            onClick={submit}
            disabled={!url.trim()}
            className="rounded-md bg-accent px-2 py-0.5 text-mini text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
      <ul className="space-y-1.5">
        {items.map((r) => (
          <li key={r.id} className="group flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-small">
            <span className="text-default">{r.icon || "🔗"}</span>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-text-primary hover:underline">
              {r.title || r.url}
            </a>
            <button onClick={() => remove(r.id)} className="opacity-0 transition group-hover:opacity-100 text-text-tertiary hover:text-text-primary" title="Remove">
              <X size={12} />
            </button>
          </li>
        ))}
        {items.length === 0 && !adding && (
          <li className="rounded-md border border-dashed border-border-subtle px-3 py-3 text-center text-mini text-text-tertiary">
            No resources yet — add docs, dashboards, or external links.
          </li>
        )}
      </ul>
    </section>
  );
}
