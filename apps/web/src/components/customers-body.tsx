"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, FileText, Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/icons";
import { CustomerCreateModal } from "@/components/customer-create-modal";
import type { Customer, Member } from "@/lib/api";

/**
 * Client wrapper for /customers. Owns the page header (with "+"
 * trailing button), the search input + Filter/Display chip placeholder
 * row, and either the list of customer rows or the centered empty
 * state matching image #24. Filter+Display chips are kept visual only
 * for now — the search input already covers the most common filtering
 * need and the model doesn't expose enough fields yet to justify two
 * full popovers.
 */
export function CustomersBody({
  workspaceSlug,
  members,
  initial,
}: {
  workspaceSlug: string;
  members: Member[];
  initial: Customer[];
}) {
  const [customers, setCustomers] = useState<Customer[]>(initial);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      if (c.domains.some((d) => d.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [customers, search]);

  const isEmpty = customers.length === 0;

  return (
    <>
      <header className="flex h-[48px] shrink-0 items-center gap-3 border-b border-border-subtle px-4">
        <h1 className="truncate text-small font-semibold text-text-primary">Customers</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="New customer"
          title="New customer"
          className="ml-auto rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <Plus size={14} />
        </button>
      </header>

      <div className="flex h-[44px] shrink-0 items-center gap-3 border-b border-border-subtle px-4">
        <span className="flex flex-1 items-center gap-2">
          <Search size={13} className="text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find by name or domain..."
            className="flex-1 bg-transparent text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
          />
        </span>
        <button
          type="button"
          aria-label="Filter"
          title="Filter"
          className="flex h-7 w-7 items-center justify-center rounded-pill border border-border-subtle text-text-tertiary transition-colors hover:bg-row-hover hover:text-text-secondary"
        >
          <Filter size={13} />
        </button>
        <button
          type="button"
          aria-label="Display options"
          title="Display options"
          className="flex h-7 w-7 items-center justify-center rounded-pill border border-border-subtle text-text-tertiary transition-colors hover:bg-row-hover hover:text-text-secondary"
        >
          <SlidersHorizontal size={13} />
        </button>
      </div>

      {isEmpty ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <CustomerRow key={c.id} workspaceSlug={workspaceSlug} customer={c} />
          ))}
          {filtered.length === 0 && (
            <div className="flex h-32 items-center justify-center text-small text-text-tertiary">
              No customers match the current search.
            </div>
          )}
        </div>
      )}

      {creating && (
        <CustomerCreateModal
          workspaceSlug={workspaceSlug}
          members={members}
          onClose={() => setCreating(false)}
          onCreated={(c) => setCustomers((prev) => [c, ...prev])}
        />
      )}
    </>
  );
}

function CustomerRow({ workspaceSlug, customer }: { workspaceSlug: string; customer: Customer }) {
  return (
    <Link
      href={`/${workspaceSlug}/customer/${customer.slug}`}
      className="flex items-center gap-3 border-b border-border-subtle px-5 py-3 text-small transition-colors hover:bg-row-hover"
    >
      <CustomerGlyph customer={customer} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-text-primary">{customer.name}</span>
        {customer.domains.length > 0 && (
          <span className="block truncate text-mini text-text-tertiary">
            {customer.domains.join(", ")}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-6">
        <StatusPill status={customer.status} />
        {customer.tier && (
          <span className="text-mini text-text-secondary">
            {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)}
          </span>
        )}
        {customer.annual_revenue != null && (
          <span className="text-mini text-text-secondary">${customer.annual_revenue.toLocaleString()}/yr</span>
        )}
        {customer.size != null && (
          <span className="text-mini text-text-secondary">{customer.size} seats</span>
        )}
        <span className="text-mini text-text-tertiary">
          {customer.request_count} {customer.request_count === 1 ? "request" : "requests"}
        </span>
        {customer.owner ? (
          <Avatar initials={customer.owner.initials} color={customer.owner.color} size={20} />
        ) : (
          <span className="inline-block h-5 w-5 rounded-pill border border-dashed border-border-strong" />
        )}
      </span>
    </Link>
  );
}

export function CustomerGlyph({ customer, size = 20 }: { customer: Customer; size?: number }) {
  if (customer.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customer.logo_url}
        alt={customer.name}
        className="shrink-0 rounded-sm object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = customer.name.charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-sm bg-pill text-mini font-semibold text-text-primary"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const cls =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "prospect"
        ? "bg-purple-500/15 text-purple-300"
        : "bg-pill text-text-tertiary";
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-micro font-medium", cls)}>
      <span className="inline-block h-1.5 w-1.5 rounded-sm bg-current" />
      {label}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-8 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <CardStackIcon />
        <h2 className="mt-6 text-h2 font-semibold text-text-primary">Customers</h2>
        <p className="mt-2 text-small text-text-secondary">
          Add organizations using your product to track their feature requests and use attributes
          like revenue and size to prioritize development.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-mini font-medium text-white hover:opacity-90"
          >
            Create new customer
          </button>
          <a
            href="https://linear.app/docs/customer-requests"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-mini text-text-secondary hover:bg-row-hover hover:text-text-primary"
          >
            <FileText size={12} />
            Documentation
          </a>
        </div>
      </div>
    </div>
  );
}

function CardStackIcon() {
  // Stylized stacked-cards icon matching the hero glyph in image #24.
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
      <rect x="14" y="22" width="42" height="34" rx="6" stroke="rgba(120,130,160,0.5)" strokeWidth="1.5" />
      <rect x="22" y="30" width="42" height="34" rx="6" stroke="rgba(140,150,180,0.5)" strokeWidth="1.5" fill="rgba(40, 44, 60, 0.4)" />
      <rect x="30" y="38" width="42" height="34" rx="6" stroke="rgba(160,170,200,0.5)" strokeWidth="1.5" fill="rgba(60, 64, 80, 0.4)" />
      <g transform="translate(40, 50)" stroke="rgba(190,200,220,0.6)" strokeWidth="1.4" fill="none">
        <circle cx="6" cy="2" r="2.2" />
        <path d="M2 9 c0 -3 3 -5 4 -5 s4 2 4 5" strokeLinecap="round" />
      </g>
      <g transform="translate(54, 42)" stroke="rgba(180,190,210,0.45)" strokeWidth="1.2" fill="none">
        <circle cx="3" cy="3" r="0.8" />
        <circle cx="6" cy="3" r="0.8" />
        <circle cx="9" cy="3" r="0.8" />
      </g>
    </svg>
  );
}
