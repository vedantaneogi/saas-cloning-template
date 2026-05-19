"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Activity,
  Box,
  Calendar,
  Check,
  ChevronDown,
  Compass,
  Link2,
  Layers,
  MoreHorizontal,
  Paperclip,
  PanelRight,
  Plus,
  Star,
  X,
} from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/icons";
import { MonthCalendar } from "@/components/date-picker";
import { Popover } from "@/components/popover";
import { ProjectsTable, type ProjectGroup } from "@/components/projects-table";
import { HealthIconSmall, healthColor, healthLabel } from "@/components/health-icon";
import {
  createInitiativeUpdate,
  patchInitiative,
  patchProject,
  type InitiativeDetail,
  type InitiativeStatus,
  type InitiativeUpdate,
  type Member,
  type Project,
  type ProjectState,
  type UpdateHealth,
} from "@/lib/api";

type Tab = "overview" | "activity" | "projects";

const STATUS_META: Record<InitiativeStatus, { label: string; color: string }> = {
  planned: { label: "Planned", color: "#94a0b8" },
  active: { label: "Active", color: "#f5b83d" },
  completed: { label: "Completed", color: "#22c55e" },
  canceled: { label: "Canceled", color: "#71717a" },
};

const STATE_GROUP_ORDER: ProjectState[] = ["planned", "started", "paused", "completed", "canceled"];
const STATE_GROUP_LABEL: Record<ProjectState, string> = {
  planned: "Backlog",
  started: "In Progress",
  paused: "Paused",
  completed: "Completed",
  canceled: "Canceled",
};

const HEALTH_OPTIONS: { value: UpdateHealth; label: string; color: string }[] = [
  { value: "onTrack", label: "On track", color: "#1ec27a" },
  { value: "atRisk", label: "At risk", color: "#f5b83d" },
  { value: "offTrack", label: "Off track", color: "#f2453d" },
];

