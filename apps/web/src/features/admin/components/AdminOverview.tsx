"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  primary: "#260559",
  text: "rgba(19,0,50,0.9)",
  secondary: "rgba(19,0,50,0.6)",
  border: "rgba(19,0,50,0.1)",
  active: "#4C00FF",
  font: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface NotificationItem {
  id: string;
  title: string;
  description: string;
  date: string;
  type: "envelope" | "system" | "billing";
  unread: boolean;
}

interface AdminOverviewProps {
  onNavigate?: (item: string) => void;
}

// ─── Sample notifications (last 3 months window) ─────────────────────────────
const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "Envelope completed",
    description: "NDA — Acme Corp has been signed by all recipients.",
    date: "Apr 28, 2026",
    type: "envelope",
    unread: true,
  },
  {
    id: "n2",
    title: "Envelope declined",
    description: "Service Agreement was declined by John Smith.",
    date: "Apr 22, 2026",
    type: "envelope",
    unread: true,
  },
  {
    id: "n3",
    title: "Envelope viewed",
    description: "Q1 Contract was opened by sarah@partner.com.",
    date: "Apr 15, 2026",
    type: "envelope",
    unread: false,
  },
  {
    id: "n4",
    title: "System update",
    description: "New eSignature features are now available in your account.",
    date: "Mar 31, 2026",
    type: "system",
    unread: false,
  },
  {
    id: "n5",
    title: "Trial ending soon",
    description: "Your free trial ends in 15 days. Upgrade to keep sending.",
    date: "Mar 18, 2026",
    type: "billing",
    unread: false,
  },
];

const TYPE_OPTIONS = ["All Types", "Envelope", "System", "Billing"] as const;
type TypeFilter = (typeof TYPE_OPTIONS)[number];

// ─── Notification type badge ──────────────────────────────────────────────────
function TypeBadge({ type }: { type: NotificationItem["type"] }) {
  const map: Record<NotificationItem["type"], { label: string; bg: string; color: string }> = {
    envelope: { label: "Envelope", bg: "rgba(76,0,255,0.08)", color: "#4C00FF" },
    system: { label: "System", bg: "rgba(19,0,50,0.06)", color: "rgba(19,0,50,0.6)" },
    billing: { label: "Billing", bg: "rgba(255,109,0,0.1)", color: "#E65100" },
  };
  const s = map[type];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: s.bg, color: s.color, fontFamily: T.font }}
    >
      {s.label}
    </span>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
      style={{
        background: "rgba(19,0,50,0.05)",
        color: T.secondary,
        border: `1px solid ${T.border}`,
        fontFamily: T.font,
      }}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none"
          aria-label={`Remove ${label} filter`}
        >
          ✕
        </button>
      )}
    </span>
  );
}

// ─── Settings gear icon ───────────────────────────────────────────────────────
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22l-1.92 3.32c-.12.22-.07.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z" />
    </svg>
  );
}

