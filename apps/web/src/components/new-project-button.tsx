"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createProject, type Member, type ProjectState } from "@/lib/api";

const STATES: { value: ProjectState; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "started", label: "In progress" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

export function NewProjectButton({
  workspaceSlug,
  members,
}: {
  workspaceSlug: string;
  members: Member[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<ProjectState>("planned");
  const [leadId, setLeadId] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [iconColor, setIconColor] = useState("#5e6ad2");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName(""); setDescription(""); setState("planned"); setLeadId(""); setTargetDate(""); setIconColor("#5e6ad2");
  }

  async function submit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const p = await createProject(workspaceSlug, {
        name: name.trim(),
        description: description.trim() || undefined,
        state,
        icon_color: iconColor,
        lead_id: leadId || undefined,
        target_date: targetDate || undefined,
      });
      setOpen(false);
      reset();
      router.push(`/${workspaceSlug}/project/${p.slug_id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-mini text-white shadow-button hover:opacity-90"
      >
        <Plus size={12} />
        New project
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-[480px] rounded-md border border-border-subtle bg-elevated shadow-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2 text-small">
              <span className="font-medium text-text-primary">New project</span>
              <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-secondary">
                <X size={14} />
              </button>
            </header>
            <div className="space-y-3 p-3 text-small">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder="Project name"
                className="w-full bg-transparent text-default font-medium text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a description, summary, or goal…"
                rows={3}
                className="w-full resize-none rounded-md border border-border-subtle bg-app p-2 text-small text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Status">
                  <select value={state} onChange={(e) => setState(e.target.value as ProjectState)} className="w-full rounded-md border border-border-subtle bg-app px-2 py-1 outline-none">
                    {STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Lead">
                  <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="w-full rounded-md border border-border-subtle bg-app px-2 py-1 outline-none">
                    <option value="">No lead</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
                <Field label="Target date">
                  <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full rounded-md border border-border-subtle bg-app px-2 py-1 outline-none" />
                </Field>
                <Field label="Color">
                  <input type="color" value={iconColor} onChange={(e) => setIconColor(e.target.value)} className="h-7 w-full cursor-pointer rounded-md border border-border-subtle bg-app" />
                </Field>
              </div>
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-border-subtle px-3 py-2 text-mini">
              <button onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-text-tertiary hover:bg-row-hover">Cancel</button>
              <button
                onClick={submit}
                disabled={!name.trim() || submitting}
                className="rounded-md bg-accent px-3 py-1 text-white shadow-button disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create project"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-mini text-text-tertiary">
      <span>{label}</span>
      {children}
    </label>
  );
}
