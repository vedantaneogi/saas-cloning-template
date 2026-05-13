"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, MessageSquare, AtSign, Bell, AlertOctagon } from "lucide-react";
import clsx from "clsx";
import { PriorityIcon, StatusIcon } from "@/components/icons";
import { acceptTriage, declineTriage, type Issue } from "@/lib/api";

export function TriageBody({
  workspaceSlug,
  teamKey,
  initial,
}: {
  workspaceSlug: string;
  teamKey: string;
  initial: Issue[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Issue[]>(initial);
  const [pending, startTransition] = useTransition();

  function accept(it: Issue) {
    startTransition(async () => {
      try {
        await acceptTriage(workspaceSlug, it.identifier);
        setItems((prev) => prev.filter((x) => x.identifier !== it.identifier));
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  function decline(it: Issue) {
    if (!confirm(`Decline and remove ${it.identifier}?`)) return;
    startTransition(async () => {
      try {
        await declineTriage(workspaceSlug, it.identifier);
        setItems((prev) => prev.filter((x) => x.identifier !== it.identifier));
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="flex h-[36px] shrink-0 items-center gap-2 border-b border-border-subtle px-5 text-mini text-text-tertiary">
        <AlertOctagon size={12} />
        <span>{items.length} item{items.length === 1 ? "" : "s"} waiting on triage</span>
        <span className="ml-auto text-text-quaternary">
          Triage items are hidden from team lists until accepted.
        </span>
      </header>
      {items.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
          Nothing in triage. Incoming reports will appear here.
        </div>
      ) : (
        items.map((it) => (
          <TriageRow
            key={it.identifier}
            issue={it}
            workspaceSlug={workspaceSlug}
            onAccept={() => accept(it)}
            onDecline={() => decline(it)}
            disabled={pending}
          />
        ))
      )}
    </div>
  );
}

function TriageRow({
  issue,
  workspaceSlug,
  onAccept,
  onDecline,
  disabled,
}: {
  issue: Issue;
  workspaceSlug: string;
  onAccept: () => void;
  onDecline: () => void;
  disabled: boolean;
}) {
  const Icon = sourceIcon(issue.triage_source);
  return (
    <div className="group flex items-start gap-3 border-b border-border-subtle px-5 py-3 hover:bg-row-hover">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-border-subtle bg-pill">
        <Icon size={13} className="text-text-tertiary" />
      </span>
      <Link
        href={`/${workspaceSlug}/issue/${issue.identifier}`}
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-2 text-small">
          <PriorityIcon value={issue.priority} />
          <StatusIcon group={issue.state.group} />
          <span className="font-mono text-mini text-text-tertiary">{issue.identifier}</span>
          <span className="truncate font-medium text-text-primary">{issue.title}</span>
          {issue.triage_source && (
            <span className="rounded-sm bg-pill px-1.5 py-0.5 text-micro text-text-tertiary">
              {issue.triage_source}
            </span>
          )}
          <AgeChip createdAt={issue.created_at} />
        </div>
        {issue.description && (
          <p className="mt-1 line-clamp-2 text-mini text-text-tertiary">{issue.description}</p>
        )}
      </Link>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onDecline}
          disabled={disabled}
          className={clsx(
            "flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-mini text-text-secondary hover:bg-elevated-hover",
            disabled && "opacity-50"
          )}
        >
          <X size={11} />
          Decline
        </button>
        <button
          onClick={onAccept}
          disabled={disabled}
          className={clsx(
            "flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-mini text-white hover:opacity-90",
            disabled && "opacity-50"
          )}
        >
          <Check size={11} />
          Accept
        </button>
      </div>
    </div>
  );
}

function AgeChip({ createdAt }: { createdAt: string | null }) {
  if (!createdAt) return null;
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  if (days < 1) return null;
  const label = days === 1 ? "1 day waiting" : `${days} days waiting`;
  const tone =
    days >= 7
      ? "bg-priority-urgent/15 text-priority-urgent"
      : days >= 3
        ? "bg-priority-high/15 text-priority-high"
        : "bg-pill text-text-tertiary";
  return (
    <span className={`rounded-sm px-1.5 py-0.5 text-micro ${tone}`} title={`Awaiting triage since ${new Date(createdAt).toLocaleDateString()}`}>
      {label}
    </span>
  );
}

function sourceIcon(src: string | null) {
  if (src === "slack") return MessageSquare;
  if (src === "zendesk") return AtSign;
  if (src === "feedback") return Bell;
  return AlertOctagon;
}
