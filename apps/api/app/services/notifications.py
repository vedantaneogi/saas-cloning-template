"""Notification event emitters. Called from mutation routes after the commit
that produced the change. Helpers add `Notification` rows and let the caller
flush — they don't commit on their own."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models import (
    Comment,
    CommentReaction,
    Issue,
    Member,
    Notification,
    NotificationKind,
    Team,
    Workspace,
    WorkflowState,
)


def _workspace_id_for_issue(issue: Issue) -> str:
    return issue.team.workspace_id if issue.team else ""


def _add(db: Session, *, workspace_id: str, recipient_id: str, actor_id: str | None, kind: NotificationKind, issue_id: str | None = None, comment_id: str | None = None, body: str | None = None) -> None:
    if not recipient_id:
        return
    if actor_id and actor_id == recipient_id:
        # Don't notify yourself about your own actions
        return
    db.add(Notification(
        workspace_id=workspace_id,
        recipient_id=recipient_id,
        actor_id=actor_id,
        kind=kind,
        issue_id=issue_id,
        comment_id=comment_id,
        body=body,
    ))


def issue_assigned(db: Session, *, issue: Issue, previous_assignee_id: str | None, actor_id: str | None) -> None:
    if not issue.assignee_id or issue.assignee_id == previous_assignee_id:
        return
    _add(
        db,
        workspace_id=_workspace_id_for_issue(issue),
        recipient_id=issue.assignee_id,
        actor_id=actor_id,
        kind=NotificationKind.assigned,
        issue_id=issue.id,
        body=f"assigned {issue.identifier} to you",
    )


def issue_status_changed(db: Session, *, issue: Issue, previous_state_name: str | None, new_state_name: str | None, actor_id: str | None) -> None:
    if not issue.assignee_id or previous_state_name == new_state_name:
        return
    _add(
        db,
        workspace_id=_workspace_id_for_issue(issue),
        recipient_id=issue.assignee_id,
        actor_id=actor_id,
        kind=NotificationKind.status_changed,
        issue_id=issue.id,
        body=f"changed status of {issue.identifier} from {previous_state_name or '—'} to {new_state_name or '—'}",
    )


def comment_mentioned(db: Session, *, issue: Issue, comment: Comment, mentioned_id: str, actor_id: str | None) -> None:
    """Recipient was @-mentioned in `comment`. Skip if recipient is actor."""
    if not mentioned_id:
        return
    snippet = (comment.body or "")[:140]
    _add(
        db,
        workspace_id=_workspace_id_for_issue(issue),
        recipient_id=mentioned_id,
        actor_id=actor_id,
        kind=NotificationKind.mentioned,
        issue_id=issue.id,
        comment_id=comment.id,
        body=f"mentioned you in {issue.identifier}: {snippet}",
    )


def comment_reacted(db: Session, *, issue: Issue, comment: Comment, emoji: str, actor_id: str | None) -> None:
    """Comment author was reacted to. Skip self-reactions."""
    if not comment.author_id:
        return
    _add(
        db,
        workspace_id=_workspace_id_for_issue(issue),
        recipient_id=comment.author_id,
        actor_id=actor_id,
        kind=NotificationKind.commented,
        issue_id=issue.id,
        comment_id=comment.id,
        body=f"reacted {emoji} to your comment on {issue.identifier}",
    )


def issue_commented(db: Session, *, issue: Issue, comment: Comment, actor_id: str | None) -> None:
    # Notify assignee + previous commenters + explicit subscribers (deduped, minus actor).
    recipients: set[str] = set()
    if issue.assignee_id:
        recipients.add(issue.assignee_id)
    for c in issue.comments:
        if c.author_id and c.id != comment.id:
            recipients.add(c.author_id)
    for sub in getattr(issue, "subscribers", []) or []:
        recipients.add(sub.id)
    workspace_id = _workspace_id_for_issue(issue)
    snippet = (comment.body or "")[:140]
    for r in recipients:
        _add(
            db,
            workspace_id=workspace_id,
            recipient_id=r,
            actor_id=actor_id,
            kind=NotificationKind.commented,
            issue_id=issue.id,
            comment_id=comment.id,
            body=f"commented on {issue.identifier}: {snippet}",
        )
