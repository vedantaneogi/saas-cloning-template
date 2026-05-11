"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SHORTCUTS: { group: string; items: { keys: string[]; label: string }[] }[] = [
  {
    group: "Navigation",
    items: [
      { keys: ["G", "I"], label: "Go to inbox" },
      { keys: ["G", "M"], label: "Go to my issues" },
      { keys: ["/"], label: "Search" },
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["?"], label: "Show this cheatsheet" },
    ],
  },
  {
    group: "Issues",
    items: [
      { keys: ["C"], label: "Create new issue" },
      { keys: ["S"], label: "Change status" },
      { keys: ["A"], label: "Change assignee" },
      { keys: ["L"], label: "Change labels" },
      { keys: ["P"], label: "Change priority" },
      { keys: ["0–4"], label: "Set priority directly" },
      { keys: ["E"], label: "Set estimate" },
      { keys: ["⌘", "↵"], label: "Save form" },
    ],
  },
  {
    group: "Lists",
    items: [
      { keys: ["X"], label: "Select issue" },
      { keys: ["↑", "↓"], label: "Move selection" },
      { keys: ["Esc"], label: "Close popover / cancel edit" },
    ],
  },
];

export function ShortcutCheatsheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.matches("input, textarea, [contenteditable=true]");
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-[560px] max-w-[92vw] overflow-hidden rounded-lg border border-border-default bg-elevated shadow-popover">
        <header className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
          <h2 className="text-small font-semibold text-text-primary">Keyboard shortcuts</h2>
          <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-secondary" aria-label="Close">
            <X size={14} />
          </button>
        </header>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-4">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <h3 className="mb-2 text-micro font-medium uppercase tracking-wider text-text-tertiary">{g.group}</h3>
              <ul className="space-y-1.5">
                {g.items.map((s, i) => (
                  <li key={i} className="flex items-center justify-between text-small text-text-secondary">
                    <span>{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <kbd key={j} className="inline-flex min-w-[20px] items-center justify-center rounded-sm bg-pill px-1.5 py-0.5 text-micro font-medium text-text-secondary">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
