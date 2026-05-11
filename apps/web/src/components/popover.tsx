"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

export function Popover({
  trigger,
  children,
  align = "start",
  width,
}: {
  trigger: (props: { open: boolean; toggle: () => void; close: () => void }) => ReactNode;
  children: (api: { close: () => void }) => ReactNode;
  align?: "start" | "end";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o), close: () => setOpen(false) })}
      {open && (
        <div
          className={clsx(
            "absolute z-40 mt-1 overflow-hidden rounded-md border border-border-default bg-elevated text-small shadow-popover",
            align === "end" ? "right-0" : "left-0"
          )}
          style={{ width }}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

export function PopoverList({ children }: { children: ReactNode }) {
  return <ul className="max-h-64 overflow-y-auto py-1">{children}</ul>;
}

export function PopoverItem({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover",
          active && "bg-row-selected text-text-primary"
        )}
      >
        {children}
      </button>
    </li>
  );
}
