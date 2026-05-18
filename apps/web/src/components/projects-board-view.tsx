"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Box, Diamond, MoreHorizontal, Plus, CheckSquare, EyeOff } from "lucide-react";
import { Popover } from "@/components/popover";
import { PriorityIcon } from "@/components/icons";
import { HealthIconSmall, type HealthValue } from "@/components/health-icon";
import { HiddenColumnsRail } from "@/components/board-hidden-rail";
import { patchProject, type Project, type ProjectState } from "@/lib/api";

const STATE_COLUMNS: { state: ProjectState; label: string }[] = [
  { state: "planned", label: "Backlog" }, // Linear groups planned + paused together; we use Planned column heading instead
  { state: "started", label: "In Progress" },
  { state: "paused", label: "Paused" },
  { state: "completed", label: "Completed" },
  { state: "canceled", label: "Canceled" },
];

const STATE_COLORS: Record<ProjectState, string> = {
  planned: "#6b6f76",
  started: "#facc15",
  paused: "#d9b34c",
  completed: "#22c55e",
  canceled: "#6b6f76",
};

/**
 * Kanban board for projects. Mirrors the issue BoardView (column per
 * status, draggable cards, "+ add project" stub at the bottom of every
 * column) but uses project state instead of issue state group.
 */
export function ProjectsBoardView({
  projects,
  workspace,
  onHideColumn,
  onShowColumn,
  hiddenColumns,
  onNewProject,
}: {
  projects: Project[];
  workspace: string;
  onHideColumn?: (state: ProjectState) => void;
  onShowColumn?: (state: ProjectState) => void;
  hiddenColumns?: ProjectState[];
  onNewProject: (state: ProjectState) => void;
}) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  // Empty columns auto-collapse into the hidden-columns rail. Clicking Show on
  // a rail row force-reveals the column for the rest of this session via this
  // set — mirrors the issue BoardView behaviour.
  const [forceShown, setForceShown] = useState<Set<ProjectState>>(new Set());
  const [railOpen, setRailOpen] = useState(true);

  const grouped = useMemo(() => {
    const m = new Map<ProjectState, Project[]>();
    for (const col of STATE_COLUMNS) m.set(col.state, []);
    for (const p of projects) {
      if (!m.has(p.state)) m.set(p.state, []);
      m.get(p.state)!.push(p);
    }
    return m;
  }, [projects]);

  const hiddenSet = useMemo(() => new Set(hiddenColumns ?? []), [hiddenColumns]);

  const { visible, hidden } = useMemo(() => {
    const v: { state: ProjectState; label: string; projects: Project[] }[] = [];
    const h: { state: ProjectState; label: string; projects: Project[] }[] = [];
    for (const col of STATE_COLUMNS) {
      const ps = grouped.get(col.state) ?? [];
      const explicitlyHidden = hiddenSet.has(col.state);
      const isEmpty = ps.length === 0;
      const shouldHide = !forceShown.has(col.state) && (explicitlyHidden || isEmpty);
      const entry = { state: col.state, label: col.label, projects: ps };
      if (shouldHide) h.push(entry);
      else v.push(entry);
    }
    return { visible: v, hidden: h };
  }, [grouped, hiddenSet, forceShown]);

  async function move(p: Project, toState: ProjectState) {
    if (p.state === toState) return;
    try {
      await patchProject(workspace, p.slug_id, { state: toState });
      router.refresh();
    } catch (e) {
      console.error("move project failed", e);
    }
  }

  function revealColumn(state: ProjectState) {
    if (hiddenSet.has(state) && onShowColumn) {
      // Was explicitly hidden via the menu; tell parent to remove from prefs.
      onShowColumn(state);
      return;
    }
    setForceShown((prev) => {
      const next = new Set(prev);
      next.add(state);
      return next;
    });
  }

  // When a column is explicitly hidden from its 3-dot menu, drop it from our
  // local force-shown set so the explicit hide actually takes effect — a
  // force-shown empty column otherwise stays visible because forceShown wins
  // over the empty/explicit-hide split rule.
  function handleHideColumn(state: ProjectState) {
    setForceShown((prev) => {
      if (!prev.has(state)) return prev;
      const next = new Set(prev);
      next.delete(state);
      return next;
    });
    onHideColumn?.(state);
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-3">
      {visible.map((col) => (
        <BoardColumn
          key={col.state}
          state={col.state}
          label={col.label}
          projects={col.projects}
          workspace={workspace}
          isDragging={draggedId !== null}
          onDragStart={setDraggedId}
          onDragEnd={() => setDraggedId(null)}
          onDrop={move}
          onHide={onHideColumn ? () => handleHideColumn(col.state) : undefined}
          onAdd={() => onNewProject(col.state)}
        />
      ))}
      {hidden.length > 0 && (
        <HiddenColumnsRail
          columns={hidden.map((col) => ({
            key: col.state,
            name: col.label,
            count: col.projects.length,
            icon: <StateGlyph state={col.state} />,
          }))}
          open={railOpen}
          onToggle={() => setRailOpen((o) => !o)}
          onReveal={(key) => revealColumn(key as ProjectState)}
        />
      )}
    </div>
  );
}

