"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  DollarSign,
  FileText,
  Link2,
  MoreHorizontal,
  Paperclip,
  Plus,
  Star,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/icons";
import { Popover } from "@/components/popover";
import { CustomerGlyph } from "@/components/customers-body";
import { CustomerNotificationBell } from "@/components/customer-notification-bell";
import { useCustomerPrefs } from "@/lib/customer-prefs";
import { useHydrated } from "@/lib/use-hydrated";
import {
  createCustomerRequest,
  type Customer,
  type CustomerRequest,
  type Project,
  type Team,
} from "@/lib/api";

/**
 * /customer/[slug] body. Matches image #26 — breadcrumb header,
 * customer headline with stats row (Status / Revenue / Size / Owner),
 * Requests section with an inline Add Request form that creates an
 * Issue under the chosen team/project and links the request to it.
 *
 * The bell next to the breadcrumb opens the notification-settings
 * popover from image #27 (CustomerNotificationBell).
 */
export function CustomerDetailBody({
  workspaceSlug,
  customer,
  teams,
  projects,
  initialRequests,
}: {
  workspaceSlug: string;
  customer: Customer;
  teams: Team[];
  projects: Project[];
  initialRequests: CustomerRequest[];
}) {
  const [requests, setRequests] = useState<CustomerRequest[]>(initialRequests);
  const [adding, setAdding] = useState(false);
  const { prefs, update } = useCustomerPrefs(workspaceSlug, customer.slug);
  const hydrated = useHydrated();
  const favorited = hydrated && prefs.favorite;

  // Alt+R shortcut to open the inline add-request form (Linear binds
  // Ctrl+Alt+R for "Add request" — image #26 shows the kbd hint).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && (e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        setAdding(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="flex h-[48px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <Link
          href={`/${workspaceSlug}/customers`}
          className="text-small text-text-secondary hover:text-text-primary"
        >
          Customers
        </Link>
        <ChevronRight size={11} className="text-text-quaternary" />
        <CustomerGlyph customer={customer} size={16} />
        <span className="text-small font-semibold text-text-primary">{customer.name}</span>
        <button
          type="button"
          onClick={() => update({ favorite: !prefs.favorite })}
          aria-label={favorited ? "Unfavorite customer" : "Favorite customer"}
          className={clsx(
            "ml-0.5 rounded-md p-1 transition-colors",
            favorited ? "text-amber-400" : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
          )}
        >
          <Star size={12} strokeWidth={1.75} fill={favorited ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          aria-label="Customer actions"
          className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <MoreHorizontal size={13} />
        </button>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
              }
            }}
            aria-label="Copy link"
            className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <Link2 size={13} />
          </button>
          <CustomerNotificationBell workspaceSlug={workspaceSlug} customerSlug={customer.slug} />
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex items-center gap-3">
          <CustomerGlyph customer={customer} size={36} />
          <h2 className="text-h2 font-semibold text-text-primary">{customer.name}</h2>
        </div>

        <StatsRow customer={customer} />

        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h3 className="text-default font-semibold text-text-primary">Requests</h3>
            <span className="text-default text-text-tertiary">{requests.length}</span>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1 text-mini text-text-secondary hover:bg-row-hover hover:text-text-primary"
            >
              <Plus size={11} />
              Add request
            </button>
          </div>

          {adding && (
            <AddRequestForm
              workspaceSlug={workspaceSlug}
              customer={customer}
              teams={teams}
              projects={projects}
              onCancel={() => setAdding(false)}
              onAdded={(req) => {
                setRequests((prev) => [req, ...prev]);
                setAdding(false);
              }}
            />
          )}

          {requests.length === 0 && !adding && (
            <EmptyRequests onAdd={() => setAdding(true)} />
          )}

          {requests.length > 0 && (
            <ul className="mt-4 divide-y divide-border-subtle rounded-md border border-border-subtle">
              {requests.map((r) => (
                <RequestRow key={r.id} workspaceSlug={workspaceSlug} request={r} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function StatsRow({ customer }: { customer: Customer }) {
  return (
    <div className="mt-5 flex items-start gap-12">
      <StatItem
        icon={<span className="inline-block h-1.5 w-1.5 rounded-sm bg-emerald-400" />}
        label="Status"
        value={customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
      />
      <StatItem
        icon={<DollarSign size={11} className="text-text-tertiary" />}
        label="Revenue"
        value={customer.annual_revenue != null ? `$${customer.annual_revenue.toLocaleString()}/yr` : "—"}
      />
      <StatItem
        icon={<Users size={11} className="text-text-tertiary" />}
        label="Size"
        value={customer.size != null ? String(customer.size) : "—"}
      />
      <StatItem
        icon={
          customer.owner ? (
            <Avatar initials={customer.owner.initials} color={customer.owner.color} size={14} />
          ) : (
            <span className="inline-block h-3.5 w-3.5 rounded-pill border border-dashed border-border-strong" />
          )
        }
        label="Owner"
        value={customer.owner?.name ?? "No owner"}
      />
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-mini text-text-tertiary">{label}</span>
      <span className="flex items-center gap-1.5 text-small text-text-primary">
        {icon}
        <span>{value}</span>
      </span>
    </div>
  );
}

function EmptyRequests({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border-subtle py-12 text-center">
      <h4 className="text-default font-semibold text-text-primary">Customer requests</h4>
      <p className="max-w-md text-small text-text-tertiary">
        No customer requests created yet. Use a supported integration to automatically create
        requests, or create one manually.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-mini font-medium text-white hover:opacity-90"
        >
          <Plus size={11} />
          Add request
          <span className="ml-1 inline-flex items-center gap-0.5">
            <Kbd>Ctrl</Kbd>
            <Kbd>Alt</Kbd>
            <Kbd>R</Kbd>
          </span>
        </button>
        <a
          href="https://linear.app/docs/customer-requests"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-mini text-text-secondary hover:bg-row-hover hover:text-text-primary"
        >
          <FileText size={11} />
          Documentation
        </a>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm border border-white/30 bg-white/10 px-1 text-[10px] font-mono leading-none">
      {children}
    </span>
  );
}

function AddRequestForm({
  workspaceSlug,
  customer,
  teams,
  projects,
  onCancel,
  onAdded,
}: {
  workspaceSlug: string;
  customer: Customer;
  teams: Team[];
  projects: Project[];
  onCancel: () => void;
  onAdded: (req: CustomerRequest) => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [source, setSource] = useState<string>("");
  const [target, setTarget] = useState<RequestTarget>(() =>
    teams[0] ? { kind: "new_issue", teamKey: teams[0].key, projectId: null } : { kind: "new_issue", teamKey: null, projectId: null },
  );
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const title = body.trim() || `Customer request from ${customer.name}`;
    setBusy(true);
    try {
      const req = await createCustomerRequest(workspaceSlug, {
        customer_id: customer.id,
        customer_name: customer.name,
        title,
        body: body.trim() || undefined,
        source: source || "manual",
        team_key: target.kind === "new_issue" && target.teamKey ? target.teamKey : undefined,
        project_id: target.kind === "new_issue" && target.projectId ? target.projectId : undefined,
      });
      onAdded(req);
      router.refresh();
    } catch (e) {
      console.error("create request failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-border-strong bg-elevated">
      <div className="px-3 pt-3">
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          rows={3}
          placeholder="Add request details"
          className="w-full resize-none bg-transparent text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-2">
        <SourcePill value={source} onChange={setSource} />
        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Attach"
            className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            title="Attach (coming soon)"
          >
            <Paperclip size={12} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-mini text-text-secondary hover:bg-row-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-accent px-2.5 py-1 text-mini font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add request"}
          </button>
        </span>
      </div>
      <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-2 text-mini text-text-tertiary">
        <span>↳ This request will be added to</span>
        <TargetPicker target={target} onChange={setTarget} customer={customer} teams={teams} projects={projects} />
      </div>
    </div>
  );
}

type RequestTarget =
  | { kind: "new_issue"; teamKey: string | null; projectId: string | null }
  | { kind: "existing_project"; projectId: string };

function TargetPicker({
  target,
  onChange,
  customer,
  teams,
  projects,
}: {
  target: RequestTarget;
  onChange: (t: RequestTarget) => void;
  customer: Customer;
  teams: Team[];
  projects: Project[];
}) {
  const label = (() => {
    if (target.kind === "existing_project") {
      const p = projects.find((x) => x.id === target.projectId);
      return p?.name ?? "Project";
    }
    return `New issue Customer request from ${customer.name}`;
  })();

  return (
    <Popover
      align="start"
      width={320}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "inline-flex items-center gap-1 rounded-pill border border-border-subtle px-2.5 py-1 text-mini transition-colors hover:bg-row-hover",
            open ? "border-border-strong text-text-primary" : "text-text-secondary",
          )}
        >
          {target.kind === "existing_project" ? (
            <Box size={11} className="text-text-tertiary" />
          ) : (
            <CircleDashed size={11} className="text-text-tertiary" />
          )}
          <span className="max-w-[280px] truncate">{label}</span>
          <ChevronDown size={11} className="text-text-tertiary" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {teams.length === 0 ? (
            <div className="px-2.5 py-2 text-mini text-text-tertiary">
              No teams in workspace.
            </div>
          ) : (
            <>
              <div className="px-2.5 pb-1 pt-0.5 text-micro uppercase tracking-wide text-text-quaternary">
                Create new issue in
              </div>
              {teams.map((t) => {
                const active = target.kind === "new_issue" && target.teamKey === t.key && !target.projectId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange({ kind: "new_issue", teamKey: t.key, projectId: null });
                      close();
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
                  >
                    <span
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold text-white"
                      style={{ background: t.icon_color }}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-pill bg-white/90" />
                    </span>
                    <span className="flex-1 truncate">
                      <span className="text-text-primary">{t.name}</span>
                      <span className="ml-1 text-text-tertiary">— New issue</span>
                    </span>
                    {active && (
                      <svg width="11" height="11" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="rgb(99 102 241)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </>
          )}
          {projects.length > 0 && (
            <>
              <hr className="my-1 border-border-subtle" />
              <div className="px-2.5 pb-1 pt-0.5 text-micro uppercase tracking-wide text-text-quaternary">
                Or attach to project
              </div>
              {projects.slice(0, 6).map((p) => {
                const active = target.kind === "existing_project" && target.projectId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange({ kind: "existing_project", projectId: p.id });
                      close();
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
                  >
                    <Box size={12} className="text-text-tertiary" />
                    <span className="flex-1 truncate text-text-primary">{p.name}</span>
                    {active && (
                      <svg width="11" height="11" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="rgb(99 102 241)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </Popover>
  );
}

function SourcePill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const SOURCES = [
    { v: "", label: "Source" },
    { v: "email", label: "Email" },
    { v: "slack", label: "Slack" },
    { v: "intercom", label: "Intercom" },
    { v: "zendesk", label: "Zendesk" },
    { v: "manual", label: "Manual" },
  ];
  return (
    <Popover
      align="start"
      width={180}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-pill border border-border-subtle px-2.5 py-1 text-mini transition-colors hover:bg-row-hover",
            open ? "border-border-strong text-text-primary" : "text-text-secondary",
          )}
        >
          <Link2 size={11} className="text-text-tertiary" />
          <span>{SOURCES.find((s) => s.v === value)?.label ?? "Source"}</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {SOURCES.map((s) => (
            <button
              key={s.v || "_none"}
              type="button"
              onClick={() => {
                onChange(s.v);
                close();
              }}
              className="flex w-full items-center px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

function RequestRow({ workspaceSlug, request }: { workspaceSlug: string; request: CustomerRequest }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-small">
      <span
        className={clsx(
          "inline-block h-2 w-2 rounded-pill",
          request.is_important ? "bg-amber-400" : "bg-text-quaternary",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-text-primary">{request.title}</span>
        {request.body && (
          <span className="block truncate text-mini text-text-tertiary">{request.body}</span>
        )}
      </span>
      {request.issue_identifier ? (
        <Link
          href={`/${workspaceSlug}/issue/${request.issue_identifier}`}
          className="text-mini text-accent hover:underline"
        >
          {request.issue_identifier}
        </Link>
      ) : (
        <span className="text-mini text-text-tertiary">Unlinked</span>
      )}
    </li>
  );
}
