"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/lib/api";

export function NewWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [teamKey, setTeamKey] = useState("");
  const [iconColor, setIconColor] = useState("#f59e0b");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const ws = await createWorkspace({
        name: name.trim(),
        icon_color: iconColor,
        team_key: teamKey.trim().toUpperCase() || undefined,
        team_name: name.trim(),
      });
      router.push(`/${ws.slug}/inbox`);
      router.refresh();
    } catch (err) {
      setError("Could not create workspace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <Field label="Workspace name">
        <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc" className={inputCls} />
      </Field>
      <Field label="Team prefix (uppercase, max 8)">
        <input
          required
          maxLength={8}
          value={teamKey}
          onChange={(e) => setTeamKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="ENG"
          className={`${inputCls} font-mono`}
        />
      </Field>
      <Field label="Color">
        <input type="color" value={iconColor} onChange={(e) => setIconColor(e.target.value)} className="h-9 w-16 cursor-pointer rounded-md bg-app" />
      </Field>
      {error && <p className="text-mini text-priority-urgent">{error}</p>}
      <button
        type="submit"
        disabled={busy || !name.trim() || !teamKey.trim()}
        className="w-full rounded-md bg-accent px-3 py-2 text-small font-medium text-white shadow-button hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}

const inputCls = "w-full rounded-md bg-app px-3 py-2 text-small text-text-primary outline-none placeholder:text-text-tertiary focus:ring-1 focus:ring-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-mini text-text-tertiary">{label}</span>
      {children}
    </label>
  );
}
