"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, RotateCcw, UserPlus, AtSign, Bell, Clock, BellOff } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/icons";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  snoozeNotification,
  unsnoozeNotification,
  type Notification,
} from "@/lib/api";
import { relTime } from "@/lib/time";

type InboxFilter = "all" | "unread" | "mentions";

export function InboxBody({
  workspaceSlug,
  initial,
}: {
  workspaceSlug: string;
  initial: Notification[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(initial);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onFocus() {
      listNotifications(workspaceSlug).then(setItems).catch(() => {});
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [workspaceSlug]);

  function markRead(n: Notification) {
    if (n.read_at) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    markNotificationRead(workspaceSlug, n.id).catch(() => {});
  }

  function snooze(n: Notification, minutes: number) {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    snoozeNotification(workspaceSlug, n.id, minutes).catch(() => {});
  }

  function markAll() {
    startTransition(async () => {
      try {
        await markAllNotificationsRead(workspaceSlug);
        setItems((prev) => prev.map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() })));
        router.refresh();
      } catch {
        // ignore
      }
    });
  }

  const unread = items.filter((n) => !n.read_at);
  const visible = items.filter((n) => {
    if (filter === "unread") return !n.read_at;
    if (filter === "mentions") return n.kind === "mentioned";
    return true;
  });

  return (
    <>
      <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border-subtle px-3 text-mini text-text-tertiary">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          All <span className="text-text-quaternary">{items.length}</span>
        </FilterPill>
        <FilterPill active={filter === "unread"} onClick={() => setFilter("unread")}>
          Unread <span className="text-text-quaternary">{unread.length}</span>
        </FilterPill>
        <FilterPill active={filter === "mentions"} onClick={() => setFilter("mentions")}>
          <AtSign size={11} className="mr-0.5" />
          Mentions
        </FilterPill>
        <button
          onClick={markAll}
          disabled={pending || unread.length === 0}
          className="ml-auto rounded-md px-2 py-0.5 hover:bg-row-hover hover:text-text-secondary disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 py-10 text-center text-small text-text-tertiary">
            {filter === "unread" ? "No unread notifications." : filter === "mentions" ? "No mentions." : "You have no notifications."}
          </div>
        ) : (
          visible.map((n) => (
            <NotificationRow
              key={n.id}
              note={n}
              workspaceSlug={workspaceSlug}
              onClick={() => markRead(n)}
              onSnooze={(mins) => snooze(n, mins)}
            />
          ))
        )}
      </div>
    </>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1 rounded-pill px-2 py-0.5",
        active ? "bg-row-selected text-text-primary" : "hover:bg-row-hover hover:text-text-secondary"
      )}
    >
      {children}
    </button>
  );
}

function NotificationRow({
  note,
  workspaceSlug,
  onClick,
  onSnooze,
}: {
  note: Notification;
  workspaceSlug: string;
  onClick: () => void;
  onSnooze: (minutes: number) => void;
}) {
  const unread = !note.read_at;
  const href = note.issue_identifier ? `/${workspaceSlug}/issue/${note.issue_identifier}` : "#";
  const Icon = iconFor(note.kind);
  return (
    <div className={clsx(
      "group relative flex gap-2.5 border-b border-border-subtle hover:bg-row-hover",
      unread && "bg-row-selected/30"
    )}>
    <Link
      href={href}
      onClick={onClick}
      className="flex flex-1 gap-2.5 px-3 py-2.5"
    >
      <span className="relative mt-0.5 shrink-0">
        {note.actor ? (
          <Avatar initials={note.actor.initials} color={note.actor.color} size={28} />
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-pill border border-border-subtle bg-pill">
            <Icon size={14} className="text-text-tertiary" />
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-pill border border-border-default bg-elevated">
          <Icon size={9} className="text-text-tertiary" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-small">
          {unread && <span className="inline-block h-1.5 w-1.5 rounded-pill bg-accent" />}
          <span className="truncate font-medium text-text-primary">
            {note.issue_identifier ? `${note.issue_identifier} ${note.issue_title ?? ""}`.trim() : labelFor(note.kind)}
          </span>
          <span className="ml-auto shrink-0 text-mini text-text-tertiary">{relTime(note.created_at)}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-mini text-text-tertiary">
          {note.actor?.name ? <span className="text-text-secondary">{note.actor.name}</span> : "System"}{" "}
          {note.body}
        </span>
      </span>
    </Link>
    <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSnooze(60); }}
        className="rounded-md bg-elevated px-1.5 py-0.5 text-mini text-text-tertiary shadow-button hover:text-text-secondary"
        title="Snooze 1h"
      >
        <Clock size={11} /> 1h
      </button>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSnooze(60 * 24); }}
        className="rounded-md bg-elevated px-1.5 py-0.5 text-mini text-text-tertiary shadow-button hover:text-text-secondary"
        title="Snooze 1 day"
      >
        <BellOff size={11} /> 1d
      </button>
    </div>
    </div>
  );
}

function iconFor(kind: string) {
  if (kind === "commented") return MessageSquare;
  if (kind === "assigned") return UserPlus;
  if (kind === "status_changed") return RotateCcw;
  if (kind === "mentioned") return AtSign;
  return Bell;
}

function labelFor(kind: string) {
  if (kind === "commented") return "New comment";
  if (kind === "assigned") return "Issue assigned";
  if (kind === "status_changed") return "Status changed";
  if (kind === "mentioned") return "You were mentioned";
  return "Notification";
}

