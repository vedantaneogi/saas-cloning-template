"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, X } from "lucide-react";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";
import { fetchJsonForClient, type Team } from "@/lib/api";

export function ProjectTeamsPanel({
  workspaceSlug,
  projectSlug,
  initial,
  allTeams,
}: {
  workspaceSlug: string;
  projectSlug: string;
  initial: Team[];
  allTeams: Team[];
}) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>(initial);

  async function toggle(team: Team) {
    const has = teams.some((t) => t.id === team.id);
    const next = has ? teams.filter((t) => t.id !== team.id) : [...teams, team];
    setTeams(next);
    await fetchJsonForClient(
      `/api/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectSlug)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_ids: next.map((t) => t.id) }),
      }
    );
    router.refresh();
  }

  if (allTeams.length <= 1 && teams.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Layers size={12} className="text-text-tertiary" />
      {teams.map((t) => (
        <span key={t.id} className="flex items-center gap-1 rounded-pill bg-pill px-1.5 py-0.5 text-mini text-text-secondary">
          <span className="inline-block h-2 w-2 rounded-pill" style={{ background: t.icon_color }} />
          {t.key}
          <button
            type="button"
            onClick={() => toggle(t)}
            className="text-text-tertiary hover:text-priority-urgent"
            title="Remove team"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <Popover
        trigger={({ toggle: togglePop }) => (
          <button
            onClick={togglePop}
            className="flex items-center gap-1 rounded-pill border border-dashed border-border-subtle px-1.5 py-0.5 text-mini text-text-tertiary hover:bg-row-hover"
          >
            <Plus size={10} />
            {teams.length === 0 ? "Add team" : "More"}
          </button>
        )}
        width={180}
      >
        {({ close }) => (
          <PopoverList>
            {allTeams.map((t) => {
              const has = teams.some((x) => x.id === t.id);
              return (
                <PopoverItem
                  key={t.id}
                  active={has}
                  onClick={async () => {
                    close();
                    await toggle(t);
                  }}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-pill" style={{ background: t.icon_color }} />
                  <span>{t.name}</span>
                  <span className="ml-auto font-mono text-mini text-text-tertiary">{t.key}</span>
                </PopoverItem>
              );
            })}
          </PopoverList>
        )}
      </Popover>
    </div>
  );
}
