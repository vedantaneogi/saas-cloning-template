"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Team } from "@/lib/api";

export function SettingsNav({ workspaceSlug, teams }: { workspaceSlug: string; teams: Team[] }) {
  const pathname = usePathname();
  const base = `/${workspaceSlug}/settings`;

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col overflow-y-auto border-r border-border-subtle bg-elevated/30 px-3 py-4">
      <h2 className="mb-1 px-2 text-micro font-medium uppercase tracking-[0.06em] text-text-quaternary">
        Workspace
      </h2>
      <NavLink href={`${base}/members`} label="Members" pathname={pathname} />
      <NavLink href={`${base}/labels`} label="Labels" pathname={pathname} />
      <NavLink href={`${base}/teams`} label="Teams" pathname={pathname} />
      <NavLink href={`${base}/templates`} label="Templates" pathname={pathname} />
      <NavLink href={`${base}/automations`} label="Automations" pathname={pathname} />
      <NavLink href={`${base}/notifications`} label="Notifications" pathname={pathname} />
      <NavLink href={`${base}/integrations`} label="Integrations" pathname={pathname} />

      <h2 className="mb-1 mt-5 px-2 text-micro font-medium uppercase tracking-[0.06em] text-text-quaternary">
        Teams
      </h2>
      {[...teams]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => {
          const active = pathname.startsWith(`${base}/team/${t.key}`);
          return (
            <Link
              key={t.key}
              href={`${base}/team/${t.key}`}
              className={clsx(
                "flex h-[28px] items-center gap-2 rounded-md px-2 text-small",
                active
                  ? "bg-row-selected text-text-primary"
                  : "text-text-secondary hover:bg-row-hover",
              )}
            >
              <span
                className="inline-block h-[10px] w-[10px] shrink-0 rounded-sm"
                style={{ background: t.icon_color }}
              />
              <span className="truncate">{t.name}</span>
            </Link>
          );
        })}
    </aside>
  );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={clsx(
        "flex h-[28px] items-center rounded-md px-2 text-small",
        active ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover"
      )}
    >
      {label}
    </Link>
  );
}
