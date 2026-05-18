import { notFound } from "next/navigation";
import Link from "next/link";
import { GitBranch, MoreHorizontal, Users, Archive, Copy, Link as LinkIconLucide } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Avatar, PriorityIcon, StatusIcon } from "@/components/icons";
import { IssueProperties } from "@/components/issue-properties";
import { IssueTitle, IssueDescription } from "@/components/issue-title";
import { CommentThread } from "@/components/comment-thread";
import { IssueLinksPanel } from "@/components/issue-links-panel";
import { SubIssuesPanel } from "@/components/sub-issues-panel";
import { RelationsPanel } from "@/components/relations-panel";
import { SubscribeButton } from "@/components/subscribe-button";
import {
  getIssue,
  getWorkspace,
  listIssueCustomerRequests,
  listMembers,
  NotFoundError,
  type CustomerRequest,
  type IssueDetail,
  type Member,
  type Team,
} from "@/lib/api";
import { IssueActionsWithConvert } from "@/components/issue-actions-with-convert";
import { relTime } from "@/lib/time";

export default async function IssueDetailPage({ params }: { params: Promise<{ workspace: string; identifier: string }> }) {
  const { workspace, identifier } = await params;
  let issue: IssueDetail;
  try {
    issue = await getIssue(workspace, identifier);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const [customerRequests, members, ws] = await Promise.all([
    listIssueCustomerRequests(workspace, identifier).catch(() => [] as CustomerRequest[]),
    listMembers(workspace).catch(() => [] as Member[]),
    getWorkspace(workspace).catch(() => null),
  ]);
  const teams: Team[] = ws?.teams ?? [];
  return <IssueView workspace={workspace} issue={issue} customerRequests={customerRequests} members={members} teams={teams} />;
}

function relationVerb(t: string) {
  if (t === "blocks") return "is blocking";
  if (t === "blocked_by") return "is blocked by";
  if (t === "duplicate") return "duplicates";
  return "relates to";
}

function IssueView({ workspace, issue, customerRequests, members, teams }: { workspace: string; issue: IssueDetail; customerRequests: CustomerRequest[]; members: Member[]; teams: Team[] }) {
  return (
    <>
      <Topbar
        title={issue.identifier + " " + truncate(issue.title, 80)}
        icon={<StatusIcon group={issue.state.group} />}
        trailing={
          <IssueActionsWithConvert
            workspaceSlug={workspace}
            identifier={issue.identifier}
            isArchived={!!issue.archived_at}
            currentTeamKey={issue.team.key}
            teams={teams}
            parentIdentifier={issue.parent_identifier}
          />
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-12 py-10">
          <div className="mx-auto max-w-[760px]">
            {issue.archived_at && (
              <div className="mb-3 flex items-center gap-2 rounded-md border border-border-strong bg-pill px-3 py-2 text-mini text-text-tertiary">
                <Archive size={12} />
                <span>This issue is archived.</span>
              </div>
            )}

            {issue.parent_identifier && (
              <div className="mb-2 text-mini text-text-tertiary">
                Sub-issue of{" "}
                <Link href={`/${workspace}/issue/${issue.parent_identifier}`} className="text-text-secondary hover:underline">
                  {issue.parent_identifier}
                </Link>
              </div>
            )}

            <IssueTitle workspaceSlug={workspace} identifier={issue.identifier} initial={issue.title} />

            <IssueDescription
              workspaceSlug={workspace}
              identifier={issue.identifier}
              initial={issue.description}
            />

            <IssueLinksPanel workspaceSlug={workspace} identifier={issue.identifier} links={issue.links} />

            {customerRequests.length > 0 && (
              <section className="mt-8 rounded-md border border-border-subtle">
                <header className="flex items-center gap-2 px-3 py-2 text-mini text-text-tertiary">
                  <Users size={12} />
                  <span className="font-medium text-text-secondary">Customer requests</span>
                  <span>{customerRequests.length}</span>
                </header>
                <ul>
                  {customerRequests.map((cr) => (
                    <li key={cr.id} className="flex h-[40px] items-center gap-2 border-t border-border-subtle pl-3 pr-3 text-small">
                      <span className="rounded-sm bg-pill px-1.5 py-0.5 text-micro text-text-tertiary">{cr.source}</span>
                      <span className="font-medium text-text-primary">{cr.customer_name}</span>
                      <span className="truncate text-text-secondary">{cr.title}</span>
                      <Link
                        href={`/${workspace}/customer-requests`}
                        className="ml-auto rounded-sm bg-pill px-1.5 py-0.5 text-micro text-text-tertiary hover:bg-row-hover"
                      >
                        {cr.status}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <SubIssuesPanel
              workspaceSlug={workspace}
              parentIdentifier={issue.identifier}
              teamKey={issue.team.key}
              subIssues={issue.sub_issues}
            />

            <section className="mt-10">
              <header className="flex items-center justify-between text-mini text-text-tertiary">
                <span className="font-medium text-text-secondary">Activity</span>
                <SubscribeButton
                  workspaceSlug={workspace}
                  identifier={issue.identifier}
                  initialSubscribed={!!issue.subscribed}
                />
              </header>
              <ul className="mt-3 space-y-3 text-small">
                {(() => {
                  const creator = issue.creator ?? issue.assignee;
                  const createdAt = issue.created_at ?? issue.updated_at;
                  if (!creator) return null;
                  return (
                    <li className="flex items-center gap-2 text-text-tertiary">
                      <Avatar initials={creator.initials} color={creator.color} size={18} />
                      <span className="text-text-secondary">{creator.name}</span>
                      <span>created the issue · {relTime(createdAt)} ago</span>
                    </li>
                  );
                })()}
                {issue.relations.map((r, i) => (
                  <li key={`${r.type}-${r.target_identifier}-${i}`} className="flex items-center gap-2 text-text-tertiary">
                    <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-pill bg-row-hover">
                      {r.type === "blocks" || r.type === "blocked_by" ? (
                        <GitBranch size={12} className="text-priority-urgent" />
                      ) : r.type === "duplicate" ? (
                        <Copy size={12} className="text-text-tertiary" />
                      ) : (
                        <LinkIconLucide size={12} className="text-text-tertiary" />
                      )}
                    </span>
                    <span>{relationVerb(r.type)}</span>
                    <Link href={`/${workspace}/issue/${r.target_identifier}`} className="text-text-secondary hover:underline">
                      {r.target_identifier} {r.target_title}
                    </Link>
                  </li>
                ))}
              </ul>

              <CommentThread
                workspaceSlug={workspace}
                identifier={issue.identifier}
                comments={issue.comments}
                members={members}
              />
            </section>
          </div>
        </div>

        <aside className="w-[290px] shrink-0 border-l border-border-subtle px-4 py-5 text-small">
          <IssueProperties workspaceSlug={workspace} issue={issue} />

          <RelationsPanel
            workspaceSlug={workspace}
            identifier={issue.identifier}
            relations={issue.relations}
          />

          {(issue.subscribers && issue.subscribers.length > 0) && (
            <Section title={`Subscribers · ${issue.subscribers.length}`}>
              <div className="flex flex-wrap gap-1.5">
                {issue.subscribers.map((s) => (
                  <span key={s.id} className="flex items-center gap-1 rounded-pill bg-pill px-1.5 py-0.5 text-mini text-text-secondary">
                    <Avatar initials={s.initials} color={s.color} size={14} />
                    {s.name}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </aside>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-1 flex w-full items-center justify-between text-mini text-text-tertiary">
        <span>{title}</span>
        <MoreHorizontal size={12} />
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
