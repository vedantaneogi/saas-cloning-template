"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Link2,
  Unlink,
  Check,
  X as XIcon,
  MessageSquare,
  AtSign,
  Bell,
  Inbox as InboxIcon,
  Mail,
} from "lucide-react";
import clsx from "clsx";
import {
  linkCustomerRequest,
  patchCustomerRequest,
  unlinkCustomerRequest,
  type CustomerRequest,
} from "@/lib/api";

const BUCKETS: { key: CustomerRequest["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "linked", label: "Linked" },
  { key: "resolved", label: "Resolved" },
  { key: "canceled", label: "Canceled" },
];

export function CustomerRequestsBody({
  workspaceSlug,
  initial,
}: {
  workspaceSlug: string;
  initial: CustomerRequest[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<CustomerRequest[]>(initial);
  const [_pending, startTransition] = useTransition();

  const buckets = useMemo(() => {
    const m = new Map<string, CustomerRequest[]>();
    for (const b of BUCKETS) m.set(b.key, []);
    for (const c of items) {
      if (!m.has(c.status)) m.set(c.status, []);
      m.get(c.status)!.push(c);
    }
    return m;
  }, [items]);

  function update(id: string, fn: (c: CustomerRequest) => CustomerRequest) {
    setItems((prev) => prev.map((x) => (x.id === id ? fn(x) : x)));
  }

  async function link(cr: CustomerRequest) {
    const identifier = prompt(`Link to issue (enter identifier, e.g. ENG-1):`, cr.issue_identifier ?? "")?.trim();
    if (!identifier) return;
    startTransition(async () => {
      try {
        const updated = await linkCustomerRequest(workspaceSlug, cr.id, identifier);
        update(cr.id, () => updated);
        router.refresh();
      } catch (e) {
        alert((e as Error).message || "Could not link");
      }
    });
  }

  async function unlink(cr: CustomerRequest) {
    if (!confirm(`Unlink from ${cr.issue_identifier}?`)) return;
    startTransition(async () => {
      try {
        const updated = await unlinkCustomerRequest(workspaceSlug, cr.id);
        update(cr.id, () => updated);
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  async function setStatus(cr: CustomerRequest, status: CustomerRequest["status"]) {
    startTransition(async () => {
      try {
        const updated = await patchCustomerRequest(workspaceSlug, cr.id, { status });
        update(cr.id, () => updated);
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {items.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
          No customer requests yet.
        </div>
      ) : (
        BUCKETS.filter((b) => (buckets.get(b.key) ?? []).length > 0).map((b) => {
          const rows = buckets.get(b.key) ?? [];
          return (
            <section key={b.key}>
              <header className="flex h-[34px] items-center gap-2 bg-elevated px-5 text-small">
                <span className={statusDot(b.key)} />
                <span className="font-medium text-text-primary">{b.label}</span>
                <span className="text-text-tertiary">{rows.length}</span>
              </header>
              {rows.map((cr) => (
                <RequestRow
                  key={cr.id}
                  cr={cr}
                  workspaceSlug={workspaceSlug}
                  onLink={() => link(cr)}
                  onUnlink={() => unlink(cr)}
                  onResolve={() => setStatus(cr, "resolved")}
                  onCancel={() => setStatus(cr, "canceled")}
                />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}

function RequestRow({
  cr,
  workspaceSlug,
  onLink,
  onUnlink,
  onResolve,
  onCancel,
}: {
  cr: CustomerRequest;
  workspaceSlug: string;
  onLink: () => void;
  onUnlink: () => void;
  onResolve: () => void;
  onCancel: () => void;
}) {
  const Icon = sourceIcon(cr.source);
  return (
    <div className="group flex items-start gap-3 border-b border-border-subtle px-5 py-3 hover:bg-row-hover">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-border-subtle bg-pill">
        <Icon size={13} className="text-text-tertiary" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-small">
          <span className="truncate font-medium text-text-primary">{cr.title}</span>
          <span className="rounded-sm bg-pill px-1.5 py-0.5 text-micro text-text-tertiary">{cr.source}</span>
          {cr.issue_identifier && (
            <Link
              href={`/${workspaceSlug}/issue/${cr.issue_identifier}`}
              className="flex items-center gap-1 rounded-sm bg-accent-soft px-1.5 py-0.5 text-micro font-medium text-accent hover:opacity-90"
            >
              <Link2 size={10} />
              {cr.issue_identifier}
            </Link>
          )}
          <span className="ml-auto text-mini text-text-tertiary">
            {new Date(cr.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-mini text-text-tertiary">
          <span className="text-text-secondary">{cr.customer_name}</span>
          {cr.customer_email && <span>· {cr.customer_email}</span>}
        </div>
        {cr.body && <p className="mt-1.5 line-clamp-3 text-mini text-text-tertiary">{cr.body}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 opacity-0 group-hover:opacity-100">
        {cr.issue_identifier ? (
          <button onClick={onUnlink} className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-mini text-text-secondary hover:bg-elevated-hover">
            <Unlink size={11} />
            Unlink
          </button>
        ) : (
          <button onClick={onLink} className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-mini text-text-secondary hover:bg-elevated-hover">
            <Link2 size={11} />
            Link
          </button>
        )}
        {cr.status !== "resolved" && (
          <button onClick={onResolve} className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-mini text-white hover:opacity-90">
            <Check size={11} />
            Resolve
          </button>
        )}
        {cr.status !== "canceled" && (
          <button onClick={onCancel} className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-mini text-text-secondary hover:bg-elevated-hover">
            <XIcon size={11} />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function sourceIcon(src: string) {
  if (src === "slack") return MessageSquare;
  if (src === "zendesk") return AtSign;
  if (src === "feedback") return Bell;
  if (src === "intercom") return InboxIcon;
  return Mail;
}

function statusDot(s: CustomerRequest["status"]) {
  return clsx(
    "inline-block h-2 w-2 rounded-pill",
    s === "pending" && "bg-priority-medium",
    s === "linked" && "bg-accent",
    s === "resolved" && "bg-priority-low",
    s === "canceled" && "bg-text-tertiary"
  );
}
