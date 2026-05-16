"use client";

import { GripVertical, Inbox, CircleUser, FileText, Layers, Compass, Map as MapIcon, Folders, Users, BarChart3, Folder, Pencil, X } from "lucide-react";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import { useSidebarPrefs, type Visibility, type BadgeStyle } from "@/lib/sidebar-prefs";

const VIS_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "always", label: "Always show" },
  { value: "badged", label: "Show when badged" },
  { value: "never", label: "Don't show" },
];

const BADGE_OPTIONS: { value: BadgeStyle; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "dot", label: "Dot" },
];

const PERSONAL: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "inbox", label: "Inbox", icon: <Inbox size={13} className="text-text-tertiary" /> },
  { key: "my_issues", label: "My issues", icon: <CircleUser size={13} className="text-text-tertiary" /> },
  { key: "drafts", label: "Drafts", icon: <Pencil size={13} className="text-text-tertiary" /> },
];

const WORKSPACE: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "views", label: "Views", icon: <Layers size={13} className="text-text-tertiary" /> },
  { key: "projects", label: "Projects", icon: <Folder size={13} className="text-text-tertiary" /> },
  { key: "initiatives", label: "Initiatives", icon: <Compass size={13} className="text-text-tertiary" /> },
  { key: "roadmap", label: "Roadmap", icon: <MapIcon size={13} className="text-text-tertiary" /> },
  { key: "documents", label: "Documents", icon: <FileText size={13} className="text-text-tertiary" /> },
  { key: "customer_requests", label: "Customer requests", icon: <Users size={13} className="text-text-tertiary" /> },
  { key: "custom_charts", label: "Custom charts", icon: <BarChart3 size={13} className="text-text-tertiary" /> },
  { key: "teams", label: "Teams", icon: <Folders size={13} className="text-text-tertiary" /> },
  { key: "members", label: "Members", icon: <Users size={13} className="text-text-tertiary" /> },
];

export function CustomizeSidebarModal({
  workspaceSlug,
  open,
  onClose,
}: {
  workspaceSlug: string;
  open: boolean;
  onClose: () => void;
}) {
  const { prefs, setItem, setBadgeStyle } = useSidebarPrefs(workspaceSlug);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-start justify-center bg-black/40 pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-[92vw] rounded-xl bg-elevated shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3.5">
          <h2 className="text-default font-semibold text-text-primary">Customize sidebar</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary" aria-label="Close">
            <X size={14} />
          </button>
        </header>

        <div className="px-5 pb-4">
          <BadgeStyleRow
            value={(prefs.badge_style as BadgeStyle) ?? "count"}
            onChange={setBadgeStyle}
          />
        </div>

        <Section title="Personal">
          {PERSONAL.map((item) => (
            <ItemRow
              key={item.key}
              icon={item.icon}
              label={item.label}
              value={(prefs[item.key] as Visibility) ?? "always"}
              onChange={(v) => setItem(item.key, v)}
            />
          ))}
        </Section>

        <Section title="Workspace">
          {WORKSPACE.map((item) => (
            <ItemRow
              key={item.key}
              icon={item.icon}
              label={item.label}
              value={(prefs[item.key] as Visibility) ?? "never"}
              onChange={(v) => setItem(item.key, v)}
            />
          ))}
        </Section>

        <div className="h-3" />
      </div>
    </div>
  );
}

function BadgeStyleRow({
  value,
  onChange,
}: {
  value: BadgeStyle;
  onChange: (v: BadgeStyle) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2.5">
      <div>
        <span className="text-small text-text-primary">Default badge style</span>
      </div>
      <Popover
        align="end"
        width={160}
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-mini text-text-secondary hover:bg-row-hover"
          >
            <span className="text-text-tertiary">{value === "count" ? "1" : "•"}</span>
            <span>{BADGE_OPTIONS.find((b) => b.value === value)?.label ?? "Count"}</span>
            <span className="text-text-tertiary">▾</span>
          </button>
        )}
      >
        {({ close }) => (
          <PopoverList>
            {BADGE_OPTIONS.map((b) => (
              <PopoverItem
                key={b.value}
                active={b.value === value}
                onClick={() => { onChange(b.value); close(); }}
              >
                <span>{b.label}</span>
              </PopoverItem>
            ))}
          </PopoverList>
        )}
      </Popover>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="px-5 pb-2 pt-2">
        <h3 className="text-small font-medium text-text-primary">{title}</h3>
      </div>
      <div className="mx-5 mb-3 overflow-hidden rounded-lg border border-border-subtle">
        {children}
      </div>
    </>
  );
}

function ItemRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border-subtle px-3 py-2 last:border-b-0">
      <GripVertical size={12} className="text-text-quaternary" />
      {icon}
      <span className="flex-1 text-small text-text-secondary">{label}</span>
      <Popover
        align="end"
        width={180}
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-mini text-text-secondary hover:bg-row-hover"
          >
            <span>{VIS_OPTIONS.find((v) => v.value === value)?.label ?? "Always show"}</span>
            <span className="text-text-tertiary">▾</span>
          </button>
        )}
      >
        {({ close }) => (
          <PopoverList>
            {VIS_OPTIONS.map((opt) => (
              <PopoverItem
                key={opt.value}
                active={value === opt.value}
                onClick={() => { onChange(opt.value); close(); }}
              >
                <span>{opt.label}</span>
              </PopoverItem>
            ))}
          </PopoverList>
        )}
      </Popover>
    </div>
  );
}
