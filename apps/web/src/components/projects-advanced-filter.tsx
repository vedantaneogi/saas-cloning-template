"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import clsx from "clsx";
import type { Label, Member } from "@/lib/api";
import type {
  AdvancedRule,
  AdvancedRuleField,
  AdvancedRuleOperator,
  ProjectsPrefs,
} from "@/lib/projects-prefs";

const FIELDS: { value: AdvancedRuleField; label: string; operators: AdvancedRuleOperator[] }[] = [
  { value: "name", label: "Name", operators: ["contains", "equals", "not_equals"] },
  { value: "status", label: "Status", operators: ["equals", "not_equals"] },
  { value: "priority", label: "Priority", operators: ["equals", "not_equals", "gt", "lt"] },
  { value: "health", label: "Health", operators: ["equals", "not_equals"] },
  { value: "lead", label: "Lead", operators: ["equals", "not_equals"] },
  { value: "creator", label: "Creator", operators: ["equals", "not_equals"] },
  { value: "issue_count", label: "Issue count", operators: ["equals", "gt", "lt"] },
  { value: "label", label: "Label", operators: ["contains", "equals", "not_equals"] },
];

const OPERATOR_LABELS: Record<AdvancedRuleOperator, string> = {
  contains: "contains",
  equals: "is",
  not_equals: "is not",
  gt: ">",
  lt: "<",
  in: "in",
};

export function ProjectsAdvancedFilter({
  prefs,
  update,
  labels,
  members,
}: {
  prefs: ProjectsPrefs;
  update: (patch: Partial<ProjectsPrefs>) => void;
  labels: Label[];
  members: Member[];
}) {
  const rules = prefs.advanced_rules;

  function addRule() {
    const next: AdvancedRule = {
      id: cryptoId(),
      field: "status",
      operator: "equals",
      value: "started",
    };
    update({ advanced_rules: [...rules, next] });
  }

  function patchRule(id: string, patch: Partial<AdvancedRule>) {
    update({
      advanced_rules: rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }

  function removeRule(id: string) {
    update({ advanced_rules: rules.filter((r) => r.id !== id) });
  }

  function clear() {
    update({ advanced_rules: [] });
  }

  return (
    <div className="max-h-[420px] overflow-y-auto px-2.5 py-2">
      <p className="pb-2 text-mini text-text-tertiary">
        Rules combine with AND. Each row narrows the result further.
      </p>
      {rules.length === 0 && (
        <div className="rounded-md border border-dashed border-border-subtle px-2 py-3 text-center text-mini text-text-tertiary">
          No advanced rules yet.
        </div>
      )}
      {rules.map((rule) => (
        <RuleRow
          key={rule.id}
          rule={rule}
          labels={labels}
          members={members}
          onPatch={(p) => patchRule(rule.id, p)}
          onRemove={() => removeRule(rule.id)}
        />
      ))}
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={addRule}
          className="inline-flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-mini text-text-secondary hover:bg-elevated-hover"
        >
          <Plus size={11} /> Add rule
        </button>
        {rules.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-mini text-text-tertiary hover:text-priority-urgent"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  labels,
  members,
  onPatch,
  onRemove,
}: {
  rule: AdvancedRule;
  labels: Label[];
  members: Member[];
  onPatch: (patch: Partial<AdvancedRule>) => void;
  onRemove: () => void;
}) {
  const fieldDef = FIELDS.find((f) => f.value === rule.field) ?? FIELDS[0];
  return (
    <div className="mb-1.5 flex items-center gap-1.5 rounded-md border border-border-subtle bg-elevated/30 p-1.5">
      <select
        value={rule.field}
        onChange={(e) => onPatch({ field: e.target.value as AdvancedRuleField })}
        className={selectClass}
      >
        {FIELDS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <select
        value={rule.operator}
        onChange={(e) => onPatch({ operator: e.target.value as AdvancedRuleOperator })}
        className={selectClass}
      >
        {fieldDef.operators.map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>
      <ValueInput rule={rule} labels={labels} members={members} onPatch={onPatch} />
      <button
        type="button"
        onClick={onRemove}
        className="rounded-md p-1 text-text-tertiary hover:bg-row-hover hover:text-priority-urgent"
        aria-label="Remove rule"
      >
        <X size={11} />
      </button>
    </div>
  );
}

function ValueInput({
  rule,
  labels,
  members,
  onPatch,
}: {
  rule: AdvancedRule;
  labels: Label[];
  members: Member[];
  onPatch: (patch: Partial<AdvancedRule>) => void;
}) {
  if (rule.field === "status") {
    return (
      <select value={rule.value} onChange={(e) => onPatch({ value: e.target.value })} className={selectClass}>
        {["planned", "started", "paused", "completed", "canceled"].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    );
  }
  if (rule.field === "health") {
    return (
      <select value={rule.value} onChange={(e) => onPatch({ value: e.target.value })} className={selectClass}>
        {["onTrack", "atRisk", "offTrack", "noUpdate"].map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    );
  }
  if (rule.field === "priority") {
    return (
      <select value={rule.value} onChange={(e) => onPatch({ value: e.target.value })} className={selectClass}>
        <option value="0">No priority</option>
        <option value="1">Urgent</option>
        <option value="2">High</option>
        <option value="3">Medium</option>
        <option value="4">Low</option>
      </select>
    );
  }
  if (rule.field === "lead" || rule.field === "creator") {
    return (
      <select value={rule.value} onChange={(e) => onPatch({ value: e.target.value })} className={selectClass}>
        <option value="">(any)</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    );
  }
  if (rule.field === "label") {
    return (
      <select value={rule.value} onChange={(e) => onPatch({ value: e.target.value })} className={selectClass}>
        <option value="">(any)</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      value={rule.value}
      onChange={(e) => onPatch({ value: e.target.value })}
      placeholder="Value"
      className={clsx(selectClass, "flex-1 min-w-0")}
    />
  );
}

const selectClass =
  "rounded-md bg-app/40 px-1.5 py-1 text-mini text-text-primary focus:outline-none";

function cryptoId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}
