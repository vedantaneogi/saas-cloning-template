"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/lib/api";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function defaultTeamKey(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleaned.length >= 3) return cleaned.slice(0, 3);
  return cleaned || "GEN";
}

export function NewWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-derive slug from name until the user edits it.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const ws = await createWorkspace({
        name: name.trim(),
        slug: slug.trim() || undefined,
        team_key: defaultTeamKey(name),
        team_name: name.trim(),
      });
      router.push(`/${ws.slug}/inbox`);
      router.refresh();
    } catch {
      setError("Could not create workspace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Name">
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder=""
          className={inputCls}
        />
      </Field>

      <Field label="URL">
        <div className="flex items-stretch overflow-hidden rounded-md border border-border-subtle bg-app focus-within:border-accent">
          <span className="flex shrink-0 items-center bg-pill px-2.5 text-mini text-text-tertiary">
            linear.techbrig.co/
          </span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="acme"
            className="flex-1 bg-transparent px-2 py-2 text-small text-text-primary outline-none placeholder:text-text-quaternary"
          />
        </div>
      </Field>

      {error && <p className="text-mini text-priority-urgent">{error}</p>}

      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="w-full rounded-pill bg-elevated px-3 py-2.5 text-small font-medium text-text-primary shadow-button hover:bg-elevated-hover disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-border-subtle bg-app px-3 py-2 text-small text-text-primary outline-none placeholder:text-text-quaternary focus:border-accent focus:ring-1 focus:ring-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-mini text-text-tertiary">{label}</span>
      {children}
    </label>
  );
}
