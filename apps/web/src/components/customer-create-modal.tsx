"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Upload, X } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { Avatar } from "@/components/icons";
import { createCustomer, type Customer, type Member } from "@/lib/api";

/**
 * Modal that opens off the "+" trailing button on /customers and the
 * "Create new customer" CTA in the empty state. Layout mirrors image
 * #25: Logo upload affordance, Name + Owner row, Status + Tier row,
 * Annual revenue + Size row, and an additive Domains list with an
 * "Add domain" link. The Logo slot accepts a data URL (so seed-free
 * environments can still preview an avatar before any object-store
 * lands).
 */
export function CustomerCreateModal({
  workspaceSlug,
  members,
  onClose,
  onCreated,
}: {
  workspaceSlug: string;
  members: Member[];
  onClose: () => void;
  onCreated?: (c: Customer) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [owner, setOwner] = useState<Member | null>(null);
  const [status, setStatus] = useState("active");
  const [tier, setTier] = useState<string | null>(null);
  const [annualRevenue, setAnnualRevenue] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [domains, setDomains] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);

  function handleLogoFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const created = await createCustomer(workspaceSlug, {
        name: name.trim(),
        owner_id: owner?.id,
        status,
        tier: tier ?? undefined,
        annual_revenue: annualRevenue ? Number(annualRevenue) : undefined,
        size: size ? Number(size) : undefined,
        logo_url: logoUrl ?? undefined,
        domains: domains.map((d) => d.trim()).filter(Boolean),
      });
      onCreated?.(created);
      router.push(`/${workspaceSlug}/customer/${created.slug}`);
    } catch (e) {
      console.error("create customer failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-[660px] rounded-lg border border-border-subtle bg-elevated shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
          <h2 className="text-default font-semibold text-text-primary">Create customer</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4">
          <LogoRow logoUrl={logoUrl} onFile={handleLogoFile} onClear={() => setLogoUrl(null)} />

          <Row>
            <Field label="Name">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                className="w-full rounded-md border border-border-strong bg-app px-2.5 py-1.5 text-small text-text-primary placeholder:text-text-quaternary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </Field>
            <Field label="Owner">
              <OwnerSelect members={members} value={owner} onChange={setOwner} />
            </Field>
          </Row>

          <Row>
            <Field label="Status">
              <SelectButton
                value={status}
                onChange={setStatus}
                options={[
                  { value: "active", label: "Active", color: "#22c55e" },
                  { value: "prospect", label: "Prospect", color: "#a855f7" },
                  { value: "churned", label: "Churned", color: "#71717a" },
                ]}
                renderValue={(opt) => (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-sm"
                      style={{ background: opt?.color ?? "#71717a" }}
                    />
                    <span>{opt?.label ?? "Active"}</span>
                  </span>
                )}
              />
            </Field>
            <Field label="Tier">
              <SelectButton
                value={tier ?? ""}
                onChange={(v) => setTier(v || null)}
                options={[
                  { value: "", label: "No tier" },
                  { value: "free", label: "Free" },
                  { value: "pro", label: "Pro" },
                  { value: "business", label: "Business" },
                  { value: "enterprise", label: "Enterprise" },
                ]}
                renderValue={(opt) => <span>{opt?.label ?? "No tier"}</span>}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Annual revenue">
              <div className="flex items-center rounded-md border border-border-strong bg-app focus-within:ring-1 focus-within:ring-accent">
                <span className="px-2 text-mini text-text-tertiary">$</span>
                <input
                  type="number"
                  min={0}
                  value={annualRevenue}
                  onChange={(e) => setAnnualRevenue(e.target.value)}
                  className="w-full bg-transparent py-1.5 pr-2 text-small text-text-primary focus:outline-none"
                />
              </div>
            </Field>
            <Field label="Size">
              <input
                type="number"
                min={0}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full rounded-md border border-border-strong bg-app px-2.5 py-1.5 text-small text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </Field>
          </Row>

          <div className="mt-4">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-mini font-semibold text-text-primary">Domains</span>
              <button
                type="button"
                onClick={() => setDomains((d) => [...d, ""])}
                className="text-mini text-accent hover:opacity-80"
              >
                Add domain
              </button>
            </div>
            {domains.map((d, i) => (
              <div key={i} className="mb-1.5 flex items-center gap-2">
                <input
                  value={d}
                  onChange={(e) =>
                    setDomains((arr) => arr.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  placeholder="customer.com"
                  className="w-full rounded-md border border-border-strong bg-app px-2.5 py-1.5 text-small text-text-primary placeholder:text-text-quaternary focus:outline-none focus:ring-1 focus:ring-accent"
                />
                {domains.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDomains((arr) => arr.filter((_, idx) => idx !== i))}
                    aria-label="Remove domain"
                    className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-mini text-text-secondary hover:bg-row-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || busy}
            className="rounded-md bg-accent px-3 py-1.5 text-mini font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-mini font-semibold text-text-primary">{label}</label>
      {children}
    </div>
  );
}

function LogoRow({
  logoUrl,
  onFile,
  onClear,
}: {
  logoUrl: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-2 flex items-start gap-3">
      <label className="relative inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-md border border-dashed border-border-strong bg-app text-text-tertiary hover:bg-row-hover">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Customer logo" className="h-full w-full rounded-md object-cover" />
        ) : (
          <Upload size={14} />
        )}
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>
      <div className="flex flex-col">
        <span className="text-small font-semibold text-text-primary">Logo</span>
        <span className="text-mini text-text-tertiary">Recommended size is 128 x 128px.</span>
        {logoUrl && (
          <button
            type="button"
            onClick={onClear}
            className="mt-1 self-start text-mini text-text-tertiary hover:text-text-secondary"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

function SelectButton({
  value,
  onChange,
  options,
  renderValue,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  renderValue: (opt: SelectOption | undefined) => React.ReactNode;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Popover
      align="start"
      width={220}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "flex w-full items-center justify-between rounded-md border border-border-strong bg-app px-2.5 py-1.5 text-small text-text-primary hover:bg-row-hover",
            open && "ring-1 ring-accent",
          )}
        >
          {renderValue(current)}
          <ChevronDown size={11} className="text-text-tertiary" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                close();
              }}
              className={clsx(
                "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small hover:bg-row-hover",
                opt.value === value ? "text-text-primary" : "text-text-secondary",
              )}
            >
              {opt.color && (
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: opt.color }} />
              )}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

function OwnerSelect({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: Member | null;
  onChange: (m: Member | null) => void;
}) {
  return (
    <Popover
      align="start"
      width={260}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "flex w-full items-center justify-between rounded-md border border-border-strong bg-app px-2.5 py-1.5 text-small text-text-primary hover:bg-row-hover",
            open && "ring-1 ring-accent",
          )}
        >
          <span className="flex items-center gap-2">
            {value ? (
              <Avatar initials={value.initials} color={value.color} size={16} />
            ) : (
              <span className="inline-block h-4 w-4 rounded-pill border border-dashed border-border-strong" />
            )}
            <span>{value ? value.name : "No owner"}</span>
          </span>
          <ChevronDown size={11} className="text-text-tertiary" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              close();
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
          >
            <span className="inline-block h-4 w-4 rounded-pill border border-dashed border-border-strong" />
            <span>No owner</span>
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m);
                close();
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
            >
              <Avatar initials={m.initials} color={m.color} size={16} />
              <span className="flex-1 truncate">{m.name}</span>
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
