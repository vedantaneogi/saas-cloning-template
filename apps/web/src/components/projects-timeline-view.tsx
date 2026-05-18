"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  ChevronDown,
  ChevronRight,
  Diamond,
  MoreHorizontal,
  Plus,
  Star,
  X,
} from "lucide-react";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import { HealthIconSmall, type HealthValue } from "@/components/health-icon";
import { StateGlyph } from "@/components/projects-board-view";
import { PriorityIcon } from "@/components/icons";
import { DatePicker } from "@/components/date-picker";
import {
  getProject,
  listMembers,
  patchProject,
  type Member,
  type Project,
  type ProjectDetail,
  type ProjectMilestone,
  type ProjectState,
} from "@/lib/api";

const DAY_MS = 86_400_000;
const ROW_HEIGHT = 72;
const HEADER_HEIGHT = 48;
const LEFT_WIDTH = 320;
const BAR_HEIGHT = 22;
const BAR_TOP = 26; // bar y inside its row — name sits at top: 6, bar at 26

const ZOOM_LEVELS = {
  month: { dayWidth: 32, label: "Month", tickEveryDays: 7 },
  quarter: { dayWidth: 10, label: "Quarter", tickEveryDays: 14 },
  half: { dayWidth: 5, label: "Half year", tickEveryDays: 14 },
  year: { dayWidth: 2.6, label: "Year", tickEveryDays: 28 },
} as const;
type Zoom = keyof typeof ZOOM_LEVELS;

/**
 * Gantt-style timeline view for projects. Matches Linear's reference design:
 *   - 320px sticky left panel with compact project metadata rows.
 *   - Wide horizontally-scrolling timeline (-3y .. +3y around today).
 *   - Glass-dark bars (bg-black/30 + backdrop-blur) with red milestone
 *     diamonds inside and milestone names below.
 *   - Project name floats above each bar.
 *   - Today is a thin vertical accent line + small purple "MMM dd" pill in
 *     the month axis.
 *   - Off-screen indicators ("← May 11") at viewport edges when bars are
 *     scrolled fully out of view.
 *   - Top-right "Today" (jumps to today) + zoom dropdown.
 */
