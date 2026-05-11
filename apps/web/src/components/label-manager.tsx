"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, X } from "lucide-react";
import clsx from "clsx";
import {
  createTeamLabel,
  createWorkspaceLabel,
  deleteLabel,
  patchLabel,
  type Label,
} from "@/lib/api";

const COLOR_CHOICES = [
  "#5e6ad2",
  "#26b5ce",
  "#4cb782",
  "#f2c94c",
  "#eb5757",
  "#bb87fc",
  "#bc7cf0",
  "#f2994a",
  "#95a2b3",
];

export function LabelManager({
  workspaceSlug,
  teamKey,
  initial,
  scope,
}: {
  workspaceSlug: string;
  teamKey?: string;
  initial: Label[];
  scope: "workspace" | "team";
}) {
  const router = useRouter();
  const [items, setItems] = useState<Label[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(COLOR_CHOICES[0]);
  const [pending, startTransition] = useTransition();

  function startEdit(l: Label) {
    setEditingId(l.id);
    setDraftName(l.name);
    setDraftColor(l.color);
  }

  function startCreate() {
    setEditingId("_new");
    setDraftName("");
    setDraftColor(COLOR_CHOICES[Math.floor(Math.random() * COLOR_CHOICES.length)]);
  }

  function cancel() {
    setEditingId(null);
    setDraftName("");
  }

  function save() {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        if (editingId === "_new") {
          const created =
            scope === "workspace"
              ? await createWorkspaceLabel(workspaceSlug, { name: trimmed, color: draftColor })
              : await createTeamLabel(workspaceSlug, teamKey!, { name: trimmed, color: draftColor });
          setItems((prev) => [...prev, created]);
        } else if (editingId) {
          const updated = await patchLabel(workspaceSlug, editingId, { name: trimmed, color: draftColor });
          setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        }
        setEditingId(null);
        router.refresh();
      } catch (e) {
        alert((e as Error).message || "Could not save label");
      }
    });
  }

  function remove(l: Label) {
    if (!confirm(`Delete label "${l.name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteLabel(workspaceSlug, l.id);
        setItems((prev) => prev.filter((x) => x.id !== l.id));
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <div className="mt-6 overflow-hidden rounded-md border border-border-subtle">
      <ul>
        {items.map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-3 border-b border-border-subtle px-4 py-2.5 last:border-b-0"
          >
            {editingId === l.id ? (
              <EditRow
                name={draftName}
                color={draftColor}
                onName={setDraftName}
                onColor={setDraftColor}
                onSave={save}
                onCancel={cancel}
                disabled={pending}
              />
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-tag px-2 py-0.5 text-mini text-text-secondary">
                  <span className="h-2 w-2 rounded-pill" style={{ background: l.color }} />
                  {l.name}
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => startEdit(l)}
                    className="rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(l)}
                    className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-priority-urgent"
                    aria-label="Delete label"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && editingId !== "_new" && (
          <li className="px-4 py-6 text-center text-mini text-text-tertiary">No labels yet.</li>
        )}
        {editingId === "_new" && (
          <li className="border-b border-border-subtle px-4 py-2.5">
            <EditRow
              name={draftName}
              color={draftColor}
              onName={setDraftName}
              onColor={setDraftColor}
              onSave={save}
              onCancel={cancel}
              disabled={pending}
            />
          </li>
        )}
      </ul>
      <div className="border-t border-border-subtle bg-elevated/30 px-4 py-2">
        <button
          onClick={startCreate}
          disabled={editingId !== null}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-mini text-text-secondary hover:bg-row-hover disabled:opacity-50"
        >
          <Plus size={11} />
          New label
        </button>
      </div>
    </div>
  );
}

function EditRow({
  name,
  color,
  onName,
  onColor,
  onSave,
  onCancel,
  disabled,
}: {
  name: string;
  color: string;
  onName: (v: string) => void;
  onColor: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => onName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Label name"
        className="rounded-md border border-border-default bg-app px-2 py-1 text-small text-text-primary outline-none focus:border-border-strong"
      />
      <div className="flex items-center gap-1">
        {COLOR_CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColor(c)}
            aria-label={`Color ${c}`}
            className={clsx(
              "flex h-5 w-5 items-center justify-center rounded-pill",
              color === c && "ring-1 ring-text-secondary ring-offset-1 ring-offset-elevated"
            )}
            style={{ background: c }}
          >
            {color === c && <Check size={9} className="text-white" />}
          </button>
        ))}
      </div>
      <span className="ml-auto flex items-center gap-1">
        <button
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <X size={11} />
        </button>
        <button
          onClick={onSave}
          disabled={disabled || !name.trim()}
          className="rounded-md bg-accent px-2 py-1 text-mini text-white hover:opacity-90 disabled:opacity-50"
        >
          Save
        </button>
      </span>
    </div>
  );
}