function BoardColumn({
  state,
  label,
  projects,
  workspace,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onHide,
  onAdd,
}: {
  state: ProjectState;
  label: string;
  projects: Project[];
  workspace: string;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (p: Project, toState: ProjectState) => void;
  onHide?: () => void;
  onAdd: () => void;
}) {
  const [over, setOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!over) setOver(true);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData("text/project-slug");
    if (!id) return;
    const dragged = projects.find((p) => p.slug_id === id);
    // We won't find it here (it lives in a different column) — but the
    // BoardView component knows about every project. Bubble up via a
    // custom event since columns can't see each other. Easier: encode
    // the project payload in the dataTransfer.
    const raw = e.dataTransfer.getData("text/project-payload");
    if (!raw) return;
    try {
      const p: Project = JSON.parse(raw);
      onDrop(p, state);
    } catch {
      // ignore corrupt drag payload
    }
    void dragged;
  }

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={clsx(
        "group flex h-full w-[320px] shrink-0 flex-col rounded-xl border bg-white/[0.025] backdrop-blur-md transition-colors",
        over
          ? "border-accent ring-1 ring-accent/40"
          : isDragging
            ? "border-white/15"
            : "border-white/10",
      )}
    >
      <header className="flex h-[40px] shrink-0 items-center gap-2 px-3 text-small">
        <StateGlyph state={state} />
        <span className="font-medium text-text-primary">{label}</span>
        <span className="text-text-tertiary">{projects.length}</span>
        <span className="ml-auto flex items-center gap-0.5">
          <Popover
            align="end"
            width={200}
            surface="glass"
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label={`Column actions for ${label}`}
                className={clsx(
                  "rounded-md p-1 text-text-tertiary hover:bg-white/10 hover:text-text-secondary",
                  open && "bg-white/10 text-text-secondary",
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
                  onClick={() => { onAdd(); close(); }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
                >
                  <Plus size={13} className="text-text-tertiary" />
                  <span>New project here</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    document.dispatchEvent(new CustomEvent("projects-board:select-all", { detail: { state } }));
                    close();
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
                >
                  <CheckSquare size={13} className="text-text-tertiary" />
                  <span>Select all in column</span>
                </button>
                {onHide && (
                  <button
                    type="button"
                    onClick={() => { onHide(); close(); }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-white/5"
                  >
                    <EyeOff size={13} className="text-text-tertiary" />
                    <span>Hide column</span>
                  </button>
                )}
              </div>
            )}
          </Popover>
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add project"
            className="rounded-md p-1 text-text-tertiary hover:bg-white/10 hover:text-text-secondary"
          >
            <Plus size={13} />
          </button>
        </span>
      </header>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            workspace={workspace}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {projects.length === 0 && (
          <div
            className={clsx(
              "rounded-md border border-dashed py-6 text-center text-mini text-text-tertiary transition-colors",
              over ? "border-accent text-accent" : "border-border-subtle",
            )}
          >
            {over ? "Drop to move" : "No projects"}
          </div>
        )}
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add project to ${label}`}
          className="flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] py-1.5 text-text-tertiary opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-text-secondary group-hover:opacity-100 focus-within:opacity-100 focus:opacity-100"
        >
          <Plus size={14} />
        </button>
      </div>
    </section>
  );
}

function ProjectCard({
  project: p,
  workspace,
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  workspace: string;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/project-slug", p.slug_id);
    e.dataTransfer.setData("text/project-payload", JSON.stringify(p));
    setDragging(true);
    onDragStart(p.id);
  }
  function handleDragEnd() {
    setDragging(false);
    onDragEnd();
  }

  const health: HealthValue = (p.health as HealthValue) ?? "noUpdate";

  return (
    <Link
      href={`/${workspace}/project/${p.slug_id}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={clsx(
        "block cursor-grab rounded-lg border border-white/10 bg-white/[0.04] p-3 text-small shadow-sm transition-colors hover:bg-white/[0.07] hover:border-white/15 active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <header className="flex items-center gap-1.5">
        <span style={{ color: p.icon_color }}>
          <Box size={14} strokeWidth={1.75} />
        </span>
        <span className="flex-1 truncate font-medium text-text-primary">{p.name}</span>
        <span className="text-text-tertiary" title={healthLabel(health)}>
          <HealthIconSmall health={health} />
        </span>
        <StateGlyph state={p.state} />
        <span className="text-text-quaternary" title="More">
          <MoreHorizontal size={11} />
        </span>
      </header>
      {p.description && (
        <p className="mt-1.5 line-clamp-2 text-mini text-text-tertiary">{p.description}</p>
      )}
      <footer className="mt-2 flex items-center gap-2 text-mini text-text-tertiary">
        {p.lead && (
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-pill text-[8px] font-medium text-white"
            style={{ background: p.lead.color }}
            title={p.lead.name}
          >
            {p.lead.initials}
          </span>
        )}
        {p.target_date && (
          <span className="shrink-0 whitespace-nowrap">{fmtDate(p.target_date)}</span>
        )}
        {p.next_milestone && (
          <span className="flex min-w-0 items-center gap-1">
            <Diamond size={9} className="shrink-0 text-priority-medium" fill="currentColor" />
            <span className="truncate">{p.next_milestone.name}</span>
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap">
          {p.priority !== 0 && <PriorityIcon value={p.priority} />}
          <span>{p.issue_count} issues</span>
        </span>
      </footer>
    </Link>
  );
}

export function StateGlyph({ state }: { state: ProjectState }) {
  const color = STATE_COLORS[state];
  if (state === "completed") {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0">
        <circle cx="8" cy="8" r="6" fill={color} />
        <path
          d="M5.5 8.2 L7.2 9.8 L10.5 6.5"
          stroke="white"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (state === "canceled") {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0">
        <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="2 2" />
        <path d="M5 5 L11 11 M11 5 L5 11" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (state === "paused") {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0">
        <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.4" />
        <rect x="6" y="5.5" width="1.4" height="5" rx="0.4" fill={color} />
        <rect x="8.6" y="5.5" width="1.4" height="5" rx="0.4" fill={color} />
      </svg>
    );
  }
  if (state === "started") {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0">
        <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="2" />
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={`${2 * Math.PI * 6 * 0.4} ${2 * Math.PI * 6}`}
          transform="rotate(-90 8 8)"
        />
      </svg>
    );
  }
  // planned
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0">
      <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="2 2" />
    </svg>
  );
}

function healthLabel(h: HealthValue) {
  return ({ onTrack: "On track", atRisk: "At risk", offTrack: "Off track", noUpdate: "No update" } as const)[h];
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"] as const;
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short" })} ${ordinal(d.getDate())}`;
}
