"use client";

import { Folders, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Popover } from "@/components/popover";
import type { Team } from "@/lib/api";

/**
 * Teams cell on the Members table — shows a compact pill summary of the
 * member's team keys; click opens a popover listing each team with its
 * colored icon, mirroring how Linear surfaces this on the Members page.
 *
 * `teamKeys` is the member's actual TeamMembership keys (from the API);
 * `allTeams` is the workspace-wide team list so we can resolve each key
 * back to its `icon_color` and full name.
 */
export function MemberTeamsCell({
  workspaceSlug,
  teamKeys,
  allTeams,
}: {
  workspaceSlug: string;
  teamKeys: string[];
  allTeams: Team[];
}) {
  if (!teamKeys.length) {
    return <span className="text-mini text-text-tertiary">—</span>;
  }
  const teamsByKey = new Map(allTeams.map((t) => [t.key, t]));
  const resolved = teamKeys
    .map((k) => teamsByKey.get(k))
    .filter((t): t is Team => Boolean(t));

  return (
    <Popover
      align="end"
      width={200}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-mini text-text-secondary hover:bg-row-hover ${open ? "bg-row-hover" : ""}`}
        >
          <UserIcon size={11} className="text-text-tertiary" />
          <span>{teamKeys.join(", ")}</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {resolved.map((t) => (
            <Link
              key={t.key}
              href={`/${workspaceSlug}/team/${t.key}/active`}
              onClick={close}
              className="flex items-center gap-2 px-2.5 py-1.5 text-small text-text-secondary hover:bg-row-hover"
            >
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
                style={{ background: t.icon_color }}
              >
                <Folders size={9} className="text-white/85" />
              </span>
              <span className="truncate">{t.name}</span>
            </Link>
          ))}
        </div>
      )}
    </Popover>
  );
}
