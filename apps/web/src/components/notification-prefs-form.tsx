"use client";

import { useState } from "react";
import { Bell, BellOff, ExternalLink } from "lucide-react";
import Link from "next/link";
import { upsertNotificationPref, deleteNotificationPref, type NotificationPreference, type Project, type Team } from "@/lib/api";

export function NotificationPrefsForm({
  workspaceSlug,
  teams,
  projects,
  initial,
}: {
  workspaceSlug: string;
  teams: Team[];
  projects: Project[];
  initial: NotificationPreference[];
}) {
  const [prefs, setPrefs] = useState<NotificationPreference[]>(initial);
  const [busy, setBusy] = useState(false);

  function isMuted(scopeType: "team" | "project", scopeId: string) {
    return prefs.some((p) => p.scope_type === scopeType && p.scope_id === scopeId && p.muted);
  }

  async function toggle(scopeType: "team" | "project", scopeId: string) {
    setBusy(true);
    try {
      const existing = prefs.find((p) => p.scope_type === scopeType && p.scope_id === scopeId);
      if (existing && existing.muted) {
        await deleteNotificationPref(workspaceSlug, existing.id);
        setPrefs((prev) => prev.filter((p) => p.id !== existing.id));
      } else {
        const updated = await upsertNotificationPref(workspaceSlug, { scope_type: scopeType, scope_id: scopeId, muted: true });
        setPrefs((prev) => [...prev.filter((p) => p.id !== updated.id), updated]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-6">
      <section>
        <h2 className="mb-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">Teams</h2>
        {teams.length === 0 ? (
          <p className="text-mini text-text-tertiary">No teams.</p>
        ) : (
          <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
            {teams.map((t) => {
              const muted = isMuted("team", t.id);
              return (
                <li key={t.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: t.icon_color }} />
                  <span className="flex-1 text-small text-text-primary">{t.name}</span>
                  <button
                    disabled={busy}
                    onClick={() => toggle("team", t.id)}
                    className={
                      "flex items-center gap-1 rounded-md px-2 py-1 text-mini " +
                      (muted ? "bg-pill text-text-tertiary" : "bg-accent text-white")
                    }
                  >
                    {muted ? <BellOff size={11} /> : <Bell size={11} />}
                    {muted ? "Muted" : "Subscribed"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-mini font-medium uppercase tracking-wider text-text-tertiary">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-mini text-text-tertiary">No projects.</p>
        ) : (
          <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
            {projects.map((p) => {
              const muted = isMuted("project", p.id);
              return (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: p.icon_color }} />
                  <Link
                    href={`/${workspaceSlug}/project/${p.slug_id}`}
                    className="flex flex-1 items-center gap-1 text-small text-text-primary hover:underline"
                  >
                    {p.name}
                    <ExternalLink size={10} className="text-text-tertiary" />
                  </Link>
                  <button
                    disabled={busy}
                    onClick={() => toggle("project", p.id)}
                    className={
                      "flex items-center gap-1 rounded-md px-2 py-1 text-mini " +
                      (muted ? "bg-pill text-text-tertiary" : "bg-accent text-white")
                    }
                  >
                    {muted ? <BellOff size={11} /> : <Bell size={11} />}
                    {muted ? "Muted" : "Subscribed"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-mini text-text-tertiary">
        Email digest preview is in the <Link className="text-accent hover:underline" href={`/${workspaceSlug}/inbox/digest`}>inbox digest page</Link>.
      </p>
    </div>
  );
}