// ─── Chevron icon ─────────────────────────────────────────────────────────────
function ChevronDown() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Account Summary cards ────────────────────────────────────────────────────
function AccountSummary() {
  const cards = [
    { label: "Plan", value: "Free Trial" },
    { label: "Days Remaining", value: "15" },
    { label: "Users", value: "1" },
  ];

  return (
    <div className="flex gap-4 mb-6 flex-wrap">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex-1 min-w-[120px] rounded px-4 py-3"
          style={{
            border: `1px solid ${T.border}`,
            background: "#fff",
          }}
        >
          <p
            className="text-xs mb-1"
            style={{ color: "rgba(19,0,50,0.4)", fontFamily: T.font }}
          >
            {card.label}
          </p>
          <p
            className="text-sm font-semibold"
            style={{ color: T.text, fontFamily: T.font }}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Find a Setting / User card ───────────────────────────────────────────────
function FindCard({ onNavigate }: { onNavigate?: (item: string) => void }) {
  const [settingsSearch, setSettingsSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userSearchType, setUserSearchType] = useState<"Name" | "Email">("Name");

  const SETTINGS_RESULTS = [
    { label: "Plan and Billing", section: "plan" },
    { label: "Account Profile", section: "profile" },
    { label: "Security Settings", section: "security" },
    { label: "Regional Settings", section: "regional" },
    { label: "Branding", section: "branding" },
    { label: "Stamps", section: "stamps" },
    { label: "Updates", section: "updates" },
  ];

  const filteredSettings = settingsSearch
    ? SETTINGS_RESULTS.filter((s) =>
        s.label.toLowerCase().includes(settingsSearch.toLowerCase()),
      )
    : [];

  const inputClass =
    "w-full px-3 py-2 text-sm rounded outline-none transition-colors bg-white";
  const inputStyle = {
    border: `1px solid ${T.border}`,
    color: T.text,
    fontFamily: T.font,
  };

  return (
    <div
      className="rounded mb-6"
      style={{ border: `1px solid ${T.border}` }}
    >
      <div className="px-5 py-4 space-y-5">
        {/* Find a Setting row */}
        <div className="flex items-center gap-3 flex-wrap">
          <label
            className="text-sm font-medium whitespace-nowrap w-28 flex-shrink-0"
            style={{ color: T.text, fontFamily: T.font }}
          >
            Find a Setting
          </label>
          <div className="flex-1 min-w-0 relative">
            <input
              type="text"
              placeholder="Search settings…"
              value={settingsSearch}
              onChange={(e) => setSettingsSearch(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
            {filteredSettings.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded bg-white z-10 shadow-md overflow-hidden"
                style={{ border: `1px solid ${T.border}` }}
              >
                {filteredSettings.map((result) => (
                  <button
                    key={result.section}
                    onClick={() => {
                      onNavigate?.(result.section);
                      setSettingsSearch("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[rgba(76,0,255,0.05)]"
                    style={{ color: T.text, fontFamily: T.font }}
                  >
                    {result.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Find a User row */}
        <div className="flex items-center gap-3 flex-wrap">
          <label
            className="text-sm font-medium whitespace-nowrap w-28 flex-shrink-0"
            style={{ color: T.text, fontFamily: T.font }}
          >
            Find a User
          </label>
          {/* Name/Email dropdown */}
          <div className="relative">
            <select
              value={userSearchType}
              onChange={(e) => setUserSearchType(e.target.value as "Name" | "Email")}
              className="appearance-none pl-3 pr-7 py-2 text-sm rounded outline-none bg-white cursor-pointer"
              style={{
                border: `1px solid ${T.border}`,
                color: T.text,
                fontFamily: T.font,
              }}
            >
              <option value="Name">Name</option>
              <option value="Email">Email</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-50">
              <ChevronDown />
            </span>
          </div>
          {/* Search input */}
          <input
            type="text"
            placeholder={`Search by ${userSearchType.toLowerCase()}…`}
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className={`${inputClass} flex-1 min-w-0`}
            style={inputStyle}
          />
          {/* Search button */}
          <Button
            variant="primary"
            size="sm"
            style={{
              background: T.primary,
              fontFamily: T.font,
            }}
          >
            Search
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications section ────────────────────────────────────────────────────
function NotificationsSection() {
  const [dateFilter, setDateFilter] = useState<"Last 3 Months" | "Last Month" | "Last Week">(
    "Last 3 Months",
  );
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All Types");
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(SAMPLE_NOTIFICATIONS);

  const filtered = items.filter((n) => {
    if (typeFilter === "All Types") return true;
    return n.type === typeFilter.toLowerCase();
  });

  const clearAll = () => {
    setDateFilter("Last 3 Months");
    setTypeFilter("All Types");
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    zIndex: 20,
    background: "#fff",
    border: `1px solid ${T.border}`,
    borderRadius: 4,
    minWidth: 160,
    boxShadow: "0 4px 12px rgba(19,0,50,0.1)",
  };

  return (
    <section>
      {/* Section header + filters */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2
          className="text-sm font-semibold"
          style={{ color: T.text, fontFamily: T.font }}
        >
          Notifications
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date filter chip */}
          <div className="relative">
            <FilterChip
              label={`Date: ${dateFilter} ✕`}
              onRemove={() => setDateFilter("Last 3 Months")}
            />
            <button
              onClick={() => {
                setShowDateMenu((v) => !v);
                setShowTypeMenu(false);
              }}
              className="absolute inset-0 opacity-0"
              aria-label="Change date filter"
            />
            {showDateMenu && (
              <div style={dropdownStyle}>
                {(["Last Week", "Last Month", "Last 3 Months"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setDateFilter(opt);
                      setShowDateMenu(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-[rgba(76,0,255,0.05)] transition-colors"
                    style={{ color: T.text, fontFamily: T.font }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTypeMenu((v) => !v);
                setShowDateMenu(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: "rgba(19,0,50,0.05)",
                color: T.secondary,
                border: `1px solid ${T.border}`,
                fontFamily: T.font,
              }}
            >
              {typeFilter}
              <ChevronDown />
            </button>
            {showTypeMenu && (
              <div style={dropdownStyle}>
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setTypeFilter(opt);
                      setShowTypeMenu(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-[rgba(76,0,255,0.05)] transition-colors"
                    style={{
                      color: typeFilter === opt ? T.active : T.text,
                      fontWeight: typeFilter === opt ? 600 : 400,
                      fontFamily: T.font,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear All */}
          <button
            onClick={clearAll}
            className="text-xs px-2.5 py-1 rounded transition-colors hover:bg-[rgba(19,0,50,0.05)]"
            style={{ color: T.secondary, fontFamily: T.font }}
          >
            Clear All
          </button>

          {/* Mark all read */}
          {items.some((n) => n.unread) && (
            <button
              onClick={markAllRead}
              className="text-xs px-2.5 py-1 rounded transition-colors hover:bg-[rgba(19,0,50,0.05)]"
              style={{ color: T.active, fontFamily: T.font }}
            >
              Mark all read
            </button>
          )}

          {/* Settings gear */}
          <button
            className="p-1.5 rounded transition-colors hover:bg-[rgba(19,0,50,0.05)]"
            style={{ color: "rgba(19,0,50,0.4)" }}
            title="Notification settings"
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div
        className="rounded overflow-hidden"
        style={{ border: `1px solid ${T.border}` }}
      >
        {filtered.length === 0 ? (
          <div
            className="px-5 py-10 text-sm text-center"
            style={{ color: T.secondary, fontFamily: T.font }}
          >
            No notifications for the selected filters.
          </div>
        ) : (
          filtered.map((notif, idx) => (
            <div
              key={notif.id}
              className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[rgba(19,0,50,0.02)]"
              style={{
                borderBottom:
                  idx < filtered.length - 1 ? `1px solid ${T.border}` : undefined,
                background: notif.unread ? "rgba(76,0,255,0.025)" : undefined,
              }}
            >
              {/* Unread dot */}
              <span
                className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full"
                style={{
                  background: notif.unread ? T.active : "transparent",
                  border: notif.unread ? "none" : `1.5px solid ${T.border}`,
                }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: T.text, fontFamily: T.font }}
                  >
                    {notif.title}
                  </span>
                  <TypeBadge type={notif.type} />
                </div>
                <p
                  className="text-sm leading-snug"
                  style={{ color: T.secondary, fontFamily: T.font }}
                >
                  {notif.description}
                </p>
              </div>

              {/* Date */}
              <span
                className="text-xs flex-shrink-0 mt-0.5"
                style={{ color: "rgba(19,0,50,0.35)", fontFamily: T.font }}
              >
                {notif.date}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function AdminOverview({ onNavigate }: AdminOverviewProps) {
  return (
    <div
      className="flex-1 overflow-y-auto bg-white"
      style={{ fontFamily: T.font }}
    >
      <div className="px-8 py-6 max-w-3xl">
        {/* Page heading */}
        <h1
          className="mb-5"
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: T.text,
            fontFamily: T.font,
            lineHeight: 1.3,
          }}
        >
          Find a Setting or User
        </h1>

        {/* Account summary strip */}
        <AccountSummary />

        {/* Search card */}
        <FindCard onNavigate={onNavigate} />

        {/* Notifications */}
        <NotificationsSection />
      </div>
    </div>
  );
}
