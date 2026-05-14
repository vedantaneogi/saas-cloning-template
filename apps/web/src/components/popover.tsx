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

// Ordered stack of every open popover's trigger + content elements. Because
// we portal each popover to document.body, a parent popover cannot detect
// (via DOM containment) that a click landed inside a *child* popover — the
// child's content is a sibling, not a descendant. That made the parent treat
// the child click as "outside" and close itself, collapsing the whole tree
// (e.g. picking a date inside the issue-modal date picker closed the
// surrounding More-properties popover).
//
// On every mousedown we find the deepest popover whose trigger or content
// contains the target; only popovers opened *after* that one close. So:
// - click inside the topmost popover → nothing closes
// - click inside a parent popover's body → child closes, parent stays
// - click completely outside → all popovers close
type PopoverEntry = {
  trigger: HTMLElement | null;
  content: HTMLElement | null;
};
const popoverStack: PopoverEntry[] = [];

function deepestHitIndex(target: Node): number {
  for (let i = popoverStack.length - 1; i >= 0; i--) {
    const p = popoverStack[i];
    if (p.trigger?.contains(target)) return i;
    if (p.content?.contains(target)) return i;
  }
  return -1;
}

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

  // Outside-click + Escape. Each open popover registers itself in
  // `popoverStack`; on every mousedown we find the deepest popover that
  // contains the target and close only the popovers opened after it. That
  // keeps parent popovers from collapsing when the user interacts with a
  // nested child popover (which would be portaled outside the parent's DOM).
  useEffect(() => {
    if (!open) return;
    const entry: PopoverEntry = {
      trigger: triggerRef.current,
      content: popRef.current,
    };
    popoverStack.push(entry);
    function onDown(e: MouseEvent) {
      // Refresh content ref — the portaled element mounts after registration.
      entry.content = popRef.current;
      const target = e.target as Node;
      const hitIdx = deepestHitIndex(target);
      const myIdx = popoverStack.indexOf(entry);
      // Click landed in a popover opened *before* me (or completely outside
      // every popover) — I should close. Click landed in me or in a deeper
      // descendant — stay open.
      if (myIdx > hitIdx) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      // Escape only closes the topmost popover.
      if (e.key !== "Escape") return;
      if (popoverStack[popoverStack.length - 1] === entry) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      const i = popoverStack.indexOf(entry);
      if (i >= 0) popoverStack.splice(i, 1);
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
              // Linear's popovers lift off the page with shadow + bg only —
              // any literal 1px border ring reads as a bright outline against
              // dark surfaces, so drop the border and let shadow-popover do
              // the edge work.
              "fixed z-[1000] overflow-hidden rounded-md bg-elevated text-small shadow-popover",
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
