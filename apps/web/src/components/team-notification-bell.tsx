"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Bell } from "lucide-react";
import { Popover } from "@/components/popover";
import {
  listTeamPreferences,
  patchTeamPreference,
  type TeamPreference,
} from "@/lib/api";

type SubKey = "sub_issue_added" | "sub_issue_resolved" | "sub_triage_added";

const ROWS: { key: SubKey; label: string }[] = [
  { key: "sub_issue_added", label: "An issue is added to the team" },
  { key: "sub_issue_resolved", label: "An issue is marked completed or canceled" },
  { key: "sub_triage_added", label: "An issue is added to the triage queue" },
];

const EMPTY_PREF = (teamKey: string): TeamPreference => ({
  team_key: teamKey,
  favorite: false,
  sub_issue_added: false,
  sub_issue_resolved: false,
  sub_triage_added: false,
});

/**
 * Bell icon in the team issues header. Click opens a popover that
 * toggles which team events should generate inbox notifications. The
 * three flags map directly onto the team_preferences columns
 * (sub_issue_added / sub_issue_resolved / sub_triage_added) and the
 * existing notifications service (services/notifications.py) fans out
 * inbox entries to every member with the matching flag on.
 *
 * The PATCH endpoint upserts the row when the caller has no preferences
 * yet, so we treat the "no pref row exists" state as
 * "all-flags-false defaults" — the user can flip a toggle directly and
 * the server materializes the row on first save.
 */
export function TeamNotificationBell({
  workspaceSlug,
  teamKey,
}: {
  workspaceSlug: string;
  teamKey: string;
}) {
  const [pref, setPref] = useState<TeamPreference | null>(null);
  const [saving, setSaving] = useState<SubKey | null>(null);

  useEffect(() => {
    listTeamPreferences(workspaceSlug)
      .then((rows) => {
        setPref(rows.find((r) => r.team_key === teamKey) ?? EMPTY_PREF(teamKey));
      })
      .catch(() => {
        setPref(EMPTY_PREF(teamKey));
      });
  }, [workspaceSlug, teamKey]);

  async function toggle(key: SubKey) {
    const current = pref ?? EMPTY_PREF(teamKey);
    const nextValue = !current[key];
    const optimistic = { ...current, [key]: nextValue } as TeamPreference;
    setPref(optimistic);
    setSaving(key);
    try {
      const saved = await patchTeamPreference(workspaceSlug, teamKey, { [key]: nextValue });
      setPref(saved);
    } catch (e) {
      console.error("notification pref save failed", e);
      setPref(current);
    } finally {
      setSaving(null);
    }
  }

  return (
    <Popover
      align="end"
      width={320}
      surface="glass"
      trigger={({ toggle: t, open }) => (
        <button
          type="button"
          onClick={t}
          aria-label="Notification preferences"
          title="Notification preferences"
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            open && "bg-row-hover text-text-secondary",
          )}
        >
          <Bell size={14} strokeWidth={1.75} />
        </button>
      )}
    >
      {() => (
        <div className="p-3">
          <header className="mb-2 text-mini font-medium text-text-primary">
            Send inbox notifications for
          </header>
          <ul className="space-y-0.5">
            {ROWS.map((r) => {
              const on = !!pref?.[r.key];
              const busy = saving === r.key;
              return (
                <li key={r.key}>
                  <label
                    className={clsx(
                      "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-small text-text-secondary hover:bg-white/5",
                      busy && "opacity-60",
                    )}
                  >
                    <span>{r.label}</span>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={busy}
                      onChange={() => toggle(r.key)}
                      className="h-3.5 w-3.5 cursor-pointer accent-accent"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="my-2 border-t border-border-subtle" />
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-small">
            <span className="flex items-center gap-2 text-text-secondary">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-white/10 text-[10px]">
                #
              </span>
              Slack notifications
            </span>
            <button
              type="button"
              className="rounded-md border border-border-subtle px-2 py-0.5 text-mini text-text-secondary hover:bg-row-hover hover:text-text-primary"
              onClick={() => {
                // Slack OAuth wiring lives behind the integrations settings
                // page; route there so the user can complete the connect.
                if (typeof window !== "undefined") {
                  window.location.href = `/${workspaceSlug}/settings/integrations`;
                }
              }}
            >
              Connect
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}
