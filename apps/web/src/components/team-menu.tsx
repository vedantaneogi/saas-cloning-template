"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Link as LinkIcon,
  LogOut,
  MoreHorizontal,
  Settings,
  Slack,
  Star,
} from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import {
  SUBSCRIPTION_TOPICS,
  useTeamFavorite,
  useTeamSubscription,
} from "@/lib/team-prefs";
import { leaveTeam, type Team } from "@/lib/api";

const KBD = "ml-auto text-micro text-text-tertiary";

/**
 * 3-dot menu attached to each team row in the sidebar. Mirrors Linear's
 * team context menu: Favorite, Team settings, Copy URL, Open archive,
 * Subscribe (3-topic submenu), Configure Slack notifications, Leave team.
 *
 * Favorite + per-topic Subscribe persist in localStorage via
 * `lib/team-prefs.ts`; the same module also publishes a change event so
 * the sidebar's Favorites section refreshes when you flip the star here.
 */
export function TeamMenu({
  team,
  workspaceSlug,
}: {
  team: Team;
  workspaceSlug: string;
}) {
  const [favorited, toggleFavorite] = useTeamFavorite(workspaceSlug, team.key);
  const { topics, toggle: toggleTopic, anySubscribed } = useTeamSubscription(
    workspaceSlug,
    team.key,
  );
  const [leaveOpen, setLeaveOpen] = useState(false);

  async function copyUrl(close: () => void) {
    const url = `${window.location.origin}/${workspaceSlug}/team/${team.key}/active`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers — silently ignore.
    }
    close();
  }

  function openLeaveModal(close: () => void) {
    close();
    setLeaveOpen(true);
  }

  return (
    <>
    <Popover
      align="start"
      width={260}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          aria-label={`Open menu for ${team.name}`}
          title="Open team menu"
          className={clsx(
            "rounded-sm p-0.5 text-text-tertiary transition-opacity hover:bg-row-hover hover:text-text-secondary",
            open || favorited
              ? "opacity-100"
              : "opacity-0 group-hover/team:opacity-100 focus-visible:opacity-100",
          )}
        >
          <MoreHorizontal size={12} />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          <MenuRow onSelect={() => { toggleFavorite(); close(); }}>
            <Star
              size={13}
              className={favorited ? "text-priority-medium" : "text-text-tertiary"}
              fill={favorited ? "currentColor" : "none"}
            />
            <span>{favorited ? "Unfavorite" : "Favorite"}</span>
            <span className={KBD}>Alt F</span>
          </MenuRow>

          <MenuLink
            href={`/${workspaceSlug}/settings/team/${team.key}`}
            onSelect={close}
          >
            <Settings size={13} className="text-text-tertiary" />
            <span>Team settings</span>
          </MenuLink>

          <MenuRow onSelect={() => copyUrl(close)}>
            <LinkIcon size={13} className="text-text-tertiary" />
            <span>Copy URL</span>
            <span className={KBD}>Ctrl ⇧ ,</span>
          </MenuRow>

          <MenuLink href={`/${workspaceSlug}/team/${team.key}/backlog`} onSelect={close}>
            <Archive size={13} className="text-text-tertiary" />
            <span>Open archive</span>
          </MenuLink>

          <SubscribeMenuItem
            anySubscribed={anySubscribed}
            topics={topics}
            onToggleTopic={toggleTopic}
          />

          <MenuLink
            href={`/${workspaceSlug}/settings/integrations`}
            onSelect={close}
          >
            <Slack size={13} className="text-text-tertiary" />
            <span>Configure Slack notifications…</span>
          </MenuLink>

          <hr className="my-1 border-border-subtle" />

          <MenuRow onSelect={() => openLeaveModal(close)}>
            <LogOut size={13} className="text-text-tertiary" />
            <span>Leave team…</span>
          </MenuRow>
        </div>
      )}
    </Popover>
    <LeaveTeamModal
      open={leaveOpen}
      team={team}
      workspaceSlug={workspaceSlug}
      onClose={() => setLeaveOpen(false)}
    />
    </>
  );
}

function MenuLink({
  href,
  onSelect,
  children,
}: {
  href: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-center gap-2 px-2.5 py-1.5 text-small text-text-secondary hover:bg-row-hover"
    >
      {children}
    </Link>
  );
}

