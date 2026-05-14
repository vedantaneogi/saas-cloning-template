"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  // Fixed-position coords resolved from the trigger's bounding box. We portal
  // the popover to document.body so it escapes any modal / overflow:hidden /
  // stacking-context that would otherwise clip or hide it.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Outside-click + Escape. The popover lives in a portal, so we have to
  // check BOTH the trigger wrapper AND the popover element when deciding
  // whether the click was outside.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
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

  // Position the popover in viewport coords (`position: fixed`). Recomputes
  // on open, on scroll (any ancestor), and on resize. We anchor the popover
  // by its top-left when dropping down, top-right when align="end".
  useLayoutEffect(() => {
    if (!open) return;
    function recompute() {
      const t = triggerRef.current;
      const p = popRef.current;
      if (!t || !p) return;
      const tr = t.getBoundingClientRect();
      const ph = p.offsetHeight;
      const pw = p.offsetWidth;
      // auto-flip vertically unless caller pinned the placement
      const spaceBelow = window.innerHeight - tr.bottom;
      const spaceAbove = tr.top;
      const drop =
        placement ??
        (spaceBelow < ph + 16 && spaceAbove > spaceBelow ? "up" : "down");

      let top = drop === "down" ? tr.bottom + 4 : tr.top - ph - 4;
      let left = align === "end" ? tr.right - pw : tr.left;
      // keep inside the viewport with a small gutter
      const gutter = 8;
      if (left < gutter) left = gutter;
      if (left + pw > window.innerWidth - gutter) {
        left = window.innerWidth - pw - gutter;
      }
      if (top < gutter) top = gutter;
      if (top + ph > window.innerHeight - gutter) {
        top = window.innerHeight - ph - gutter;
      }
      setPos({ top, left });
    }
    recompute();
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open, align, placement]);

  return (
    <div className="relative inline-block">
      <div ref={triggerRef}>
        {trigger({ open, toggle: () => setOpen((o) => !o), close: () => setOpen(false) })}
      </div>
      {open && mounted &&
        createPortal(
          <div
            ref={popRef}
            className={clsx(
              "fixed z-[1000] overflow-hidden rounded-md border border-border-default bg-elevated text-small shadow-popover",
              // hide until measured so we don't flash at (0,0) before the
              // layout effect resolves a real position
              pos == null && "invisible",
            )}
            style={{ width, top: pos?.top ?? 0, left: pos?.left ?? 0 }}
          >
            {children({ close: () => setOpen(false) })}
          </div>,
          document.body,
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