export function ProjectsTimelineView({
  projects,
  workspace,
}: {
  projects: Project[];
  workspace: string;
}) {
  const [zoom, setZoom] = useState<Zoom>("year");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Fetch the full milestone list for every project on screen so each bar can
  // render every diamond + name below it (the list endpoint only ships
  // `next_milestone`). Cached by slug; one parallel fetch per render of the
  // project array.
  const [milestonesBySlug, setMilestonesBySlug] = useState<Record<string, ProjectMilestone[]>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      projects.map((p) =>
        getProject(workspace, p.slug_id)
          .then((d) => [p.slug_id, d.milestones] as const)
          .catch(() => [p.slug_id, [] as ProjectMilestone[]] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setMilestonesBySlug(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [workspace, projects]);
  const dayWidth = ZOOM_LEVELS[zoom].dayWidth;

  const today = useMemo(() => startOfDay(new Date()), []);
  const windowStart = useMemo(() => addYears(today, -3), [today]);
  const windowEnd = useMemo(() => addYears(today, 3), [today]);
  const totalDays = Math.round((windowEnd.getTime() - windowStart.getTime()) / DAY_MS);
  const totalWidth = Math.round(totalDays * dayWidth);

  const todayLeft = Math.round(((today.getTime() - windowStart.getTime()) / DAY_MS) * dayWidth);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  // Defer the initial scroll-to-today until after the grid lays out — running
  // synchronously lands at scrollLeft=0 because the inner width hasn't been
  // resolved by the browser yet.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const vw = el.clientWidth;
      setViewportWidth(vw);
      const target = Math.max(0, todayLeft + LEFT_WIDTH - vw / 2);
      el.scrollLeft = target;
      setScrollLeft(target);
    });
    return () => cancelAnimationFrame(raf);
  }, [zoom, todayLeft]);

  function jumpToToday() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: Math.max(0, todayLeft + LEFT_WIDTH - el.clientWidth / 2),
      behavior: "smooth",
    });
  }

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setScrollLeft(el.scrollLeft);
    setViewportWidth(el.clientWidth);
  }

  const months = useMemo(
    () => buildMonthHeader(windowStart, windowEnd, dayWidth),
    [windowStart, windowEnd, dayWidth],
  );
  const ticks = useMemo(
    () => buildTicks(windowStart, windowEnd, dayWidth, zoom),
    [windowStart, windowEnd, dayWidth, zoom],
  );

  // Bar-area visible bounds in cell coordinates (cell.x=0 sits at scroll
  // content.x = LEFT_WIDTH — i.e. just past the sticky left panel).
  //   visibleL = scrollLeft  → leftmost cell.x visible past the left panel
  //   visibleR = scrollLeft + viewportWidth - LEFT_WIDTH  → rightmost cell.x
  const visibleL = Math.max(0, scrollLeft);
  const visibleR = scrollLeft + Math.max(0, viewportWidth - LEFT_WIDTH);

  return (
    <div className="flex h-full">
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-[36px] shrink-0 items-center justify-end gap-1.5 px-3">
        <button
          type="button"
          onClick={jumpToToday}
          className="rounded-full bg-white/[0.04] px-3 py-1 text-mini text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary"
        >
          Today
        </button>
        <Popover
          align="end"
          width={140}
          surface="glass"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              className={clsx(
                "flex items-center gap-1 rounded-full bg-white/[0.04] px-3 py-1 text-mini text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary",
                open && "bg-white/[0.08] text-text-primary",
              )}
            >
              {ZOOM_LEVELS[zoom].label}
              <ChevronDown size={10} />
            </button>
          )}
        >
          {({ close }) => (
            <PopoverList>
              {(Object.entries(ZOOM_LEVELS) as [Zoom, (typeof ZOOM_LEVELS)[Zoom]][]).map(([key, val]) => (
                <PopoverItem
                  key={key}
                  active={zoom === key}
                  onClick={() => {
                    setZoom(key);
                    close();
                  }}
                >
                  {val.label}
                </PopoverItem>
              ))}
            </PopoverList>
          )}
        </Popover>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-auto">
        <div
          className="relative min-h-full"
          style={{ width: LEFT_WIDTH + totalWidth }}
        >
          <div className="grid" style={{ gridTemplateColumns: `${LEFT_WIDTH}px ${totalWidth}px` }}>
            {/* Top-left corner */}
            <div
              className="sticky left-0 top-0 z-30 bg-app"
              style={{ height: HEADER_HEIGHT }}
            />
            {/* Month + tick axis */}
            <div
              className="sticky top-0 z-20 border-b border-border-subtle bg-app"
              style={{ height: HEADER_HEIGHT }}
            >
              <MonthAxis
                months={months}
                ticks={ticks}
                todayLeft={todayLeft}
                today={today}
                totalWidth={totalWidth}
              />
            </div>

            {projects.map((p) => (
              <Fragment key={p.id}>
                <div
                  className={clsx(
                    "sticky left-0 z-10 bg-app",
                    selectedSlug === p.slug_id && "bg-row-selected",
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  <LeftRow
                    project={p}
                    selected={selectedSlug === p.slug_id}
                    onSelect={() => setSelectedSlug(p.slug_id)}
                  />
                </div>
                <div
                  className={clsx(
                    "relative",
                    selectedSlug === p.slug_id && "bg-row-selected",
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  <BarRow
                    project={p}
                    workspace={workspace}
                    milestones={milestonesBySlug[p.slug_id] ?? []}
                    windowStart={windowStart}
                    dayWidth={dayWidth}
                    visibleL={visibleL}
                    visibleR={visibleR}
                    selected={selectedSlug === p.slug_id}
                    onSelect={() => setSelectedSlug(p.slug_id)}
                  />
                </div>
              </Fragment>
            ))}
          </div>

          {/* Today vertical line — subtle accent that runs the full height of
              the scroll content (including the empty space below all rows). */}
          <div
            className="pointer-events-none absolute inset-y-0 z-[15]"
            style={{ left: LEFT_WIDTH + todayLeft }}
          >
            <div className="absolute inset-y-0 left-0 w-px bg-accent/30" />
          </div>

          {/* "Day, Mon DD" pill + "+ new project" button anchored to the today
              line, sitting just below the last project row. */}
          <div
            className="absolute z-[16] flex flex-col items-center gap-2"
            style={{
              left: LEFT_WIDTH + todayLeft,
              top: HEADER_HEIGHT + ROW_HEIGHT * projects.length + 12,
              transform: "translateX(-50%)",
            }}
          >
            <span className="whitespace-nowrap rounded-md bg-accent px-2 py-0.5 text-mini font-semibold text-white shadow-sm">
              {today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("new-project:open", {
                      detail: { startDate: today.toISOString() },
                    }),
                  );
                }
              }}
              aria-label="New project at today"
              className="rounded-md border border-border-subtle bg-elevated p-1 text-text-tertiary shadow-sm transition-colors hover:bg-row-hover hover:text-text-secondary"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {projects.length === 0 && (
          <div className="absolute inset-x-0 top-[120px] text-center text-mini text-text-tertiary">
            No projects match the current filters.
          </div>
        )}
      </div>
    </div>
      {selectedSlug && (
        <ProjectDetailPanel
          workspace={workspace}
          slug={selectedSlug}
          onClose={() => setSelectedSlug(null)}
        />
      )}
    </div>
  );
}

