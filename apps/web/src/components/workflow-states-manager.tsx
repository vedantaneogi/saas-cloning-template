"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Check } from "lucide-react";
import { StatusIcon } from "@/components/icons";
import {
  createWorkflowState,
  deleteWorkflowState,
  patchWorkflowState,
  type WorkflowState,
} from "@/lib/api";

const GROUPS = [
  { key: "backlog", label: "Backlog" },
  { key: "unstarted", label: "Unstarted" },
  { key: "started", label: "Started" },
  { key: "completed", label: "Completed" },
  { key: "canceled", label: "Canceled" },
] as const;

const COLORS = ["#95a2b3", "#e2e2e2", "#f2c94c", "#5e6ad2", "#26b5ce", "#4cb782", "#eb5757", "#bb87fc"];

export function WorkflowStatesManager({
  workspaceSlug,
  teamKey,
  initial,
}: {
  workspaceSlug: string;
  teamKey: string;
  initial: WorkflowState[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<WorkflowState[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; group: string; color: string }>({ name: "", group: "unstarted", color: "#5e6ad2" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit(s: WorkflowState) {
    setEditingId(s.id);
    setDraft({ name: s.name, group: s.group, color: s.color });
    setError(null);
  }

  function startCreate() {
    setEditingId("_new");
    setDraft({ name: "", group: "unstarted", color: "#5e6ad2" });
    setError(null);
  }

  function cancel() {
    setEditingId(null);
    setError(null);
  }

  function save() {
    const name = draft.name.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      try {
        if (editingId === "_new") {
          const position = items.length === 0 ? 0 : Math.max(...items.map((x) => x.position)) + 1;
          const created = await createWorkflowState(workspaceSlug, teamKey, { name, group: draft.group, color: draft.color, position });
          setItems((prev) => [...prev, created].sort((a, b) => a.position - b.position));
        } else if (editingId) {
          const updated = await patchWorkflowState(workspaceSlug, teamKey, editingId, { name, group: draft.group, color: draft.color });
          setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        }
        setEditingId(null);
        router.refresh();
      } catch (e) {
        setError((e as Error).message || "Save failed");
      }
    });
  }

  function remove(s: WorkflowState) {
    if (!confirm(`Delete state "${s.name}"? It will fail if any issues are still in it.`)) return;
    startTransition(async () => {
      try {
        await deleteWorkflowState(workspaceSlug, teamKey, s.id);
        setItems((prev) => prev.filter((x) => x.id !== s.id));
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border-subtle">
      <ul>
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 border-b border-border-subtle px-4 py-2.5 last:border-b-0">
            {editingId === s.id ? (
              <EditRow draft={draft} onDraft={setDraft} onSave={save} onCancel={cancel} disabled={pending} />
            ) : (
              <>
                <StatusIcon group={s.group} />
                <span className="text-small text-text-primary">{s.name}</span>
                <span className="rounded-sm bg-pill px-1.5 py-0.5 text-micro text-text-tertiary">{s.group}</span>
                <span className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => startEdit(s)}
                    className="rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-priority-urgent"
                    aria-label="Delete state"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
        {editingId === "_new" && (
          <li className="border-b border-border-subtle px-4 py-2.5">
            <EditRow draft={draft} onDraft={setDraft} onSave={save} onCancel={cancel} disabled={pending} />
          </li>
        )}
      </ul>
      {error && <div className="border-t border-border-subtle px-4 py-2 text-mini text-priority-urgent">{error}</div>}
      <div className="border-t border-border-subtle bg-elevated/30 px-4 py-2">
        <button
          onClick={startCreate}
          disabled={editingId !== null}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-mini text-text-secondary hover:bg-row-hover disabled:opacity-50"
        >
          <Plus size={11} />
          New state
        </button>
      </div>
    </div>
  );
}

function EditRow({
  draft,
  onDraft,
  onSave,
  onCancel,
  disabled,
}: {
  draft: { name: string; group: string; color: string };
  onDraft: (d: { name: string; group: string; color: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <input
        autoFocus
        value={draft.name}
        onChange={(e) => onDraft({ ...draft, name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="State name"
        className="rounded-md border border-border-default bg-app px-2 py-1 text-small text-text-primary outline-none focus:border-border-strong"
      />
      <select
        value={draft.group}
        onChange={(e) => onDraft({ ...draft, group: e.target.value })}
        className="rounded-md border border-border-default bg-app px-2 py-1 text-small text-text-primary outline-none"
      >
        {GROUPS.map((g) => (
          <option key={g.key} value={g.key}>
            {g.label}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onDraft({ ...draft, color: c })}
            aria-label={`Color ${c}`}
            className="flex h-5 w-5 items-center justify-center rounded-pill"
            style={{ background: c, outline: draft.color === c ? "2px solid var(--text-secondary)" : "none", outlineOffset: 1 }}
          >
            {draft.color === c && <Check size={9} className="text-white" />}
          </button>
        ))}
      </div>
      <span className="ml-auto flex items-center gap-1">
        <button onClick={onCancel} className="rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary">
          <X size={11} />
        </button>
        <button
          onClick={onSave}
          disabled={disabled || !draft.name.trim()}
          className="rounded-md bg-accent px-2 py-1 text-mini text-white hover:opacity-90 disabled:opacity-50"
        >
          Save
        </button>
      </span>
    </div>
  );
}
