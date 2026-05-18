import { InitiativesBody } from "@/components/initiatives-body";
import {
  getWorkspace,
  listInitiatives,
  listMembers,
  type Initiative,
  type Member,
  type Team,
} from "@/lib/api";

type SearchParams = Record<string, string | string[] | undefined>;
type Base = "active" | "planned" | "completed";

/**
 * /initiatives — workspace-wide initiatives list.
 *
 * Server-renders the initial list + members/teams so the body can do
 * client-side filtering, grouping, and column toggling without a
 * follow-up fetch on first paint.
 */
export default async function InitiativesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { workspace } = await params;
  const sp = await searchParams;
  const base: Base =
    sp.base === "planned" || sp.base === "completed" ? sp.base : "active";

  const [initiatives, ws, members] = await Promise.all([
    listInitiatives(workspace).catch(() => [] as Initiative[]),
    getWorkspace(workspace).catch(() => null),
    listMembers(workspace).catch(() => [] as Member[]),
  ]);
  const teams: Team[] = ws?.teams ?? [];

  return (
    <InitiativesBody
      workspaceSlug={workspace}
      initiatives={initiatives}
      members={members}
      teams={teams}
      initialBase={base}
    />
  );
}
