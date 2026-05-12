"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

export function Popover({
  trigger,
  children,
  align = "start",
  width,
  placement,
}: {
  trigger: (props: { open: boolean; toggle: () => void; close: () => void }) => ReactNode;
  children: (api: { close: () => void }) => ReactNode;
  align?: "start" | "end";
  width?: number;
  /**
   * Forces a placement direction. Without it, the popover auto-flips based on
   * available viewport space — which can be wrong when the trigger lives at
   * the bottom of a modal (plenty of viewport space below, but the popover
   * appears disconnected outside the modal). Set "up" to anchor above.
   */
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<"down" | "up">(placement ?? "down");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

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

  // Flip up when there's not enough room below the trigger, OR when the
  // caller has forced a direction via `placement`.
  useLayoutEffect(() => {
    if (!open) return;
    if (placement) {
      setDrop(placement);
      return;
    }
    const t = triggerRef.current;
    const p = popRef.current;
    if (!t || !p) return;
    const tr = t.getBoundingClientRect();
    const ph = p.offsetHeight;
    const spaceBelow = window.innerHeight - tr.bottom;
    const spaceAbove = tr.top;
    setDrop(spaceBelow < ph + 16 && spaceAbove > spaceBelow ? "up" : "down");
  }, [open, placement]);

  return (
    <div className="relative inline-block" ref={ref}>
      <div ref={triggerRef}>
        {trigger({ open, toggle: () => setOpen((o) => !o), close: () => setOpen(false) })}
      </div>
      {open && (
        <div
          ref={popRef}
          className={clsx(
            "absolute z-40 overflow-hidden rounded-md border border-border-default bg-elevated text-small shadow-popover",
            align === "end" ? "right-0" : "left-0",
            drop === "up" ? "bottom-full mb-1" : "mt-1"
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
