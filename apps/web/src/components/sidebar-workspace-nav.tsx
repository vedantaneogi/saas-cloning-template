"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  BarChart3,
  Compass,
  FileText,
  Folders,
  Layers,
  Map as MapIcon,
  MoreHorizontal,
  Settings,
  Users,
} from "lucide-react";
import { CustomizeSidebarModal } from "@/components/customize-sidebar-modal";
import { Popover } from "@/components/popover";
import { useSidebarPrefs, shouldShowAtAll, shouldShowInMain, type Visibility } from "@/lib/sidebar-prefs";

type Item = {
  key: string;
  href: (slug: string) => string;
  icon: ReactNode;
  label: string;
  // Match-paths for active styling (uses pathname.startsWith / endsWith).
  isActive: (path: string, slug: string) => boolean;
  // Badge count — items configured "badged" appear only when this is > 0.
  badge?: number;
};

const ITEMS: Item[] = [
  {
    key: "views",
    href: (s) => `/${s}/views`,
    icon: <Layers size={14} />,
    label: "Views",
    isActive: (p, s) => p === `/${s}/views`,
  },
  {
    key: "initiatives",
    href: (s) => `/${s}/initiatives`,
    icon: <Compass size={14} />,
    label: "Initiatives",
    isActive: (p) => p.endsWith("/initiatives") || p.includes("/initiative/"),
  },
  {
    key: "roadmap",
    href: (s) => `/${s}/roadmap`,
    icon: <MapIcon size={14} />,
    label: "Roadmap",
    isActive: (p) => p.endsWith("/roadmap"),
  },
  {
    key: "projects",
    href: (s) => `/${s}/projects`,
    icon: <Folders size={14} />,
    label: "Projects",
    isActive: (p, s) => p === `/${s}/projects`,
  },
  {
    key: "documents",
    href: (s) => `/${s}/documents`,
    icon: <FileText size={14} />,
    label: "Documents",
    isActive: (p) => p.endsWith("/documents") || p.includes("/document/"),
  },
  {
    key: "customer_requests",
    href: (s) => `/${s}/customer-requests`,
    icon: <Users size={14} />,
    label: "Customer requests",
    isActive: (p) => p.endsWith("/customer-requests"),
  },
  {
    key: "custom_charts",
    href: (s) => `/${s}/insights/custom`,
    icon: <BarChart3 size={14} />,
    label: "Custom charts",
    isActive: (p) => p.endsWith("/insights/custom"),
  },
  {
    key: "teams",
    href: (s) => `/${s}/teams`,
    icon: <Folders size={14} />,
    label: "Teams",
    isActive: (p, s) => p === `/${s}/teams`,
  },
  {
    key: "members",
    href: (s) => `/${s}/members`,
    icon: <Users size={14} />,
    label: "Members",
    isActive: (p, s) => p === `/${s}/members`,
  },
];

export function SidebarWorkspaceNav({
  workspaceSlug,
  pathname,
}: {
  workspaceSlug: string;
  pathname: string;
}) {
  const { prefs, setOverflowPin } = useSidebarPrefs(workspaceSlug);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Bucket: main (visible) vs more (collapsed). Items with "never" still
  // appear in More so the user can find them; "Customize sidebar" is the
  // canonical way to actually hide them — Linear's pattern.
  //
  // The overflow_pin slot holds the most recently visited More item so
  // it sits beside the always-show entries without being permanently
  // promoted. Picking a different More item replaces it (single slot).
  const overflowPin = (prefs as Record<string, unknown>).overflow_pin as string | undefined;
  const mainItems: Item[] = [];
  const moreItems: Item[] = [];
  for (const item of ITEMS) {
    const vis = (prefs[item.key] as Visibility) ?? "never";
    const inMain = shouldShowInMain(vis, item.badge ?? 0) || item.key === overflowPin;
    if (inMain) mainItems.push(item);
    else if (shouldShowAtAll(vis) || vis === "never") moreItems.push(item);
  }

  return (
    <div>
      {mainItems.map((item) => {
        const active = item.isActive(pathname, workspaceSlug);
        return (
          <Link
            key={item.key}
            href={item.href(workspaceSlug)}
            className={clsx(
              "group flex h-[30px] items-center gap-2 rounded-md px-2 text-small leading-none transition-colors",
              active ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover",
            )}
          >
            <span className="shrink-0 text-text-tertiary">{item.icon}</span>
            <span className="flex-1 truncate">{item.label}</span>
          </Link>
        );
      })}

      <Popover
        align="start"
        width={220}
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            className={clsx(
              "flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-small leading-none transition-colors",
              open ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover",
            )}
          >
            <MoreHorizontal size={14} className="text-text-tertiary" />
            <span className="flex-1 truncate text-left">More</span>
          </button>
        )}
      >
        {({ close }) => (
          <div className="py-1">
            {moreItems.map((item) => (
              <Link
                key={item.key}
                href={item.href(workspaceSlug)}
                onClick={() => {
                  // Drop the clicked item into the single overflow-pin
                  // slot. Picking another More item later replaces it,
                  // so the main list keeps a stable shape (Linear pattern).
                  setOverflowPin(item.key);
                  close();
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-small text-text-secondary hover:bg-row-hover"
              >
                <span className="shrink-0 text-text-tertiary">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
              </Link>
            ))}
            {moreItems.length > 0 && <hr className="my-1 border-border-subtle" />}
            <button
              type="button"
              onClick={() => { close(); setCustomizeOpen(true); }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
            >
              <Settings size={13} className="text-text-tertiary" />
              <span>Customize sidebar</span>
            </button>
          </div>
        )}
      </Popover>

      <CustomizeSidebarModal
        workspaceSlug={workspaceSlug}
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
      />
    </div>
  );
}
