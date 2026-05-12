"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Plus } from "lucide-react";
import { fetchJsonForClient, type ProjectMilestone } from "@/lib/api";

export function MilestonesPanel({
  workspaceSlug,
  projectSlug,
  initial,
}: {
  workspaceSlug: string;
  projectSlug: string;
  initial: ProjectMilestone[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ProjectMilestone[]>(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  async function submit() {
    if (!name.trim()) return;
    const created = await fetchJsonForClient<ProjectMilestone>(
      `/api/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectSlug)}/milestones`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), target_date: date || undefined }),
      }
    );
    setItems([...items, created]);
    setName("");
    setDate("");
    setAdding(false);
    router.refresh();
  }

  if (items.length === 0 && !adding) {
    return (
      <section className="mb-8">
        <header className="mb-2 flex items-center gap-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
          <Target size={12} />
          <span>Milestones</span>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="ml-auto flex items-center gap-1 rounded-md px-1 py-0.5 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <Plus size={11} /> Add milestone
          </button>
        </header>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <header className="mb-2 flex items-center gap-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">
        <Target size={12} />
        <span>Milestones</span>
        <span className="text-text-quaternary">{items.length}</span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="ml-auto flex items-center gap-1 rounded-md px-1 py-0.5 text-mini hover:bg-row-hover hover:text-text-secondary"
        >
          <Plus size={11} /> Add
        </button>
      </header>
      <ul className="space-y-1.5">
        {items.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-small"
          >
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-pill border border-border-strong" />
            <span className="flex-1 text-text-primary">{m.name}</span>
            {m.target_date && (
              <span className="text-mini text-text-tertiary">
                {new Date(m.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </li>
        ))}
        {adding && (
          <li className="flex items-center gap-2 rounded-md border border-border-subtle bg-elevated px-3 py-2 text-small">
            <Plus size={12} className="text-text-tertiary" />
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setAdding(false); setName(""); setDate(""); } }}
              placeholder="Milestone name"
              className="flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-border-subtle bg-app px-1.5 py-0.5 text-mini text-text-secondary outline-none"
            />
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="rounded-md bg-accent px-2 py-0.5 text-mini text-white disabled:opacity-50"
            >
              Add
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
