"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import type { Team } from "@/lib/api";

const STATUSES: { value: string; label: string }[] = [
  { value: "all", label: "All states" },
  { value: "planned", label: "Planned" },
  { value: "started", label: "Started" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

export function RoadmapFilters({
  teams,
  status,
  team,
  groupBy,
}: {
  teams: Team[];
  status: string;
  team: string;
  groupBy: "initiative" | "team";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 border-b border-border-subtle px-5 py-2 text-mini text-text-secondary">
      <Filter size={11} className="text-text-tertiary" />
      <Pill label="Status" value={status} onChange={(v) => update("status", v)} options={STATUSES} />
      <Pill
        label="Team"
        value={team}
        onChange={(v) => update("team", v)}
        options={[{ value: "all", label: "All teams" }, ...teams.map((t) => ({ value: t.key, label: t.key }))]}
      />
      <Pill
        label="Group"
        value={groupBy}
        onChange={(v) => update("group", v)}
        options={[
          { value: "initiative", label: "Initiative" },
          { value: "team", label: "Team" },
        ]}
      />
    </div>
  );
}

function Pill({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1 rounded-md bg-pill px-1.5 py-0.5">
      <span className="text-text-tertiary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-text-secondary outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
