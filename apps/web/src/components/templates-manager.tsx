"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, FileText, Folders, Compass } from "lucide-react";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
  type Team,
  type Template,
  type TemplateKind,
} from "@/lib/api";

const KINDS: { value: TemplateKind; label: string; icon: typeof FileText }[] = [
  { value: "issue", label: "Issues", icon: FileText },
  { value: "project", label: "Projects", icon: Folders },
  { value: "document", label: "Documents", icon: Compass },
];

const PRESETS: Record<TemplateKind, { name: string; body: Record<string, unknown> }[]> = {
  issue: [
    { name: "Bug report", body: { title: "[BUG] ", description: "**Steps to reproduce:**\n1. \n\n**Expected:**\n\n**Actual:**\n", priority: 2 } },
    { name: "Feature request", body: { title: "[FEAT] ", description: "**Problem:**\n\n**Proposed solution:**\n\n**Alternatives considered:**\n", priority: 3 } },
  ],
  project: [
    {
      name: "Launch",
      body: {
        name: "Untitled launch",
        description: "End-to-end launch project — spec, build, ship, retro.",
        icon_color: "#5e6ad2",
        milestones: [
          { name: "Spec finalized", target_date_offset_days: 7 },
          { name: "Beta ready", target_date_offset_days: 30 },
          { name: "GA", target_date_offset_days: 60 },
          { name: "Retro", target_date_offset_days: 75 },
        ],
      },
    },
  ],
  document: [
    { name: "PRD", body: { title: "PRD: ", body: "# Problem\n\n# Goals\n\n# Non-goals\n\n# Proposal\n\n# Open questions\n", icon: "📋" } },
    { name: "RFC", body: { title: "RFC: ", body: "# Context\n\n# Decision\n\n# Consequences\n\n# Alternatives\n", icon: "📝" } },
    { name: "Retro", body: { title: "Retro – ", body: "# What went well\n\n# What didn't\n\n# Action items\n", icon: "🔁" } },
    { name: "Postmortem", body: { title: "Postmortem: ", body: "# Summary\n\n# Impact\n\n# Timeline\n\n# Root cause\n\n# Resolution\n\n# Action items\n", icon: "🛠️" } },
  ],
};

export function TemplatesManager({
  workspaceSlug,
  initial,
  teams,
}: {
  workspaceSlug: string;
  initial: Template[];
  teams: Team[];
}) {
  const [kind, setKind] = useState<TemplateKind>("issue");
  const [items, setItems] = useState<Template[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial.find((t) => t.kind === "issue")?.id ?? null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => items.filter((t) => t.kind === kind), [items, kind]);
  const selected = items.find((t) => t.id === selectedId) ?? null;

  async function addPreset(preset: { name: string; body: Record<string, unknown> }) {
    setBusy(true);
    try {
      const created = await createTemplate(workspaceSlug, { kind, name: preset.name, body: preset.body });
      setItems((prev) => [...prev, created]);
      setSelectedId(created.id);
    } finally {
      setBusy(false);
    }
  }

  async function addBlank() {
    setBusy(true);
    try {
      const created = await createTemplate(workspaceSlug, { kind, name: "Untitled template", body: {} });
      setItems((prev) => [...prev, created]);
      setSelectedId(created.id);
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, p: { name?: string; description?: string; body?: Record<string, unknown> }) {
    const updated = await updateTemplate(workspaceSlug, id, p);
    setItems((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function remove(id: string) {
    if (!confirm("Delete template?")) return;
    await deleteTemplate(workspaceSlug, id);
    setItems((prev) => prev.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2">
        {KINDS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setKind(value);
              setSelectedId(items.find((t) => t.kind === value)?.id ?? null);
            }}
            className={
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-small " +
              (kind === value ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover")
            }
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-mini text-text-secondary">
        <span className="text-text-tertiary">Start from:</span>
        {PRESETS[kind].map((p) => (
          <button
            key={p.name}
            type="button"
            disabled={busy}
            onClick={() => addPreset(p)}
            className="rounded-md border border-border-subtle px-2 py-0.5 hover:bg-elevated-hover disabled:opacity-50"
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={addBlank}
          className="flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-white shadow-button hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={11} /> Blank
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-md border border-border-subtle py-12 text-center text-small text-text-tertiary">
          No templates yet.
        </div>
      ) : (
        <div className="flex gap-4">
          <ul className="w-[260px] shrink-0 space-y-1">
            {visible.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-small " +
                    (selectedId === t.id ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover")
                  }
                >
                  <FileText size={12} className="text-text-tertiary" />
                  <span className="flex-1 truncate">{t.name}</span>
                  {t.team_key && <span className="text-mini text-text-tertiary">{t.team_key}</span>}
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <Editor key={selected.id} template={selected} teams={teams} onPatch={(p) => patch(selected.id, p)} onDelete={() => remove(selected.id)} />
          )}
        </div>
      )}
    </div>
  );
}

function Editor({
  template,
  teams,
  onPatch,
  onDelete,
}: {
  template: Template;
  teams: Team[];
  onPatch: (p: { name?: string; description?: string; body?: Record<string, unknown> }) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [bodyText, setBodyText] = useState(JSON.stringify(template.body, null, 2));
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setErr(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(bodyText);
    } catch (e) {
      setErr("Body is not valid JSON.");
      return;
    }
    await onPatch({ name, body: parsed });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex-1 rounded-md border border-border-subtle p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-transparent text-default font-semibold text-text-primary outline-none"
        />
        <button onClick={save} className="rounded-md bg-accent px-2 py-1 text-mini font-medium text-white shadow-button hover:opacity-90">
          {saved ? "Saved ✓" : "Save"}
        </button>
        <button onClick={onDelete} className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-priority-urgent" title="Delete">
          <Trash2 size={12} />
        </button>
      </div>
      <p className="mb-2 text-mini text-text-tertiary">
        Edit the JSON below. Fields used when applying: <code>title</code>, <code>description</code>, <code>priority</code>, <code>label_ids</code> for issues; <code>name</code>, <code>description</code>, <code>milestones</code> for projects; <code>title</code>, <code>body</code>, <code>icon</code> for documents.
      </p>
      <textarea
        value={bodyText}
        onChange={(e) => setBodyText(e.target.value)}
        rows={18}
        className="w-full resize-none rounded-md bg-app p-2 font-mono text-mini text-text-primary outline-none focus:ring-1 focus:ring-accent"
      />
      {err && <p className="mt-1 text-mini text-priority-urgent">{err}</p>}
      {teams.length > 0 && template.kind === "issue" && (
        <p className="mt-2 text-mini text-text-tertiary">
          {template.team_key
            ? `Scoped to team ${template.team_key}.`
            : "Workspace-wide template (available for every team)."}
        </p>
      )}
    </div>
  );
}
