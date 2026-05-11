import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Paperclip, Link2, GitBranch, MoreHorizontal, Users } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Avatar, PriorityIcon, StatusIcon, SubIssueProgress } from "@/components/icons";
import { IssueProperties } from "@/components/issue-properties";
import { IssueTitle, IssueDescription } from "@/components/issue-title";
import { IssueActions } from "@/components/issue-actions";
import { CommentComposer } from "@/components/comment-composer";
import {
  getIssue,
  listIssueCustomerRequests,
  NotFoundError,
  type CustomerRequest,
  type IssueDetail,
} from "@/lib/api";

export default async function IssueDetailPage({ params }: { params: Promise<{ workspace: string; identifier: string }> }) {
  const { workspace, identifier } = await params;
  let issue: IssueDetail;
  try {
    issue = await getIssue(workspace, identifier);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const customerRequests = await listIssueCustomerRequests(workspace, identifier).catch(() => [] as CustomerRequest[]);
  return <IssueView workspace={workspace} issue={issue} customerRequests={customerRequests} />;
}

function IssueView({ workspace, issue, customerRequests }: { workspace: string; issue: IssueDetail; customerRequests: CustomerRequest[] }) {
  return (
    <>
      <Topbar
        title={issue.identifier + " " + truncate(issue.title, 80)}
        icon={<StatusIcon group={issue.state.group} />}
        trailing={<IssueActions workspaceSlug={workspace} identifier={issue.identifier} />}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-12 py-10">
          <div className="mx-auto max-w-[760px]">
            <IssueTitle workspaceSlug={workspace} identifier={issue.identifier} initial={issue.title} />

            <IssueDescription
              workspaceSlug={workspace}
              identifier={issue.identifier}
              initial={issue.description}
            />

            <div className="mt-6 flex items-center gap-3 text-mini text-text-tertiary">
              <Paperclip size={14} />
              <Link2 size={14} />
            </div>

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

            {issue.sub_issues.length > 0 && (
              <section className="mt-8 rounded-md border border-border-subtle">
                <header className="flex items-center gap-2 px-3 py-2 text-mini text-text-tertiary">
                  <ChevronDown size={12} />
                  <span className="font-medium text-text-secondary">Sub-issues</span>
                  <span className="flex items-center gap-1">
                    <SubIssueProgress
                      done={issue.sub_issues.filter((s) => s.state.group === "completed").length}
                      total={issue.sub_issues.length}
                    />
                    <span>
                      {issue.sub_issues.filter((s) => s.state.group === "completed").length}/{issue.sub_issues.length}
                    </span>
                  </span>
                </header>
                <ul>
                  {issue.sub_issues.map((s) => (
                    <li key={s.identifier}>
                      <Link
                        href={`/${workspace}/issue/${s.identifier}`}
                        className="flex h-[34px] items-center gap-2 border-t border-border-subtle pl-3 pr-3 text-small hover:bg-row-hover"
                      >
                        <PriorityIcon value={s.priority} />
                        <span className="w-14 shrink-0 font-mono text-mini text-text-tertiary">{s.identifier}</span>
                        <StatusIcon group={s.state.group} />
                        <span className="flex-1 truncate text-text-primary">{s.title}</span>
                        {s.assignee ? (
                          <Avatar initials={s.assignee.initials} color={s.assignee.color} size={18} />
                        ) : (
                          <span className="inline-block h-[18px] w-[18px] rounded-pill border border-dashed border-border-strong" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-10">
              <header className="flex items-center justify-between text-mini text-text-tertiary">
                <span className="font-medium text-text-secondary">Activity</span>
                <button className="hover:text-text-secondary">Unsubscribe</button>
              </header>
              <ul className="mt-3 space-y-3 text-small">
                {issue.assignee && (
                  <li className="flex items-center gap-2 text-text-tertiary">
                    <Avatar initials={issue.assignee.initials} color={issue.assignee.color} size={18} />
                    <span className="text-text-secondary">{issue.assignee.name}</span>
                    <span>created the issue · 12min ago</span>
                  </li>
                )}
                {issue.relations.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-text-tertiary">
                    <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-pill bg-priority-urgent/15">
                      <GitBranch size={12} className="text-priority-urgent" />
                    </span>
                    <span>marked this issue as {r.type === "blocks" ? "blocking" : r.type}</span>
                    <Link href={`/${workspace}/issue/${r.target_identifier}`} className="text-text-secondary hover:underline">
                      {r.target_identifier} {r.target_title}
                    </Link>
                    <span>· 11min ago</span>
                  </li>
                ))}
              </ul>

              {issue.comments.map((c) => (
                <div key={c.id} className="mt-5 flex gap-3">
                  <Avatar
                    initials={c.author?.initials ?? "?"}
                    color={c.author?.color ?? "#5e6ad2"}
                    size={24}
                  />
                  <div className="flex-1 rounded-md border border-border-subtle bg-elevated p-3">
                    <header className="flex items-center gap-2 text-mini text-text-tertiary">
                      <span className="text-small font-medium text-text-primary">{c.author?.name ?? "Unknown"}</span>
                      <span>11min ago</span>
                    </header>
                    <p className="mt-1 text-small text-text-secondary">{c.body}</p>
                  </div>
                </div>
              ))}

              <CommentComposer workspaceSlug={workspace} identifier={issue.identifier} />
            </section>
          </div>
        </div>

        <aside className="w-[260px] shrink-0 border-l border-border-subtle p-4 text-small">
          <IssueProperties workspaceSlug={workspace} issue={issue} />

          {issue.relations.length > 0 && (
            <Section title="Relations">
              <div className="text-mini text-text-tertiary">Blocking</div>
              {issue.relations.map((r) => (
                <Link
                  key={r.target_identifier}
                  href={`/${workspace}/issue/${r.target_identifier}`}
                  className="flex items-center gap-1.5 truncate rounded-md px-1 py-1 hover:bg-row-hover"
                >
                  <PriorityIcon value={r.target_priority} />
                  <StatusIcon group={r.target_state_group} />
                  <span className="truncate">{r.target_title}</span>
                </Link>
              ))}
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
      <button className="mb-1 flex w-full items-center justify-between text-mini text-text-tertiary">
        <span>{title}</span>
        <MoreHorizontal size={12} />
      </button>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
