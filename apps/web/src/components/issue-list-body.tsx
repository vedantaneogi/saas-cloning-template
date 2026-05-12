"use client";

import { useEffect } from "react";
import { IssueGroup } from "@/components/issue-group";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { SelectionProvider, useSelection } from "@/components/selection-context";
import type { Issue, StateGroup } from "@/lib/api";

export function IssueListBody({
  groups,
  workspaceSlug,
  teamKey,
}: {
  groups: { name: string; group: StateGroup; issues: Issue[] }[];
  workspaceSlug: string;
  teamKey: string;
}) {
  return (
    <SelectionProvider>
      <ListInner groups={groups} workspaceSlug={workspaceSlug} teamKey={teamKey} />
      <BulkActionBar workspaceSlug={workspaceSlug} teamKey={teamKey} />
    </SelectionProvider>
  );
}

function ListInner({
  groups,
  workspaceSlug,
  teamKey,
}: {
  groups: { name: string; group: StateGroup; issues: Issue[] }[];
  workspaceSlug: string;
  teamKey: string;
}) {
  const sel = useSelection();
  const flat = groups.flatMap((g) => g.issues.map((i) => i.identifier));

  useEffect(() => {
    sel?.registerOrder(flat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat.join("|")]);

  if (groups.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-small text-text-tertiary">
        No issues match these filters.
      </div>
    );
  }
  return (
    <>
      {groups.map((g) => {
        const stateId = g.issues[0]?.state.id;
        return (
          <IssueGroup
            key={g.name}
            title={g.name}
            group={g.group}
            count={g.issues.length}
            issues={g.issues}
            workspaceSlug={workspaceSlug}
            teamKey={teamKey}
            stateId={stateId}
            stateName={g.issues[0]?.state.name}
          />
        );
      })}
    </>
  );
}
