"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import clsx from "clsx";
import { useSelection } from "@/components/selection-context";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import { Avatar, PriorityIcon, StatusIcon } from "@/components/icons";
import {
  bulkDeleteIssues,
  bulkPatchIssues,
  listMembers,
  listTeamStates,
  type Member,
  type WorkflowState,
} from "@/lib/api";

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"] as const;

export function BulkActionBar({
  workspaceSlug,
  teamKey,
}: {
  workspaceSlug: string;
  teamKey: string;
}) {
  const sel = useSelection();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    listTeamStates(workspaceSlug, teamKey).then(setStates).catch(() => {});
    listMembers(workspaceSlug).then(setMembers).catch(() => {});
  }, [workspaceSlug, teamKey]);

  // Escape clears selection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && sel && sel.count > 0) {
        sel.clear();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  if (!sel || sel.count === 0) return null;

  const ids = Array.from(sel.selected);

  function runPatch(patch: Parameters<typeof bulkPatchIssues>[2]) {
    startTransition(async () => {
      try {
        await bulkPatchIssues(workspaceSlug, ids, patch);
        sel!.clear();
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  function runDelete() {
    if (!confirm(`Delete ${ids.length} issue${ids.length === 1 ? "" : "s"}?`)) return;
    startTransition(async () => {
      try {
        await bulkDeleteIssues(workspaceSlug, ids);
        sel!.clear();
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-border-default bg-elevated px-3 py-2 shadow-popover">
        <span className="rounded-pill bg-accent px-2 py-0.5 text-mini font-medium text-white">
          {sel.count}
        </span>
        <span className="text-small text-text-secondary">selected</span>

        <div className="mx-2 h-4 w-px bg-border-subtle" />

        <Popover
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="rounded-md px-2 py-1 text-mini text-text-secondary hover:bg-row-hover"
            >
              Status
            </button>
          )}
          width={220}
        >
          {({ close }) => (
            <PopoverList>
              {states.map((s) => (
                <PopoverItem
                  key={s.id}
                  onClick={() => {
                    close();
                    runPatch({ state_id: s.id });
                  }}
                >
                  <StatusIcon group={s.group} />
                  {s.name}
                </PopoverItem>
              ))}
            </PopoverList>
          )}
        </Popover>

        <Popover
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="rounded-md px-2 py-1 text-mini text-text-secondary hover:bg-row-hover"
            >
              Priority
            </button>
          )}
          width={200}
        >
          {({ close }) => (
            <PopoverList>
              {[1, 2, 3, 4, 0].map((p) => (
                <PopoverItem
                  key={p}
                  onClick={() => {
                    close();
                    runPatch({ priority: p });
                  }}
                >
                  <PriorityIcon value={p as 0 | 1 | 2 | 3 | 4} />
                  {PRIORITY_LABELS[p]}
                </PopoverItem>
              ))}
            </PopoverList>
          )}
        </Popover>

        <Popover
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              className="rounded-md px-2 py-1 text-mini text-text-secondary hover:bg-row-hover"
            >
              Assignee
            </button>
          )}
          width={220}
        >
          {({ close }) => (
            <PopoverList>
              <PopoverItem
                onClick={() => {
                  close();
                  runPatch({ clear_assignee: true });
                }}
              >
                <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
                No assignee
              </PopoverItem>
              {members.map((m) => (
                <PopoverItem
                  key={m.id}
                  onClick={() => {
                    close();
                    runPatch({ assignee_id: m.id });
                  }}
                >
                  <Avatar initials={m.initials} color={m.color} size={18} />
                  {m.name}
                </PopoverItem>
              ))}
            </PopoverList>
          )}
        </Popover>

        <button
          onClick={runDelete}
          className={clsx(
            "flex items-center gap-1 rounded-md px-2 py-1 text-mini text-priority-urgent hover:bg-row-hover",
            pending && "opacity-50"
          )}
          disabled={pending}
        >
          <Trash2 size={12} />
          Delete
        </button>

        <div className="mx-1 h-4 w-px bg-border-subtle" />

        <button
          onClick={() => sel.clear()}
          aria-label="Clear selection"
          className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-text-secondary"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