function LeftRow({
  project: p,
  selected,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group flex h-full w-full items-center gap-2 px-3 text-left hover:bg-row-hover",
        selected && "bg-row-selected",
      )}
    >
      <span style={{ color: p.icon_color }} className="shrink-0">
        <Box size={14} strokeWidth={1.75} />
      </span>
      <span className="flex-1 truncate text-small font-medium text-text-primary">{p.name}</span>
      {p.health && (
        <span className="shrink-0" title={healthLabel(p.health as HealthValue)}>
          <HealthIconSmall health={p.health as HealthValue} />
        </span>
      )}
      <span className="shrink-0">
        <StateGlyph state={p.state} />
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="shrink-0 rounded-md p-1 text-text-tertiary opacity-0 transition-colors hover:bg-white/10 hover:text-text-secondary group-hover:opacity-100"
        aria-label="Row actions"
      >
        <MoreHorizontal size={12} />
      </button>
      {p.lead && (
        <span
          className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-pill text-[9px] font-medium text-white"
          style={{ background: p.lead.color }}
          title={p.lead.name}
        >
          {p.lead.initials}
        </span>
      )}
    </button>
  );
}

function BarRow({
  project: p,
  workspace,
  milestones,
  windowStart,
  dayWidth,
  visibleL,
  visibleR,
  selected,
  onSelect,
}: {
  project: Project;
  workspace: string;
  milestones: ProjectMilestone[];
  windowStart: Date;
  dayWidth: number;
  visibleL: number;
  visibleR: number;
  selected: boolean;
  onSelect: () => void;
}) {
  void selected;
  const router = useRouter();
  const startISO = p.start_date ?? p.target_date ?? null;
  const targetISO = p.target_date ?? p.start_date ?? null;

  // Live drag state — bar visually grows/shrinks during the drag, and we only
  // commit on mouseup. `delta` is the day-quantized cursor offset since the
  // drag started.
  const [drag, setDrag] = useState<{
    mode: "move" | "resize-l" | "resize-r";
    delta: number;
  } | null>(null);
  // Did the mouse actually move during the drag? Used to suppress the
  // trailing click event that fires on <Link> after mouseup — we only want
  // navigation when the user clicked without dragging.
  const didDragRef = useRef(false);

  if (!startISO || !targetISO) return null;

  let baseStart = startOfDay(new Date(startISO));
  let baseEnd = startOfDay(new Date(targetISO));
  if (!p.start_date && p.target_date) baseStart = addDays(baseEnd, -14);
  if (!p.target_date && p.start_date) baseEnd = addDays(baseStart, 14);

  // Apply the in-flight drag delta to get the *displayed* dates.
  let dispStart = baseStart;
  let dispEnd = baseEnd;
  if (drag) {
    if (drag.mode === "move") {
      dispStart = addDays(baseStart, drag.delta);
      dispEnd = addDays(baseEnd, drag.delta);
    } else if (drag.mode === "resize-l") {
      dispStart = addDays(baseStart, drag.delta);
      if (dispStart >= dispEnd) dispStart = addDays(dispEnd, -1);
    } else {
      dispEnd = addDays(baseEnd, drag.delta);
      if (dispEnd <= dispStart) dispEnd = addDays(dispStart, 1);
    }
  }

  const startX = Math.round(((dispStart.getTime() - windowStart.getTime()) / DAY_MS) * dayWidth);
  const endX = Math.round(((dispEnd.getTime() - windowStart.getTime()) / DAY_MS) * dayWidth);
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const width = Math.max(8, right - left);

  function onMouseDown(mode: "move" | "resize-l" | "resize-r") {
    return (e: React.MouseEvent) => {
      // Don't start a drag on right-click / middle-click.
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const downX = e.clientX;
      didDragRef.current = false;
      setDrag({ mode, delta: 0 });
      const move = (ev: MouseEvent) => {
        const pxDelta = ev.clientX - downX;
        if (Math.abs(pxDelta) > 2) didDragRef.current = true;
        const deltaDays = Math.round(pxDelta / dayWidth);
        setDrag((prev) => (prev ? { ...prev, delta: deltaDays } : null));
      };
      const up = async (ev: MouseEvent) => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        const deltaDays = Math.round((ev.clientX - downX) / dayWidth);
        setDrag(null);
        if (deltaDays === 0) return;
        let newStart = baseStart;
        let newEnd = baseEnd;
        if (mode === "move") {
          newStart = addDays(baseStart, deltaDays);
          newEnd = addDays(baseEnd, deltaDays);
        } else if (mode === "resize-l") {
          newStart = addDays(baseStart, deltaDays);
          if (newStart >= newEnd) newStart = addDays(newEnd, -1);
        } else {
          newEnd = addDays(baseEnd, deltaDays);
          if (newEnd <= newStart) newEnd = addDays(newStart, 1);
        }
        try {
          await patchProject(workspace, p.slug_id, {
            start_date: newStart.toISOString(),
            target_date: newEnd.toISOString(),
          });
          router.refresh();
        } catch (err) {
          console.error("timeline drag patch failed", err);
        }
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    };
  }

  const offLeft = !drag && right < visibleL;
  const offRight = !drag && left > visibleR;

  if (offLeft || offRight) {
    return (
      <OffScreenIndicator
        project={p}
        onSelect={onSelect}
        side={offLeft ? "left" : "right"}
        startDate={dispStart}
        targetDate={dispEnd}
        visibleL={visibleL}
        visibleR={visibleR}
      />
    );
  }

  // Which edge to anchor the date pill to while dragging.
  const dragPillEdge: "left" | "right" | null = drag
    ? drag.mode === "resize-l"
      ? "left"
      : drag.mode === "resize-r"
        ? "right"
        : null
    : null;

  return (
    <div className="absolute inset-0">
      {/* Project name floats above the bar at the bar's left edge. Clamped to
          stay inside the visible bar area so it doesn't slip off-screen left. */}
      <span
        className="pointer-events-none absolute truncate whitespace-nowrap text-mini font-semibold text-text-primary"
        style={{
          left: Math.max(left, visibleL + 4),
          top: 8,
          maxWidth: Math.max(width, 160),
        }}
      >
        {p.name}
      </span>

      <div
        role="button"
        tabIndex={0}
        onMouseDown={onMouseDown("move")}
        onClick={() => {
          // Only treat as a real click (= open detail panel) when the cursor
          // did not move during the press. The drag handler flips this ref
          // to true any time the cursor moves more than 2px.
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          onSelect();
        }}
        title={`${p.name}: ${fmtDate(dispStart)} → ${fmtDate(dispEnd)}`}
        className={clsx(
          "group/bar absolute flex cursor-grab items-center overflow-hidden rounded-md border transition-colors active:cursor-grabbing",
          // Glass bar surface — light enough to read clearly over the page
          // gradient but still glassy. Matches Linear's reference bar.
          "border-white/[0.12] bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.07]",
          drag && "ring-1 ring-accent/50",
        )}
        style={{
          top: BAR_TOP,
          left,
          width,
          height: BAR_HEIGHT,
        }}
      >
        <span
          role="presentation"
          onMouseDown={onMouseDown("resize-l")}
          className="absolute -left-1 z-10 h-full w-2 cursor-ew-resize"
        />
        <span
          role="presentation"
          onMouseDown={onMouseDown("resize-r")}
          className="absolute -right-1 z-10 h-full w-2 cursor-ew-resize"
        />
      </div>
      {/* Use workspace param to keep the prop referenced even though we no
          longer navigate to /[workspace]/project/[slug]. */}
      <span hidden>{workspace}</span>

      {/* Date pill while dragging — shows the new edge date for the active
          handle (or both for a whole-bar move). */}
      {drag && dragPillEdge === "left" && (
        <DateBadge left={left} top={BAR_TOP - 22} date={dispStart} />
      )}
      {drag && dragPillEdge === "right" && (
        <DateBadge left={right} top={BAR_TOP - 22} date={dispEnd} align="end" />
      )}
      {drag && drag.mode === "move" && (
        <>
          <DateBadge left={left} top={BAR_TOP - 22} date={dispStart} />
          <DateBadge left={right} top={BAR_TOP - 22} date={dispEnd} align="end" />
        </>
      )}

      {/* All milestones for this project. Dated milestones render at their
          actual date; undated milestones are spread evenly between the bar's
          start and end, ordered by `position` — matches Linear's behavior.
          The label under each diamond is clipped to the slot width between
          adjacent milestones so long names don't overlap their neighbours. */}
      {milestones.map((m, idx) => {
        let mLeft: number;
        if (m.target_date) {
          const mDate = startOfDay(new Date(m.target_date));
          mLeft = Math.round(((mDate.getTime() - windowStart.getTime()) / DAY_MS) * dayWidth);
        } else {
          const frac = (idx + 1) / (milestones.length + 1);
          mLeft = left + Math.round(frac * width);
        }
        if (mLeft < visibleL - 60 || mLeft > visibleR + 60) return null;
        // Spacing between adjacent milestones is width / (N+1), since the
        // marks sit at fractions 1/(N+1), 2/(N+1), …. Subtracting 12px of
        // breathing room keeps centered labels from kissing their neighbours.
        const slot = Math.max(36, Math.floor(width / (milestones.length + 1)) - 12);
        return (
          <MilestoneMark
            key={m.id}
            name={m.name}
            mLeft={mLeft}
            maxWidth={slot}
            dated={!!m.target_date}
          />
        );
      })}
    </div>
  );
}

