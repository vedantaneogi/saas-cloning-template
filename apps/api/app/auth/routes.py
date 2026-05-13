"""Authentication endpoints: signup, login, logout, /me, accept-invite."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, get_optional_user
from app.auth.security import (
    decode_token,
    hash_password,
    issue_token,
    random_token,
    verify_password,
)
from app.core.config import get_settings
from app.db.models import (
    Member,
    MemberRole,
    StateGroup,
    Team,
    User,
    Workspace,
    WorkflowState,
    WorkspaceInvite,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# --- schemas ---

class SignupIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    workspace_name: str | None = None  # if given, also creates a workspace


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    name: str
    initials: str
    color: str


class WorkspaceMembershipOut(BaseModel):
    id: str
    slug: str
    name: str
    icon_color: str
    role: str


class MeOut(BaseModel):
    user: UserOut
    workspaces: list[WorkspaceMembershipOut] = []


class AcceptInviteIn(BaseModel):
    token: str


def _initials_for(name: str) -> str:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def _set_cookie(response: Response, token: str, expires: datetime) -> None:
    s = get_settings()
    max_age = s.auth_session_days * 86400
    response.set_cookie(
        key=s.auth_cookie_name,
        value=token,
        httponly=True,
        secure=s.auth_cookie_secure,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def _slugify(name: str) -> str:
    out = "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-")
    while "--" in out:
        out = out.replace("--", "-")
    return out or "workspace"


def _create_workspace_with_admin(db: Session, *, user: User, name: str, slug: str) -> Workspace:
    if db.query(Workspace).filter_by(slug=slug).first():
        raise HTTPException(409, detail=f"workspace slug already in use: {slug}")
    ws = Workspace(slug=slug, name=name)
    db.add(ws)
    db.flush()
    member = Member(
        workspace_id=ws.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        initials=user.initials,
        color=user.color,
        role=MemberRole.admin,
    )
    db.add(member)
    db.flush()
    # Default team + 6 workflow states
    team = Team(workspace_id=ws.id, key=name[:3].upper() or "GEN", name=name, icon_color="#22c55e")
    db.add(team)
    db.flush()
    defaults = [
        ("Backlog", StateGroup.backlog, 0, "#95a2b3"),
        ("Todo", StateGroup.unstarted, 1, "#e2e2e2"),
        ("In Progress", StateGroup.started, 2, "#f2c94c"),
        ("In Review", StateGroup.started, 3, "#26b5ce"),
        ("Done", StateGroup.completed, 4, "#5e6ad2"),
        ("Canceled", StateGroup.canceled, 5, "#95a2b3"),
    ]
    for n, g, pos, color in defaults:
        db.add(WorkflowState(team_id=team.id, name=n, group=g, position=pos, color=color))
    return ws


def _me_payload(db: Session, user: User) -> MeOut:
    members = (
        db.query(Member)
        .filter_by(user_id=user.id)
        .all()
    )
    workspaces = []
    for m in members:
        ws = db.query(Workspace).filter_by(id=m.workspace_id).first()
        if ws is None:
            continue
        workspaces.append(
            WorkspaceMembershipOut(
                id=ws.id,
                slug=ws.slug,
                name=ws.name,
                icon_color=ws.icon_color,
                role=m.role.value,
            )
        )
    return MeOut(user=UserOut.model_validate(user), workspaces=workspaces)


# --- routes ---

@router.post("/signup", response_model=MeOut)
def signup(body: SignupIn, response: Response, db: Session = Depends(get_db)) -> MeOut:
    email = body.email.lower().strip()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(409, detail="an account with this email already exists")
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        name=body.name.strip(),
        initials=_initials_for(body.name),
        color="#5e6ad2",
    )
    db.add(user)
    db.flush()

    # If the user supplies a workspace name, create one as admin.
    if body.workspace_name and body.workspace_name.strip():
        ws_name = body.workspace_name.strip()
        slug = _slugify(ws_name)
        # uniquify slug
        i = 1
        base = slug
        while db.query(Workspace).filter_by(slug=slug).first():
            i += 1
            slug = f"{base}-{i}"
        _create_workspace_with_admin(db, user=user, name=ws_name, slug=slug)

    db.commit()
    token, exp = issue_token(user.id)
    _set_cookie(response, token, exp)
    return _me_payload(db, user)


@router.post("/login", response_model=MeOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)) -> MeOut:
    email = body.email.lower().strip()
    user = db.query(User).filter_by(email=email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")
    token, exp = issue_token(user.id)
    _set_cookie(response, token, exp)
    return _me_payload(db, user)


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(get_settings().auth_cookie_name, path="/")
    return {"ok": True}


@router.get("/me", response_model=MeOut)
def me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeOut:
    return _me_payload(db, user)


# --- invites ---

class InviteCreateIn(BaseModel):
    email: EmailStr
    role: str = "member"


class InviteOut(BaseModel):
    id: str
    email: str
    role: str
    token: str
    accept_url: str
    expires_at: datetime


class InviteSummaryOut(BaseModel):
    """Public-facing summary of an invite (used on the accept page)."""

    workspace_name: str
    workspace_slug: str
    email: str
    role: str
    expires_at: datetime
    needs_signup: bool


@router.get("/invites/{token}", response_model=InviteSummaryOut)
def get_invite_summary(token: str, db: Session = Depends(get_db)) -> InviteSummaryOut:
    invite = db.query(WorkspaceInvite).filter_by(token=token).first()
    if not invite:
        raise HTTPException(404, detail="invite not found")
    if invite.accepted_at is not None:
        raise HTTPException(410, detail="invite already used")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, detail="invite expired")
    ws = db.query(Workspace).filter_by(id=invite.workspace_id).first()
    if not ws:
        raise HTTPException(404, detail="workspace no longer exists")
    needs_signup = db.query(User).filter_by(email=invite.email.lower()).first() is None
    return InviteSummaryOut(
        workspace_name=ws.name,
        workspace_slug=ws.slug,
        email=invite.email,
        role=invite.role.value,
        expires_at=invite.expires_at,
        needs_signup=needs_signup,
    )


@router.post("/invites/{token}/accept", response_model=MeOut)
def accept_invite(
    token: str,
    response: Response,
    user: User | None = Depends(get_optional_user),
    body: SignupIn | None = None,
    db: Session = Depends(get_db),
) -> MeOut:
    invite = db.query(WorkspaceInvite).filter_by(token=token).first()
    if not invite:
        raise HTTPException(404, detail="invite not found")
    if invite.accepted_at is not None:
        raise HTTPException(410, detail="invite already used")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, detail="invite expired")

    # Resolve the user: prefer current session; otherwise look up by email; otherwise
    # signup with body.
    target_user: User | None = user
    if target_user is None:
        existing = db.query(User).filter_by(email=invite.email.lower()).first()
        if existing:
            # Caller is not logged in but the email already exists — require login.
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                detail="login required to accept this invite",
            )
        if not body or not body.password or not body.name:
            raise HTTPException(400, detail="signup payload required for new account")
        target_user = User(
            email=invite.email.lower(),
            password_hash=hash_password(body.password),
            name=body.name.strip(),
            initials=_initials_for(body.name),
            color="#5e6ad2",
        )
        db.add(target_user)
        db.flush()

    # Idempotent: skip if already a member.
    existing_member = db.query(Member).filter_by(
        workspace_id=invite.workspace_id, user_id=target_user.id
    ).first()
    if not existing_member:
        try:
            role = MemberRole(invite.role.value)
        except ValueError:
            role = MemberRole.member
        m = Member(
            workspace_id=invite.workspace_id,
            user_id=target_user.id,
            name=target_user.name,
            email=target_user.email,
            initials=target_user.initials,
            color=target_user.color,
            role=role,
        )
        db.add(m)

    invite.accepted_at = datetime.now(timezone.utc)
    db.commit()

    token_str, exp = issue_token(target_user.id)
    _set_cookie(response, token_str, exp)
    return _me_payload(db, target_user)
