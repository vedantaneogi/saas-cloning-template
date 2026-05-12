"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Team } from "@/lib/api";

export function SettingsNav({ workspaceSlug, teams }: { workspaceSlug: string; teams: Team[] }) {
  const pathname = usePathname();
  const base = `/${workspaceSlug}/settings`;

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border-subtle bg-elevated/30 p-4">
      <h2 className="mb-3 px-1 text-mini font-medium uppercase tracking-wider text-text-tertiary">
        Workspace
      </h2>
      <NavLink href={`${base}/members`} label="Members" pathname={pathname} />
      <NavLink href={`${base}/labels`} label="Labels" pathname={pathname} />
      <NavLink href={`${base}/teams`} label="Teams" pathname={pathname} />
      <NavLink href={`${base}/templates`} label="Templates" pathname={pathname} />
      <NavLink href={`${base}/automations`} label="Automations" pathname={pathname} />
      <NavLink href={`${base}/notifications`} label="Notifications" pathname={pathname} />

      <h2 className="mb-3 mt-5 px-1 text-mini font-medium uppercase tracking-wider text-text-tertiary">
        Per-team
      </h2>
      {[...teams]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => (
          <div key={t.key} className="mb-1">
            <Link
              href={`${base}/team/${t.key}`}
              className={clsx(
                "flex items-center gap-2 rounded-md px-2 py-1 text-small",
                pathname.startsWith(`${base}/team/${t.key}`)
                  ? "bg-row-selected text-text-primary"
                  : "text-text-secondary hover:bg-row-hover"
              )}
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm"
                style={{ background: t.icon_color }}
              />
              {t.name}
            </Link>
          </div>
        ))}
    </aside>
  );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={clsx(
        "mb-0.5 block rounded-md px-2 py-1 text-small",
        active ? "bg-row-selected text-text-primary" : "text-text-secondary hover:bg-row-hover"
      )}
    >
      {label}
    </Link>
  );
}
