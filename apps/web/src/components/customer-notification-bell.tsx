"use client";

import { Bell } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";
import { useCustomerPrefs } from "@/lib/customer-prefs";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Trailing bell on /customer/[slug]. Opens a popover matching image
 * #27 with three toggles that control whether the user gets inbox
 * notifications for events on this customer:
 *   - A request is added
 *   - A request is marked as important
 *   - A requested issue or project is completed or canceled
 * State is persisted per (workspaceSlug, customerSlug) in localStorage
 * (customer-prefs.ts) — the toggles wire to the eventual server-side
 * subscription table once that lands.
 */
export function CustomerNotificationBell({
  workspaceSlug,
  customerSlug,
}: {
  workspaceSlug: string;
  customerSlug: string;
}) {
  const { prefs, update } = useCustomerPrefs(workspaceSlug, customerSlug);
  const hydrated = useHydrated();
  const anyOn =
    hydrated &&
    (prefs.notify_request_added || prefs.notify_request_important || prefs.notify_issue_completed);

  return (
    <Popover
      align="end"
      width={360}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Notification settings"
          title="Notification settings"
          className={clsx(
            "rounded-md p-1 transition-colors",
            open || anyOn
              ? "bg-row-hover text-text-secondary"
              : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
          )}
        >
          <Bell size={13} strokeWidth={1.75} />
        </button>
      )}
    >
      {() => (
        <div className="px-3 py-3">
          <h3 className="px-1 pb-2 text-small font-semibold text-text-primary">
            Send inbox notifications for
          </h3>
          <NotifRow
            label="A request is added"
            value={prefs.notify_request_added}
            onChange={(v) => update({ notify_request_added: v })}
          />
          <NotifRow
            label="A request is marked as important"
            value={prefs.notify_request_important}
            onChange={(v) => update({ notify_request_important: v })}
          />
          <NotifRow
            label="A requested issue or project is completed or canceled"
            value={prefs.notify_issue_completed}
            onChange={(v) => update({ notify_issue_completed: v })}
          />
        </div>
      )}
    </Popover>
  );
}

function NotifRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
    >
      <span className="flex-1">{label}</span>
      <span
        className={clsx(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
          value ? "border-accent bg-accent" : "border-border-strong bg-input",
        )}
      >
        {value && (
          <svg width="10" height="10" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}