export function InitiativeDetailBody({
  workspaceSlug,
  initial,
  members,
  allProjects,
}: {
  workspaceSlug: string;
  initial: InitiativeDetail;
  members: Member[];
  allProjects: Project[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [showRail, setShowRail] = useState(true);
  const [writing, setWriting] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  const ini = initial;

  const groups: ProjectGroup[] = useMemo(() => {
    const byState = new Map<ProjectState, Project[]>();
    for (const p of ini.projects) {
      const arr = byState.get(p.state) ?? [];
      arr.push(p);
      byState.set(p.state, arr);
    }
    return STATE_GROUP_ORDER
      .filter((s) => (byState.get(s) ?? []).length > 0)
      .map((s) => ({ key: s, label: STATE_GROUP_LABEL[s], projects: byState.get(s) ?? [] }));
  }, [ini.projects]);

  return (
    <>
      <InitiativeTopbar
        workspaceSlug={workspaceSlug}
        initiative={ini}
        onCreateNew={() => {
          window.dispatchEvent(new CustomEvent("new-project:open", { detail: { initiativeId: ini.id } }));
        }}
        onAddExisting={async (projectSlugId) => {
          await patchProject(workspaceSlug, projectSlugId, { initiative_id: ini.id });
        }}
        availableProjects={allProjects.filter((p) => p.initiative_id !== ini.id)}
      />

      <div className="flex h-[44px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
        <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>Activity</TabButton>
        <TabButton active={tab === "projects"} onClick={() => setTab("projects")}>Projects</TabButton>
        <button
          type="button"
          title="Board view"
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <Layers size={13} />
        </button>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            title="Activity"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            onClick={() => setTab("activity")}
          >
            <Activity size={13} />
          </button>
          <button
            type="button"
            onClick={() => setShowRail((v) => !v)}
            title={showRail ? "Hide sidebar" : "Show sidebar"}
            className={clsx(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              showRail
                ? "bg-row-selected text-text-primary"
                : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
            )}
          >
            <PanelRight size={13} />
          </button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[760px] px-8 py-10">
            {tab === "overview" && (
              <OverviewPanel
                workspaceSlug={workspaceSlug}
                initiative={ini}
                members={members}
                onWriteUpdate={() => setWriting(true)}
                editingDesc={editingDesc}
                setEditingDesc={setEditingDesc}
              />
            )}
            {tab === "activity" && <ActivityPanel updates={ini.updates} createdLabel={makeCreatedLabel(ini)} />}
            {tab === "projects" && (
              <ProjectsSection workspaceSlug={workspaceSlug} groups={groups} members={members} />
            )}
            {tab === "overview" && (
              <ProjectsSection
                workspaceSlug={workspaceSlug}
                groups={groups}
                members={members}
              />
            )}
          </div>
        </div>
        {showRail && <RightRail initiative={ini} workspaceSlug={workspaceSlug} members={members} />}
      </div>

      {writing && (
        <WriteUpdateModal
          workspaceSlug={workspaceSlug}
          initiative={ini}
          onClose={() => setWriting(false)}
        />
      )}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-md px-2.5 py-1 text-small transition-colors",
        active
          ? "bg-row-selected text-text-primary"
          : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}

function InitiativeTopbar({
  workspaceSlug,
  initiative,
  onCreateNew,
  onAddExisting,
  availableProjects,
}: {
  workspaceSlug: string;
  initiative: InitiativeDetail;
  onCreateNew: () => void;
  onAddExisting: (projectSlugId: string) => Promise<void>;
  availableProjects: Project[];
}) {
  const router = useRouter();
  const [fav, setFav] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<string | null>(null);

  function copyLink() {
    try {
      navigator.clipboard.writeText(window.location.href);
    } catch {}
  }

  return (
    <header className="flex h-[48px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
      <Link
        href={`/${workspaceSlug}/initiatives`}
        className="text-small text-text-tertiary hover:text-text-secondary"
      >
        Initiatives
      </Link>
      <span className="text-text-quaternary">›</span>
      <span className="flex min-w-0 items-center gap-1.5 text-small font-medium text-text-primary">
        <InitiativeGlyph color={initiative.icon_color} size={14} />
        <span className="truncate">{initiative.name}</span>
      </span>
      <button
        type="button"
        onClick={() => setFav((v) => !v)}
        title={fav ? "Unfavorite" : "Favorite"}
        className={clsx(
          "ml-1 flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          fav
            ? "text-priority-medium hover:bg-row-hover"
            : "text-text-tertiary hover:bg-row-hover hover:text-text-secondary",
        )}
      >
        <Star size={13} fill={fav ? "currentColor" : "none"} />
      </button>
      <Popover
        align="start"
        width={180}
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            title="More options"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      >
        {({ close }) => (
          <div className="py-1">
            <button
              type="button"
              onClick={() => { copyLink(); close(); }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
            >
              <Link2 size={12} /> Copy link
            </button>
          </div>
        )}
      </Popover>

      <span className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={copyLink}
          title="Copy link"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <Link2 size={13} />
        </button>
        <Popover
          align="end"
          width={240}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              title="Add project"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
            >
              <Plus size={13} />
            </button>
          )}
        >
          {({ close }) => (
            <div className="py-1">
              <button
                type="button"
                onClick={() => { onCreateNew(); close(); }}
                className="flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
              >
                <span className="flex items-center gap-2">
                  <Plus size={12} className="text-text-tertiary" />
                  <span>Create new project...</span>
                </span>
                <span className="text-mini text-text-quaternary">N then P</span>
              </button>
              <Popover
                align="start"
                placement="right"
                width={280}
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
                  >
                    <Box size={12} className="text-text-tertiary" />
                    <span>Add existing projects...</span>
                  </button>
                )}
              >
                {({ close: closeInner }) => (
                  <div className="py-1">
                    {availableProjects.length === 0 ? (
                      <div className="px-3 py-2 text-mini text-text-tertiary">
                        No projects available to add.
                      </div>
                    ) : (
                      availableProjects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={pendingAdd === p.id}
                          onClick={async () => {
                            setPendingAdd(p.id);
                            try {
                              await onAddExisting(p.slug_id);
                              router.refresh();
                            } finally {
                              setPendingAdd(null);
                              closeInner();
                              close();
                            }
                          }}
                          className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover disabled:opacity-50"
                        >
                          <Box size={12} style={{ color: p.icon_color }} />
                          <span className="flex-1 truncate">{p.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </Popover>
            </div>
          )}
        </Popover>
      </span>
    </header>
  );
}

function OverviewPanel({
  workspaceSlug,
  initiative,
  members,
  onWriteUpdate,
  editingDesc,
  setEditingDesc,
}: {
  workspaceSlug: string;
  initiative: InitiativeDetail;
  members: Member[];
  onWriteUpdate: () => void;
  editingDesc: boolean;
  setEditingDesc: (v: boolean) => void;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(initiative.description ?? "");

  async function saveDescription() {
    if (description === (initiative.description ?? "")) {
      setEditingDesc(false);
      return;
    }
    await patchInitiative(workspaceSlug, initiative.slug_id, { description });
    setEditingDesc(false);
    router.refresh();
  }

  return (
    <>
      <InitiativeGlyph color={initiative.icon_color} size={28} />
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">{initiative.name}</h1>
      {initiative.description && !editingDesc && (
        <p className="mt-2 text-default text-text-secondary">{initiative.description}</p>
      )}

      <PropertiesInlineRow workspaceSlug={workspaceSlug} initiative={initiative} members={members} />
      <ResourcesRow />

      {initiative.updates.length === 0 ? (
        <button
          type="button"
          onClick={onWriteUpdate}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-border-subtle bg-elevated/40 py-4 text-small text-text-tertiary transition-colors hover:bg-row-hover hover:text-text-secondary"
        >
          <Pencil />
          Write first initiative update
        </button>
      ) : (
        <LatestUpdate update={initiative.updates[0]} onWrite={onWriteUpdate} />
      )}

      <h2 className="mt-10 text-small font-semibold text-text-primary">Description</h2>
      {editingDesc ? (
        <textarea
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          onKeyDown={(e) => { if (e.key === "Escape") setEditingDesc(false); }}
          placeholder="Add description..."
          rows={4}
          className="mt-2 w-full resize-none rounded-md border border-border-strong bg-app px-3 py-2 text-small text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingDesc(true)}
          className="mt-2 block w-full rounded-md py-2 text-left text-small text-text-tertiary hover:text-text-secondary"
        >
          {initiative.description || "Add description..."}
        </button>
      )}
    </>
  );
}

function PropertiesInlineRow({
  workspaceSlug,
  initiative,
  members,
}: {
  workspaceSlug: string;
  initiative: InitiativeDetail;
  members: Member[];
}) {
  return (
    <div className="mt-6 flex items-center gap-6 text-small">
      <span className="text-text-tertiary">Properties</span>
      <StatusChipPicker workspaceSlug={workspaceSlug} initiative={initiative} />
      <OwnerChipPicker workspaceSlug={workspaceSlug} initiative={initiative} members={members} />
      <DateChipPicker workspaceSlug={workspaceSlug} initiative={initiative} />
    </div>
  );
}

function ResourcesRow() {
  return (
    <div className="mt-4 flex items-center gap-6 text-small">
      <span className="text-text-tertiary">Resources</span>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md text-text-tertiary hover:text-text-secondary"
      >
        <Plus size={12} />
        <span>Add document or link...</span>
      </button>
    </div>
  );
}

// --- Chip pickers ----------------------------------------------------------
// Each chip is a Popover that patches the initiative directly. The bare
// (read-only) StatusChip / OwnerChip / DateChip helpers below stay for
// places that just want to render a value (e.g. when there's no slug yet).

function StatusIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.6" fill="none" />
      <path d="M5 8 L7.5 5.5 L10.5 8.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function StatusChipDisplay({ status }: { status: InitiativeStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="flex items-center gap-1.5 text-text-primary">
      <StatusIcon color={meta.color} />
      <span>{meta.label}</span>
    </span>
  );
}

function OwnerChipDisplay({ owner }: { owner: Member | null }) {
  if (!owner) {
    return (
      <span className="flex items-center gap-1.5 text-text-tertiary">
        <span className="inline-block h-4 w-4 rounded-pill border border-dashed border-border-strong" />
        <span>Owner</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-text-primary">
      <Avatar initials={owner.initials} color={owner.color} size={16} />
      <span>{owner.name}</span>
    </span>
  );
}

function DateChipDisplay({ date }: { date: string | null }) {
  return (
    <span className="flex items-center gap-1.5 text-text-primary">
      <Calendar size={12} className="text-text-tertiary" />
      <span>{date ? fmtMdAbbr(date) : "No target"}</span>
    </span>
  );
}

function PickerTrigger({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "-mx-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors",
        open ? "bg-row-hover" : "hover:bg-row-hover",
      )}
    >
      {children}
    </span>
  );
}

const INITIATIVE_STATUS_OPTIONS: { value: InitiativeStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

function StatusChipPicker({
  workspaceSlug,
  initiative,
}: {
  workspaceSlug: string;
  initiative: InitiativeDetail;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  function setStatus(s: InitiativeStatus) {
    start(async () => {
      try {
        await patchInitiative(workspaceSlug, initiative.slug_id, { status: s });
        router.refresh();
      } catch (e) {
        console.error("patch initiative status failed", e);
      }
    });
  }
  return (
    <Popover
      align="start"
      width={200}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Status: ${STATUS_META[initiative.status].label}`}
        >
          <PickerTrigger open={open}>
            <StatusChipDisplay status={initiative.status} />
          </PickerTrigger>
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {INITIATIVE_STATUS_OPTIONS.map((o) => {
            const active = o.value === initiative.status;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { setStatus(o.value); close(); }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
              >
                <StatusIcon color={STATUS_META[o.value].color} />
                <span className="flex-1">{o.label}</span>
                {active && <Check size={12} className="text-text-secondary" />}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

function OwnerChipPicker({
  workspaceSlug,
  initiative,
  members,
}: {
  workspaceSlug: string;
  initiative: InitiativeDetail;
  members: Member[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [search, setSearch] = useState("");

  function setOwner(memberId: string | null) {
    start(async () => {
      try {
        if (memberId == null) {
          await patchInitiative(workspaceSlug, initiative.slug_id, { clear_owner: true });
        } else {
          await patchInitiative(workspaceSlug, initiative.slug_id, { owner_id: memberId });
        }
        router.refresh();
      } catch (e) {
        console.error("patch initiative owner failed", e);
      }
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [search, members]);

  return (
    <Popover
      align="start"
      width={240}
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-label="Owner picker">
          <PickerTrigger open={open}>
            <OwnerChipDisplay owner={initiative.owner} />
          </PickerTrigger>
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          <div className="px-2.5 pb-1 pt-1">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Set owner..."
              className="w-full bg-transparent py-1 text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
            />
          </div>
          <hr className="my-1 border-border-subtle" />
          <button
            type="button"
            onClick={() => { setOwner(null); close(); }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
          >
            <span className="inline-block h-4 w-4 rounded-pill border border-dashed border-border-strong" />
            <span className="flex-1">No owner</span>
            {!initiative.owner && <Check size={12} className="text-text-secondary" />}
          </button>
          {filtered.map((m) => {
            const active = initiative.owner?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { setOwner(m.id); close(); }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small text-text-secondary hover:bg-row-hover"
              >
                <Avatar initials={m.initials} color={m.color} size={16} />
                <span className="flex-1 truncate">{m.name}</span>
                {active && <Check size={12} className="text-text-secondary" />}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-mini text-text-tertiary">No matches.</div>
          )}
        </div>
      )}
    </Popover>
  );
}

function DateChipPicker({
  workspaceSlug,
  initiative,
}: {
  workspaceSlug: string;
  initiative: InitiativeDetail;
}) {
  const router = useRouter();
  const [, start] = useTransition();

  function setDate(iso: string | null) {
    start(async () => {
      try {
        if (iso == null) {
          await patchInitiative(workspaceSlug, initiative.slug_id, { clear_target_date: true });
        } else {
          await patchInitiative(workspaceSlug, initiative.slug_id, { target_date: iso });
        }
        router.refresh();
      } catch (e) {
        console.error("patch initiative target date failed", e);
      }
    });
  }

  const currentIso = initiative.target_date ? initiative.target_date.slice(0, 10) : "";

  return (
    <Popover
      align="start"
      width={260}
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-label="Target date">
          <PickerTrigger open={open}>
            <DateChipDisplay date={initiative.target_date} />
          </PickerTrigger>
        </button>
      )}
    >
      {({ close }) => (
        <MonthCalendar
          value={currentIso}
          onPick={(iso) => {
            setDate(iso === "" ? null : iso);
            close();
          }}
        />
      )}
    </Popover>
  );
}

function Pencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 13 L5 12.5 L13 4.5 L11.5 3 L3.5 11 L3 13Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Latest update preview block (after at least one update exists)
// ---------------------------------------------------------------------------

function LatestUpdate({ update, onWrite }: { update: InitiativeUpdate; onWrite: () => void }) {
  return (
    <div className="mt-6 rounded-md border border-border-subtle bg-elevated/40 p-4">
      <div className="flex items-center gap-2 text-small">
        {update.author && <Avatar initials={update.author.initials} color={update.author.color} size={18} />}
        <span className="font-medium text-text-primary">{update.author?.name ?? "Unknown"}</span>
        <span
          className="ml-1 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-micro"
          style={{ color: healthColor(update.health), background: `${healthColor(update.health)}1A` }}
        >
          <HealthIconSmall health={update.health} />
          {healthLabel(update.health)}
        </span>
        <span className="ml-auto text-mini text-text-tertiary">{fmtDateTime(update.created_at)}</span>
      </div>
      {update.body && (
        <p className="mt-3 whitespace-pre-wrap text-small text-text-secondary">{update.body}</p>
      )}
      <button
        type="button"
        onClick={onWrite}
        className="mt-3 text-mini text-text-tertiary hover:text-text-secondary"
      >
        Write new update
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity tab
// ---------------------------------------------------------------------------

function ActivityPanel({ updates, createdLabel }: { updates: InitiativeUpdate[]; createdLabel: string }) {
  return (
    <div className="space-y-3">
      <h2 className="text-small font-semibold text-text-primary">Activity</h2>
      {updates.length === 0 && (
        <div className="rounded-md border border-border-subtle bg-elevated/30 px-4 py-3 text-small text-text-tertiary">
          {createdLabel}
        </div>
      )}
      {updates.map((u) => (
        <div key={u.id} className="rounded-md border border-border-subtle bg-elevated/40 p-4 text-small">
          <div className="flex items-center gap-2">
            {u.author && <Avatar initials={u.author.initials} color={u.author.color} size={18} />}
            <span className="font-medium text-text-primary">{u.author?.name ?? "Unknown"}</span>
            <span
              className="ml-1 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-micro"
              style={{ color: healthColor(u.health), background: `${healthColor(u.health)}1A` }}
            >
              <HealthIconSmall health={u.health} />
              {healthLabel(u.health)}
            </span>
            <span className="ml-auto text-mini text-text-tertiary">{fmtDateTime(u.created_at)}</span>
          </div>
          {u.body && (
            <p className="mt-3 whitespace-pre-wrap text-text-secondary">{u.body}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects section (separate from overview but rendered at bottom of overview too)
// ---------------------------------------------------------------------------

function ProjectsSection({
  workspaceSlug,
  groups,
  members,
}: {
  workspaceSlug: string;
  groups: ProjectGroup[];
  members: Member[];
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-small font-semibold text-text-primary">Projects</h2>
        <span className="flex items-center gap-1">
          <button
            type="button"
            title="Display options"
            className="flex h-7 w-7 items-center justify-center rounded-pill border border-border-subtle text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <Sliders />
          </button>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("new-project:open"));
            }}
            title="New project"
            className="flex h-7 w-7 items-center justify-center rounded-pill border border-border-subtle text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <Plus size={12} />
          </button>
        </span>
      </div>
      {groups.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-border-subtle">
          <ProjectsTable
            groups={groups}
            workspace={workspaceSlug}
            showGroupHeaders
            members={members}
          />
        </div>
      ) : (
        <div className="rounded-md border border-border-subtle bg-elevated/30 px-4 py-6 text-center text-small text-text-tertiary">
          No projects yet. Use + above to add some.
        </div>
      )}
    </section>
  );
}

function Sliders() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h7M11 4h3M2 8h3M7 8h7M2 12h9M13 12h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="6" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Right rail
// ---------------------------------------------------------------------------

function RightRail({
  initiative,
  workspaceSlug,
  members,
}: {
  initiative: InitiativeDetail;
  workspaceSlug: string;
  members: Member[];
}) {
  return (
    <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-border-subtle px-4 py-4 lg:block">
      <RailPanel title="Properties">
        <RailRow label="Status">
          <StatusChipPicker workspaceSlug={workspaceSlug} initiative={initiative} />
        </RailRow>
        <RailRow label="Owner">
          <OwnerChipPicker workspaceSlug={workspaceSlug} initiative={initiative} members={members} />
        </RailRow>
        <RailRow label="Target date">
          <DateChipPicker workspaceSlug={workspaceSlug} initiative={initiative} />
        </RailRow>
      </RailPanel>

      <RailPanel title="Activity" trailing={<a className="text-mini text-text-tertiary hover:text-text-secondary">See all</a>}>
        <ActivityRow update={initiative.updates[0] ?? null} createdLabel={makeCreatedLabel(initiative)} />
      </RailPanel>
    </aside>
  );
}

function RailPanel({ title, trailing, children }: { title: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md border border-border-subtle bg-elevated/30">
      <header className="flex items-center justify-between px-3 py-2 text-mini">
        <span className="flex items-center gap-1 text-text-secondary">
          <span className="font-medium">{title}</span>
          <ChevronDown size={11} className="text-text-tertiary" />
        </span>
        {trailing}
      </header>
      <div className="px-3 pb-3 pt-1 text-small">{children}</div>
    </div>
  );
}

function RailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-1.5 flex items-start justify-between gap-3">
      <span className="text-text-tertiary">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function ActivityRow({ update, createdLabel }: { update: InitiativeUpdate | null; createdLabel: string }) {
  if (!update) {
    return (
      <div className="flex items-center gap-2 text-small text-text-secondary">
        <Compass size={12} className="text-text-tertiary" />
        <span className="flex-1 truncate">{createdLabel}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-small text-text-secondary">
      {update.author && <Avatar initials={update.author.initials} color={update.author.color} size={16} />}
      <span className="flex-1 truncate">
        <span className="text-text-primary">{update.author?.name ?? "Unknown"}</span>{" "}
        posted an update · {fmtDate(update.created_at)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Write update modal
// ---------------------------------------------------------------------------

function WriteUpdateModal({
  workspaceSlug,
  initiative,
  onClose,
}: {
  workspaceSlug: string;
  initiative: InitiativeDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const [health, setHealth] = useState<UpdateHealth>("onTrack");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await createInitiativeUpdate(workspaceSlug, initiative.slug_id, { health, body });
      onClose();
      router.refresh();
    } catch (e) {
      console.error("create initiative update failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1100] flex items-start justify-center bg-black/40 pt-24"
      onClick={onClose}
    >
      <div
        className="w-[920px] max-w-[92vw] rounded-lg border border-border-subtle bg-elevated shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <HealthPicker value={health} onChange={setHealth} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <X size={14} />
          </button>
        </div>
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share an update..."
          rows={6}
          className="block w-full resize-none border-y border-border-subtle bg-transparent px-5 py-4 text-small text-text-primary placeholder:text-text-quaternary focus:outline-none"
        />
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            title="Attach (coming soon)"
            className="rounded-md p-1.5 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
          >
            <Paperclip size={13} />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-accent px-3 py-1.5 text-mini font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Posting…" : "Post update"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HealthPicker({ value, onChange }: { value: UpdateHealth; onChange: (v: UpdateHealth) => void }) {
  const current = HEALTH_OPTIONS.find((h) => h.value === value) ?? HEALTH_OPTIONS[0];
  return (
    <Popover
      align="start"
      width={180}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-2 rounded-sm px-1.5 py-0.5 text-mini"
          style={{ color: current.color, background: `${current.color}1A` }}
        >
          <HealthIconSmall health={current.value} />
          <span>{current.label}</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1">
          {HEALTH_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); close(); }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-small hover:bg-row-hover"
              style={{ color: o.value === value ? o.color : undefined }}
            >
              <HealthIconSmall health={o.value} />
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InitiativeGlyph({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-sm"
      style={{ background: color, width: size, height: size }}
    >
      <Compass size={Math.round(size * 0.6)} className="text-white/80" />
    </span>
  );
}

function makeCreatedLabel(ini: InitiativeDetail): string {
  // We don't have a creator field on the initiative, so the right rail just
  // labels the creation as a generic event using the owner if present.
  const who = ini.owner?.name ?? "Someone";
  return `${who} created the initiative`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"] as const;
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${month} ${d.getDate()}`;
}

function fmtMdAbbr(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${month} ${ordinal(d.getDate())}`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