function MenuRow({
  onSelect,
  children,
}: {
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
    >
      {children}
    </button>
  );
}

function LeaveTeamModal({
  open,
  team,
  workspaceSlug,
  onClose,
}: {
  open: boolean;
  team: Team;
  workspaceSlug: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await leaveTeam(workspaceSlug, team.key);
      onClose();
      // Bounce the user away from the now-inaccessible team and force the
      // server-rendered workspace data (which includes the team list) to refetch.
      router.push(`/${workspaceSlug}/inbox`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't leave the team.");
      setSubmitting(false);
    }
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-lg bg-elevated p-5 shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-default font-semibold text-text-primary">Leave {team.name}?</h2>
        <p className="mt-2 text-small leading-relaxed text-text-tertiary">
          You can rejoin the team at any time from the &apos;Teams&apos; section in the sidebar.
        </p>
        {error && (
          <p className="mt-3 text-mini text-priority-urgent">{error}</p>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-3 py-1.5 text-small text-text-secondary hover:bg-row-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={submitting}
            className="rounded-md bg-priority-urgent px-3.5 py-1.5 text-small font-medium text-white shadow-button hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Leaving…" : "Leave"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The parent Popover has overflow-hidden so a nested submenu rendered as
 * an absolute child gets clipped. We portal the submenu to document.body
 * and position it next to the trigger row, so it can escape the parent
 * and overlay other UI cleanly.
 */
function SubscribeMenuItem({
  anySubscribed,
  topics,
  onToggleTopic,
}: {
  anySubscribed: boolean;
  topics: Set<string>;
  onToggleTopic: (t: "issue_added" | "issue_resolved" | "triage_added") => void;
}) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // Recompute position whenever the submenu opens / window scrolls.
  useLayoutEffect(() => {
    if (!open) return;
    function recompute() {
      const r = rowRef.current?.getBoundingClientRect();
      const s = subRef.current;
      if (!r || !s) return;
      const sw = s.offsetWidth;
      const sh = s.offsetHeight;
      const gutter = 8;
      // Default: open to the right of the row.
      let left = r.right + 6;
      if (left + sw > window.innerWidth - gutter) {
        // Not enough room on the right → flip left of the row.
        left = Math.max(gutter, r.left - sw - 6);
      }
      let top = r.top - 4;
      if (top + sh > window.innerHeight - gutter) {
        top = Math.max(gutter, window.innerHeight - sh - gutter);
      }
      setPos({ top, left });
    }
    recompute();
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open]);

  // Keep the submenu open while the cursor is on the trigger row *or* in
  // the submenu itself. A small delay on the close edge lets users move
  // diagonally between the two without the menu snapping shut.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  return (
    <>
      <button
        ref={rowRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => { cancelClose(); setOpen(true); }}
        onMouseLeave={scheduleClose}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
      >
        {anySubscribed ? (
          <BellRing size={13} className="text-accent" />
        ) : (
          <Bell size={13} className="text-text-tertiary" />
        )}
        <span className="flex-1">Subscribe</span>
        <ChevronRight size={11} className="text-text-tertiary" />
      </button>
      {open && mounted && createPortal(
        <div
          ref={subRef}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          // Parent <Popover> closes on any mousedown that doesn't land
          // inside its DOM subtree. This submenu is portaled to body, so
          // from the parent's perspective every click here is "outside" —
          // swallow the mousedown so the parent's window-level listener
          // never sees it.
          onMouseDown={(e) => e.stopPropagation()}
          className={clsx(
            // Above the parent Popover (z-[1200]) and any modal that
            // contains the menu — submenu always wins its stacking war.
            "fixed z-[1210] w-[320px] overflow-hidden rounded-md bg-elevated py-1 shadow-popover",
            pos == null && "invisible",
          )}
          style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
        >
          {SUBSCRIPTION_TOPICS.map((t) => {
            const checked = topics.has(t.value);
            return (
              <button
                key={t.value}
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleTopic(t.value); }}
                className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
              >
                <span className={clsx(
                  "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                  checked ? "border-accent bg-accent" : "border-border-strong bg-input",
                )}>
                  {checked && <Check size={10} className="text-white" />}
                </span>
                <span className="flex-1">{t.label}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
