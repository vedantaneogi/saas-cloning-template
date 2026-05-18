"use client";

import { BoardView } from "@/components/board-view";
import { IssueListBody } from "@/components/issue-list-body";
import { TeamIssuesInsights } from "@/components/team-issues-insights";
import { useTeamIssuesPrefs } from "@/lib/team-issues-prefs";
import type { Issue, Label, Project, StateGroup } from "@/lib/api";

/**
 * Client wrapper around the team issues list / board. Reads the per-team
 * display prefs to mount the right-side insights panel and to forward
 * display-property toggles into the row renderer.
 */
export function TeamIssuesBody({
  workspaceSlug,
  teamKey,
  display,
  groups,
  issues,
  labels,
  projects,
}: {
  workspaceSlug: string;
  teamKey: string;
  display: "list" | "board";
  groups: { name: string; group: StateGroup; issues: Issue[] }[];
  issues: Issue[];
  labels: Label[];
  projects: Project[];
}) {
  const { prefs } = useTeamIssuesPrefs(workspaceSlug, teamKey);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={display === "board" ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto"}>
        {display === "board" ? (
          <BoardView groups={groups} workspaceSlug={workspaceSlug} teamKey={teamKey} />
        ) : (
          <IssueListBody
            groups={groups}
            workspaceSlug={workspaceSlug}
            teamKey={teamKey}
          />
        )}
      </div>
      {prefs.insights_open && (
        <TeamIssuesInsights
          workspaceSlug={workspaceSlug}
          teamKey={teamKey}
          issues={issues}
          labels={labels}
          projects={projects}
        />
      )}
    </div>
  );
}
