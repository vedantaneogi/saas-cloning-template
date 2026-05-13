"use client";

import { useState, useMemo, type ReactNode } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import clsx from "clsx";
import { Popover } from "@/components/popover";

/**
 * Dark-themed date picker. Replaces `<input type="date">` so we don't have to
 * fight Windows' bright-white native calendar. value/onChange use ISO date
 * strings ("YYYY-MM-DD") to match the native input contract, so it slots
 * directly into existing forms.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  clearable = true,
  size = "md",
  className,
  triggerClassName,
  icon,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  clearable?: boolean;
  size?: "sm" | "md";
  className?: string;
  triggerClassName?: string;
  /** Leading icon shown when no date is selected. Defaults to a Calendar. */
  icon?: ReactNode;
}) {
  const initialMonth = value ? new Date(value + "T00:00:00") : new Date();
  const [view, setView] = useState<Date>(startOfMonth(initialMonth));

  const pad = size === "sm" ? "px-2 py-0.5" : "px-2 py-1";
  const text = size === "sm" ? "text-mini" : "text-small";

  return (
    <Popover
      align="start"
      width={260}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "inline-flex w-full items-center gap-1.5 rounded-md border border-border-subtle bg-input text-text-primary",
            "hover:border-border-strong",
            open && "border-border-strong",
            pad,
            text,
            triggerClassName,
            className,
          )}
        >
          {value ? (
            <Calendar size={12} className="text-text-tertiary" />
          ) : (
            icon ?? <Calendar size={12} className="text-text-tertiary" />
          )}
          <span className={clsx("flex-1 truncate text-left", !value && "text-text-tertiary")}>
            {value ? fmt(value) : placeholder}
          </span>
          {clearable && value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(""); } }}
              className="rounded-sm p-0.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
              aria-label="Clear date"
            >
              <X size={11} />
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <Calendar2
          view={view}
          setView={setView}
          selected={value}
          onPick={(d) => { onChange(d); close(); }}
        />
      )}
    </Popover>
  );
}

function Calendar2({
  view,
  setView,
  selected,
  onPick,
}: {
  view: Date;
  setView: (d: Date) => void;
  selected: string;
  onPick: (iso: string) => void;
}) {
  const cells = useMemo(() => monthCells(view), [view]);
  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function prev() { setView(addMonths(view, -1)); }
  function next() { setView(addMonths(view, 1)); }

  const todayIso = isoLocal(new Date());

  return (
    <div className="p-2">
      <header className="mb-2 flex items-center justify-between px-1 text-small">
        <button
          type="button"
          onClick={prev}
          className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Previous month"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="font-medium text-text-primary">{monthLabel}</span>
        <button
          type="button"
          onClick={next}
          className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          aria-label="Next month"
        >
          <ChevronRight size={13} />
        </button>
      </header>
      <div className="grid grid-cols-7 gap-0.5 px-1 pb-1 text-center text-micro text-text-tertiary">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`${d}-${i}`} className="py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 px-1 pb-1 text-center text-mini">
        {cells.map((c) => {
          const iso = isoLocal(c.date);
          const isSelected = selected === iso;
          const isToday = todayIso === iso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              className={clsx(
                "aspect-square rounded-sm",
                !c.inMonth && "text-text-quaternary",
                c.inMonth && !isSelected && "text-text-secondary hover:bg-row-hover",
                isSelected && "bg-accent text-white",
                isToday && !isSelected && "ring-1 ring-accent/40",
              )}
            >
              {c.date.getDate()}
            </button>
          );
        })}
      </div>
      <footer className="flex items-center justify-between border-t border-border-subtle px-1 pt-2">
        <button
          type="button"
          onClick={() => { onPick(todayIso); }}
          className="rounded-md px-1.5 py-0.5 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          Today
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onPick("")}
            className="rounded-md px-1.5 py-0.5 text-mini text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            Clear
          </button>
        )}
      </footer>
    </div>
  );
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isoLocal(d: Date) {
  // Local-time YYYY-MM-DD — keeps the picker aligned with what the user sees
  // rather than shifting by UTC offset.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function monthCells(view: Date) {
  const first = startOfMonth(view);
  const startWeekday = first.getDay();
  const cells: { date: Date; inMonth: boolean }[] = [];
  // 42-cell grid (6 weeks × 7) for a stable layout.
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - startWeekday);
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === view.getMonth() });
  }
  return cells;
}
function fmt(iso: string) {
  // "Sep 30, 2026" — matches Linear's date pill format.
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