function DateBadge({
  left,
  top,
  date,
  align = "start",
}: {
  left: number;
  top: number;
  date: Date;
  align?: "start" | "end";
}) {
  return (
    <span
      className="pointer-events-none absolute whitespace-nowrap rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white shadow-sm"
      style={{
        left,
        top,
        transform: align === "end" ? "translateX(-100%)" : "translateX(0)",
      }}
    >
      {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}

function MilestoneMark({
  name,
  mLeft,
  maxWidth,
  dated,
}: {
  name: string;
  mLeft: number;
  maxWidth: number;
  dated: boolean;
}) {
  const diamondTop = BAR_TOP + (BAR_HEIGHT - 11) / 2;
  return (
    <>
      <span
        className={clsx(
          "pointer-events-none absolute -translate-x-1/2",
          // Dated milestones get a richer red (typical Linear milestone),
          // undated get a softer gold — keeps the bar readable when full.
          dated ? "text-priority-urgent" : "text-priority-medium",
        )}
        style={{ left: mLeft, top: diamondTop }}
      >
        <Diamond size={11} fill="currentColor" />
      </span>
      <span
        className="pointer-events-none absolute -translate-x-1/2 overflow-hidden text-ellipsis whitespace-nowrap text-mini text-text-tertiary"
        style={{
          left: mLeft,
          top: BAR_TOP + BAR_HEIGHT + 4,
          maxWidth,
        }}
        title={name}
      >
        {name}
      </span>
    </>
  );
}

function OffScreenIndicator({
  project: p,
  onSelect,
  side,
  startDate,
  targetDate,
  visibleL,
  visibleR,
}: {
  project: Project;
  onSelect: () => void;
  side: "left" | "right";
  startDate: Date;
  targetDate: Date;
  visibleL: number;
  visibleR: number;
}) {
  const Arrow = side === "left" ? ArrowLeft : ArrowRight;
  const dateLabel = `${fmtDate(startDate)} - ${fmtDate(targetDate)}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "absolute inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-mini text-text-tertiary transition-colors hover:bg-row-hover hover:text-text-secondary",
        side === "right" && "-translate-x-full",
      )}
      style={
        side === "left"
          ? { left: visibleL + 8, top: BAR_TOP - 2 }
          : { left: visibleR - 8, top: BAR_TOP - 2 }
      }
      title={`${p.name} • ${dateLabel}`}
    >
      {side === "left" && <Arrow size={11} />}
      {side === "right" && <span className="font-semibold text-text-primary">{p.name}</span>}
      <span>{dateLabel}</span>
      {side === "right" && <Arrow size={11} />}
    </button>
  );
}

function MonthAxis({
  months,
  ticks,
  todayLeft,
  today,
  totalWidth,
}: {
  months: { left: number; width: number; label: string }[];
  ticks: { left: number; day: number }[];
  todayLeft: number;
  today: Date;
  totalWidth: number;
}) {
  return (
    <div className="relative h-full" style={{ width: totalWidth }}>
      {/* Subtle vertical grid line at each month boundary */}
      {months.map((m, i) => (
        <span
          key={`d-${i}`}
          className="pointer-events-none absolute inset-y-0 w-px bg-border-subtle/40"
          style={{ left: m.left }}
        />
      ))}
      {months.map((m, i) => (
        <span
          key={`m-${i}`}
          className="absolute text-[10px] font-medium uppercase tracking-wide text-text-tertiary"
          style={{ left: m.left + 6, top: 4 }}
        >
          {m.label}
        </span>
      ))}
      {ticks.map((t, i) => (
        <span
          key={`t-${i}`}
          className="absolute text-[10px] text-text-quaternary"
          style={{ left: t.left + 2, top: HEADER_HEIGHT - 18 }}
        >
          {t.day}
        </span>
      ))}
      {/* Today pill */}
      <span
        className="absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white shadow-sm"
        style={{ left: todayLeft, top: HEADER_HEIGHT - 22 }}
      >
        {today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
    </div>
  );
}

function ProjectDetailPanel({
  workspace,
  slug,
  onClose,
}: {
  workspace: string;
  slug: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    getProject(workspace, slug)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        console.error("loading project detail failed", e);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace, slug]);

  useEffect(() => {
    listMembers(workspace)
      .then(setMembers)
      .catch(() => {});
  }, [workspace]);

  async function mutate(patch: Record<string, unknown>) {
    if (!detail) return;
    try {
      const updated = await patchProject(workspace, slug, patch);
      setDetail({ ...detail, ...updated });
      router.refresh();
    } catch (e) {
      console.error("patch project failed", e);
    }
  }

  // Close on outside click + Escape so the panel feels like a true popover.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t)) {
        // Ignore clicks on the timeline rows (they own selection toggling)
        // and on any portaled popover content (3-dot menu etc.).
        const portalRoot = document.querySelector("[data-popover-portal]");
        if (portalRoot?.contains(t)) return;
        // Clicks back inside the timeline (LEFT row buttons or bars) will
        // either switch the selection or hit elsewhere — both fine. Only
        // close on clicks that land truly outside both panel + timeline.
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Defer registration until after the click that opened the panel has
    // finished bubbling, otherwise it closes immediately on first paint.
    const t = setTimeout(() => {
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function deleteProject() {
    if (!detail) return;
    if (!confirm(`Delete project "${detail.name}"? This can't be undone.`)) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      await fetch(
        `${base}/api/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(slug)}`,
        { method: "DELETE", credentials: "include" },
      );
      onClose();
      router.refresh();
    } catch (e) {
      console.error("delete project failed", e);
    }
  }

  return (
    <aside
      ref={panelRef}
      className="m-3 flex h-[calc(100%-1.5rem)] w-[420px] shrink-0 flex-col rounded-xl border border-white/10 bg-elevated/95 shadow-popover backdrop-blur-xl"
    >
      <div className="flex h-[44px] shrink-0 items-center gap-2 px-3 text-mini text-text-tertiary">
        <Link
          href={detail ? `/${workspace}/project/${slug}` : "#"}
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-text-secondary transition-colors hover:bg-row-hover hover:text-text-primary"
        >
          {detail && (
            <span style={{ color: detail.icon_color }}>
              <Box size={14} strokeWidth={1.75} />
            </span>
          )}
          <span className="font-semibold text-text-primary">{detail?.name ?? "Loading…"}</span>
          <ChevronRight size={11} className="text-text-tertiary" />
        </Link>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Favorite"
            className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <Star size={13} />
          </button>
          <Popover
            align="end"
            width={180}
            surface="glass"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label="More"
                className={clsx(
                  "rounded-md p-1 text-text-tertiary transition-colors hover:bg-row-hover hover:text-text-secondary",
                  open && "bg-row-hover text-text-secondary",
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
                    close();
                    if (detail) router.push(`/${workspace}/project/${slug}`);
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
                >
                  <span>Edit project…</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    if (typeof window !== "undefined" && detail) {
                      const url = `${window.location.origin}/${workspace}/project/${slug}`;
                      navigator.clipboard?.writeText(url).catch(() => {});
                    }
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
                >
                  <span>Copy link</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    deleteProject();
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-priority-urgent hover:bg-white/5"
                >
                  <span>Delete</span>
                </button>
              </div>
            )}
          </Popover>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <X size={13} />
          </button>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!detail ? (
          <div className="px-4 py-6 text-mini text-text-tertiary">Loading…</div>
        ) : (
          <>
            {detail.description && (
              <p className="px-4 pt-4 text-small text-text-secondary">{detail.description}</p>
            )}

            <PanelSection title="Properties">
              <PropPickerRow label="Status">
                <Popover
                  align="start"
                  width={200}
                  surface="glass"
                  trigger={({ toggle, open }) => (
                    <PropValueButton open={open} onClick={toggle}>
                      <StateGlyph state={detail.state} />
                      <span className="ml-2 capitalize text-text-primary">{detail.state}</span>
                    </PropValueButton>
                  )}
                >
                  {({ close }) => (
                    <PopoverList>
                      {(["planned", "started", "paused", "completed", "canceled"] as ProjectState[]).map((s) => (
                        <PopoverItem
                          key={s}
                          active={detail.state === s}
                          onClick={() => {
                            mutate({ state: s });
                            close();
                          }}
                        >
                          <StateGlyph state={s} />
                          <span className="capitalize">{s}</span>
                        </PopoverItem>
                      ))}
                    </PopoverList>
                  )}
                </Popover>
              </PropPickerRow>

              <PropPickerRow label="Priority">
                <Popover
                  align="start"
                  width={200}
                  surface="glass"
                  trigger={({ toggle, open }) => (
                    <PropValueButton open={open} onClick={toggle}>
                      <PriorityIcon value={detail.priority} />
                      <span className="ml-2 text-text-primary">
                        {detail.priority === 0 ? "No priority" : PRIORITY_LABELS[detail.priority]}
                      </span>
                    </PropValueButton>
                  )}
                >
                  {({ close }) => (
                    <PopoverList>
                      {[0, 1, 2, 3, 4].map((p) => (
                        <PopoverItem
                          key={p}
                          active={detail.priority === p}
                          onClick={() => {
                            mutate({ priority: p });
                            close();
                          }}
                        >
                          <PriorityIcon value={p as 0 | 1 | 2 | 3 | 4} />
                          <span>{PRIORITY_LABELS[p]}</span>
                        </PopoverItem>
                      ))}
                    </PopoverList>
                  )}
                </Popover>
              </PropPickerRow>

              <PropPickerRow label="Lead">
                <Popover
                  align="start"
                  width={240}
                  surface="glass"
                  trigger={({ toggle, open }) => (
                    <PropValueButton open={open} onClick={toggle}>
                      {detail.lead ? (
                        <>
                          <span
                            className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-pill text-[9px] font-medium text-white"
                            style={{ background: detail.lead.color }}
                          >
                            {detail.lead.initials}
                          </span>
                          <span className="ml-2 text-text-primary">{detail.lead.name}</span>
                        </>
                      ) : (
                        <span className="text-text-tertiary">No lead</span>
                      )}
                    </PropValueButton>
                  )}
                >
                  {({ close }) => (
                    <PopoverList>
                      <PopoverItem
                        active={!detail.lead}
                        onClick={() => {
                          mutate({ clear_lead: true });
                          close();
                        }}
                      >
                        <span>No lead</span>
                      </PopoverItem>
                      {members.map((m) => (
                        <PopoverItem
                          key={m.id}
                          active={detail.lead?.id === m.id}
                          onClick={() => {
                            mutate({ lead_id: m.id });
                            close();
                          }}
                        >
                          <span
                            className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-pill text-[9px] font-medium text-white"
                            style={{ background: m.color }}
                          >
                            {m.initials}
                          </span>
                          <span>{m.name}</span>
                        </PopoverItem>
                      ))}
                    </PopoverList>
                  )}
                </Popover>
              </PropPickerRow>

              <PropRow label="Members">
                <span className="text-text-tertiary">
                  {detail.members?.length ? `${detail.members.length} member(s)` : "Add members"}
                </span>
              </PropRow>
              <PropRow label="Issues">
                <span className="text-text-primary">{detail.issue_count}</span>
              </PropRow>
              <PropPickerRow label="Dates">
                <DatePicker
                  value={detail.start_date ? detail.start_date.slice(0, 10) : ""}
                  onChange={(iso) => {
                    if (iso) mutate({ start_date: iso });
                    else mutate({ clear_start_date: true });
                  }}
                  placeholder="Start"
                />
                <span className="mx-2 text-text-tertiary">→</span>
                <DatePicker
                  value={detail.target_date ? detail.target_date.slice(0, 10) : ""}
                  onChange={(iso) => {
                    if (iso) mutate({ target_date: iso });
                    else mutate({ clear_target_date: true });
                  }}
                  placeholder="Target"
                />
              </PropPickerRow>
              {detail.team_keys?.length ? (
                <PropRow label="Teams">
                  <span className="text-text-primary">{detail.team_keys.join(", ")}</span>
                </PropRow>
              ) : null}
            </PanelSection>

            <PanelSection title="Milestones">
              {detail.milestones.length === 0 ? (
                <div className="px-4 py-2 text-mini text-text-tertiary">No milestones yet.</div>
              ) : (
                <ul>
                  {detail.milestones.map((m) => (
                    <MilestoneRow key={m.id} milestone={m} />
                  ))}
                </ul>
              )}
            </PanelSection>
          </>
        )}
      </div>
    </aside>
  );
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border-subtle py-2">
      <header className="flex items-center justify-between px-4 py-1.5 text-mini font-medium uppercase tracking-wide text-text-tertiary">
        <span>{title}</span>
        <button
          type="button"
          aria-label={`Add to ${title}`}
          className="rounded-md p-0.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <Plus size={11} />
        </button>
      </header>
      <div>{children}</div>
    </section>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-1.5 text-small">
      <span className="w-[88px] shrink-0 text-text-tertiary">{label}</span>
      <span className="flex flex-1 items-center text-text-primary">{children}</span>
    </div>
  );
}

function PropPickerRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-1 text-small">
      <span className="w-[88px] shrink-0 text-text-tertiary">{label}</span>
      <span className="flex flex-1 items-center text-text-primary">{children}</span>
    </div>
  );
}

function PropValueButton({
  open,
  onClick,
  children,
}: {
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "-mx-1.5 inline-flex items-center rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/5",
        open && "bg-white/5",
      )}
    >
      {children}
    </button>
  );
}

function MilestoneRow({ milestone: m }: { milestone: ProjectMilestone }) {
  return (
    <li className="flex items-center gap-2 px-4 py-1.5 text-small hover:bg-row-hover">
      <span className="text-priority-medium">
        <Diamond size={11} fill="currentColor" />
      </span>
      <span className="flex-1 truncate text-text-primary">{m.name}</span>
      <span className="text-mini text-text-tertiary">0% of 0</span>
      {m.target_date && (
        <span className="text-mini text-text-tertiary">{fmtDate(new Date(m.target_date))}</span>
      )}
      <button
        type="button"
        aria-label="Milestone actions"
        className="rounded-md p-0.5 text-text-tertiary hover:bg-white/10 hover:text-text-secondary"
      >
        <MoreHorizontal size={11} />
      </button>
    </li>
  );
}

const PRIORITY_LABELS: Record<number, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function addYears(d: Date, n: number) {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function healthLabel(h: HealthValue) {
  return ({ onTrack: "On track", atRisk: "At risk", offTrack: "Off track", noUpdate: "No update" } as const)[h];
}

function buildMonthHeader(windowStart: Date, windowEnd: Date, dayWidth: number) {
  const result: { left: number; width: number; label: string }[] = [];
  let cur = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
  while (cur < windowEnd) {
    const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const left = Math.round(((cur.getTime() - windowStart.getTime()) / DAY_MS) * dayWidth);
    const widthDays = Math.round((nextMonth.getTime() - cur.getTime()) / DAY_MS);
    const monthLabel = cur.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const isJan = cur.getMonth() === 0;
    result.push({
      left,
      width: Math.round(widthDays * dayWidth),
      label: isJan ? `${monthLabel} ${cur.getFullYear()}` : monthLabel,
    });
    cur = nextMonth;
  }
  return result;
}

function buildTicks(windowStart: Date, windowEnd: Date, dayWidth: number, zoom: Zoom) {
  const stepDays = ZOOM_LEVELS[zoom].tickEveryDays;
  const result: { left: number; day: number }[] = [];
  const cursor = new Date(windowStart);
  cursor.setHours(0, 0, 0, 0);
  while (cursor < windowEnd) {
    const left = Math.round(((cursor.getTime() - windowStart.getTime()) / DAY_MS) * dayWidth);
    result.push({ left, day: cursor.getDate() });
    cursor.setDate(cursor.getDate() + stepDays);
  }
  return result;
}
