"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { Popover } from "@/components/popover";

export interface HiddenRailColumn {
  /** Stable key for React + reveal callback. */
  key: string;
  /** Column display label (e.g. "Backlog", "Completed"). */
  name: string;
  /** Count shown on the right of the row (issues or projects in the column). */
  count: number;
  /** Status / state glyph rendered on the left of the row. */
  icon: ReactNode;
}

/**
 * Right-side rail listing columns the user has hidden (or that auto-hide
 * because they are empty). Each row has a 3-dot popover with a "Show" action
 * that calls `onReveal(key)`. Shared by both the issues board (BoardView)
 * and the projects board (ProjectsBoardView).
 */
export function HiddenColumnsRail({
  columns,
  open,
  onToggle,
  onReveal,
}: {
  columns: HiddenRailColumn[];
  open: boolean;
  onToggle: () => void;
  onReveal: (key: string) => void;
}) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col px-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-[40px] shrink-0 items-center gap-1.5 px-2 text-small text-text-secondary"
      >
        <ChevronDown
          size={13}
          className={clsx("transition-transform text-text-tertiary", !open && "-rotate-90")}
        />
        <span className="font-medium">Hidden columns</span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 overflow-y-auto py-1">
          {columns.map((c) => (
            <HiddenColumnRow key={c.key} column={c} onReveal={() => onReveal(c.key)} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function HiddenColumnRow({
  column: c,
  onReveal,
}: {
  column: HiddenRailColumn;
  onReveal: () => void;
}) {
  return (
    <li className="group/row flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-small text-text-secondary backdrop-blur-md transition-colors hover:bg-white/[0.05]">
      {c.icon}
      <span className="truncate text-text-primary">{c.name}</span>
      <span className="ml-auto text-text-tertiary">{c.count}</span>
      <Popover
        align="end"
        width={160}
        surface="glass"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label={`Hidden column actions for ${c.name}`}
            title="Column actions"
            className={clsx(
              "rounded-md p-1 text-text-tertiary transition-colors hover:bg-white/10 hover:text-text-secondary",
              open ? "bg-white/10 text-text-secondary opacity-100" : "opacity-0 group-hover/row:opacity-100",
            )}
          >
            <MoreHorizontal size={13} />
          </button>
        )}
      >
        {({ close }) => (
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onReveal();
                close();
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
            >
              <span>Show</span>
            </button>
          </div>
        )}
      </Popover>
    </li>
  );
}
