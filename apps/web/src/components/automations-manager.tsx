"use client";

import { useState } from "react";
import { Plus, Trash2, Play, Zap } from "lucide-react";
import {
  createAutomation,
  deleteAutomation,
  runScheduledAutomations,
  updateAutomation,
  type Automation,
  type AutomationAction,
  type AutomationTrigger,
  type Team,
} from "@/lib/api";

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_issue_create: "When an issue is created",
  on_status_change: "When status changes",
  on_label_added: "When a label is added",
  on_cycle_end: "When a cycle ends",
  stale_in_state: "When stale in a state (scheduled)",
};

const ACTION_LABELS: Record<AutomationAction, string> = {
  move_to_state: "Move to state group",
  assign_to_member: "Assign to member",
  add_label: "Add label",
  add_comment: "Add comment",
  archive: "Archive",
  set_priority: "Set priority",
  rotate_assign: "Round-robin assign",
};

const PRESETS: { name: string; trigger: AutomationTrigger; trigger_config: Record<string, unknown>; action: AutomationAction; action_config: Record<string, unknown> }[] = [
  {
    name: "Archive completed issues",
    trigger: "on_status_change",
    trigger_config: { to_state_group: "completed" },
    action: "archive",
    action_config: {},
  },
  {
    name: "Auto-close stale started issues (14d)",
    trigger: "stale_in_state",
    trigger_config: { state_group: "started", days: 14 },
    action: "move_to_state",
    action_config: { state_group: "canceled" },
  },
  {
    name: "Comment on new triage",
    trigger: "on_issue_create",
    trigger_config: {},
    action: "add_comment",
    action_config: { body: "Thanks — your issue has been received." },
  },
];

export function AutomationsManager({
  workspaceSlug,
  initial,
  teams,
}: {
  workspaceSlug: string;
  initial: Automation[];
  teams: Team[];
}) {
  const [items, setItems] = useState<Automation[]>(initial);
  const [busy, setBusy] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function addPreset(p: (typeof PRESETS)[number]) {
    setBusy(true);
    try {
      const created = await createAutomation(workspaceSlug, p);
      setItems((prev) => [created, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(rule: Automation) {
    const updated = await updateAutomation(workspaceSlug, rule.id, { enabled: !rule.enabled });
    setItems((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
  }

  async function remove(id: string) {
    if (!confirm("Delete rule?")) return;
    await deleteAutomation(workspaceSlug, id);
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  async function runScheduled() {
    setBusy(true);
    try {
      const out = await runScheduledAutomations(workspaceSlug);
      setLastRun(`Applied ${out.applied} action${out.applied === 1 ? "" : "s"} across ${Object.keys(out.by_rule).length} rule${Object.keys(out.by_rule).length === 1 ? "" : "s"}.`);
    } catch {
      setLastRun("Run failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-mini text-text-secondary">
        <span className="text-text-tertiary">Add from preset:</span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            disabled={busy}
            onClick={() => addPreset(p)}
            className="rounded-md border border-border-subtle px-2 py-0.5 hover:bg-elevated-hover disabled:opacity-50"
          >
            {p.name}
          </button>
        ))}
        <button
          disabled={busy}
          onClick={runScheduled}
          className="ml-auto flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-mini font-medium text-white shadow-button hover:opacity-90 disabled:opacity-50"
        >
          <Play size={11} />
          Run scheduled rules now
        </button>
      </div>
      {lastRun && <p className="mb-3 text-mini text-text-tertiary">{lastRun}</p>}

      {items.length === 0 ? (
        <div className="rounded-md border border-border-subtle py-12 text-center text-small text-text-tertiary">
          No rules yet. Pick a preset above.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-md border border-border-subtle px-3 py-2">
              <Zap size={14} className={r.enabled ? "text-accent" : "text-text-tertiary"} />
              <div className="min-w-0 flex-1">
                <div className="text-small font-medium text-text-primary">{r.name}</div>
                <div className="mt-0.5 text-mini text-text-tertiary">
                  {TRIGGER_LABELS[r.trigger]} → {ACTION_LABELS[r.action]}
                  {r.team_key && <span className="ml-2 rounded-sm bg-pill px-1.5 py-0.5 text-text-tertiary">{r.team_key}</span>}
                </div>
              </div>
              <button
                onClick={() => toggle(r)}
                className={
                  "rounded-md px-2 py-1 text-mini " +
                  (r.enabled ? "bg-accent text-white" : "bg-pill text-text-secondary")
                }
              >
                {r.enabled ? "Enabled" : "Disabled"}
              </button>
              <button
                onClick={() => remove(r.id)}
                className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-priority-urgent"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {teams.length === 0 && (
        <p className="mt-3 text-mini text-text-tertiary">No teams yet — workspace-wide rules will apply across all teams once they exist.</p>
      )}
    </div>
  );
}
