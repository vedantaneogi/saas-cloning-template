"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Folders, X } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import {
  createInvite,
  getWorkspace,
  listInvites,
  type MemberRole,
  type PendingInvite,
  type Team,
  type Workspace,
} from "@/lib/api";

/**
 * Linear-style "Invite to your workspace" modal — multi-email textarea
 * + multi-select "Add to team" picker + Send invites CTA. The team
 * selection is persisted on the WorkspaceInvite row so the invitee
 * auto-joins those teams when they accept (see
 * `app/auth/routes.py:accept_invite`).
 *
 * Pending invites that already exist are still loaded so we can revoke
 * via the API, but they aren't surfaced in this modal — manage from
 * /settings/members.
 */
export function InviteModal({
  workspaceSlug,
  open,
  onClose,
}: {
  workspaceSlug: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [emailText, setEmailText] = useState("");
  const [selectedTeamKeys, setSelectedTeamKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [, setInvites] = useState<PendingInvite[]>([]);

  useEffect(() => {
    if (!open) return;
    setEmailText("");
    setSelectedTeamKeys([]);
    setError(null);
    setSuccess(null);
    getWorkspace(workspaceSlug).then(setWorkspace).catch(() => setWorkspace(null));
    // Pulled so a future "manage invites" pane has fresh data; not
    // rendered in this modal.
    listInvites(workspaceSlug).then(setInvites).catch(() => setInvites([]));
  }, [open, workspaceSlug]);

  const teams: Team[] = workspace?.teams ?? [];
  const teamsByKey = useMemo(() => new Map(teams.map((t) => [t.key, t])), [teams]);

  function toggleTeam(key: string) {
    setSelectedTeamKeys((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  }

  function parseEmails(raw: string): string[] {
    // Split on commas, semicolons, newlines, or whitespace — accept any
    // combo (matches how Linear handles paste-multiple-emails).
    return raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
  }

  async function send() {
    if (busy) return;
    const emails = parseEmails(emailText);
    if (emails.length === 0) {
      setError("Add at least one email address.");
      return;
    }
    const bad = emails.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (bad) {
      setError(`Not a valid email: ${bad}`);
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    let sent = 0;
    const failures: string[] = [];
    for (const email of emails) {
      try {
        await createInvite(workspaceSlug, {
          email,
          role: "member" as MemberRole,
          team_keys: selectedTeamKeys,
        });
        sent += 1;
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("409")) failures.push(`${email} (already a member)`);
        else failures.push(email);
      }
    }
    setBusy(false);
    if (sent > 0) {
      setSuccess(`Sent ${sent} invite${sent === 1 ? "" : "s"}.`);
      setEmailText("");
      router.refresh();
    }
    if (failures.length > 0) {
      setError(`Couldn't invite: ${failures.join(", ")}`);
    } else if (sent > 0) {
      // Auto-close on full success after a beat so the user sees the
      // confirmation flash.
      setTimeout(() => onClose(), 700);
    }
  }

  if (!open) return null;
  const wsInitials =
    workspace?.name?.slice(0, 2).toUpperCase() ?? workspaceSlug.slice(0, 2).toUpperCase();
  const wsColor = workspace?.icon_color ?? "#f59e0b";

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-start justify-center bg-black/40 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-[92vw] rounded-xl bg-elevated shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-mini font-semibold text-white"
              style={{ background: wsColor }}
            >
              {wsInitials}
            </span>
            <h2 className="text-default font-semibold text-text-primary">Invite to your workspace</h2>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary" aria-label="Close">
            <X size={14} />
          </button>
        </header>

        <div className="px-5 pb-2">
          <label className="block text-small font-medium text-text-primary">Email</label>
          <textarea
            autoFocus
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder="email@gmail.com, email2@gmail.com..."
            rows={3}
            className="mt-2 w-full resize-none rounded-md border border-border-strong bg-input px-3 py-2 text-small text-text-primary placeholder:text-text-quaternary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="px-5 pb-4 pt-2">
          <label className="block text-small font-medium text-text-primary">
            Add to team <span className="text-text-tertiary">(optional)</span>
          </label>
          <div className="mt-2">
            <TeamMultiPicker
              teams={teams}
              selected={selectedTeamKeys}
              onToggle={toggleTeam}
              teamsByKey={teamsByKey}
            />
          </div>
        </div>

        {error && <p className="px-5 pb-2 text-mini text-priority-urgent">{error}</p>}
        {success && !error && (
          <p className="px-5 pb-2 text-mini text-priority-low">{success}</p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border-subtle/60 px-5 py-3">
          <button
            type="button"
            onClick={send}
            disabled={busy || emailText.trim().length === 0}
            className="rounded-md bg-accent px-3.5 py-1.5 text-small font-medium text-white shadow-button hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send invites"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamMultiPicker({
  teams,
  selected,
  onToggle,
  teamsByKey,
}: {
  teams: Team[];
  selected: string[];
  onToggle: (key: string) => void;
  teamsByKey: Map<string, Team>;
}) {
  const summary =
    selected.length === 0
      ? "Select teams..."
      : selected.length <= 2
        ? selected
            .map((k) => teamsByKey.get(k)?.name ?? k)
            .join(", ")
        : `${selected.length} teams selected`;

  return (
    <Popover
      align="start"
      width={520}
      triggerWrapperClassName="relative block w-full"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "flex w-full items-center justify-between rounded-md border bg-input px-3 py-2 text-small focus:outline-none",
            open
              ? "border-accent ring-1 ring-accent text-text-primary"
              : "border-border-strong text-text-secondary hover:border-accent/60",
          )}
        >
          <span className={selected.length === 0 ? "text-text-quaternary" : "text-text-primary"}>
            {summary}
          </span>
          <ChevronDown size={12} className="text-text-tertiary" />
        </button>
      )}
    >
      {() => (
        <div className="max-h-64 overflow-y-auto py-1">
          {teams.length === 0 && (
            <div className="px-3 py-2 text-mini text-text-tertiary">No teams yet.</div>
          )}
          {teams.map((t) => {
            const active = selected.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onToggle(t.key)}
                className={clsx(
                  "flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-small hover:bg-row-hover",
                  active ? "bg-row-selected text-text-primary" : "text-text-secondary",
                )}
              >
                <span
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
                  style={{ background: t.icon_color }}
                >
                  <Folders size={9} className="text-white/85" />
                </span>
                <span className="flex-1 truncate">{t.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
