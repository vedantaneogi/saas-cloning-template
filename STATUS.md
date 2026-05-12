# Clone status — vs. linear.xlsx feature matrix

Last updated: 2026-05-12. Status keys: ✅ built · 🟡 partial · ❌ not started.

---

## Core entities

| Entity | DB model | API | UI | Notes |
| --- | :-: | :-: | :-: | --- |
| Workspace | ✅ | ✅ | ✅ | One workspace (`demo`) seeded |
| Team | ✅ | ✅ | ✅ | 2 teams seeded (ENG, DES); per-team estimate scale |
| Issue | ✅ | ✅ | ✅ | Full CRUD + archive + move-between-teams + convert-to-subissue |
| Member | ✅ | ✅ | ✅ | Admin/Member/Guest roles, team_memberships join |
| WorkflowState | ✅ | ✅ | ✅ | Default 6 per team; full editor |
| Label | ✅ | ✅ | ✅ | Workspace + team-scoped CRUD |
| Comment | ✅ | ✅ | ✅ | Threaded replies, @mentions, reactions |
| CommentReaction | ✅ | ✅ | ✅ | Toggle per (comment, member, emoji) |
| IssueLink | ✅ | ✅ | ✅ | GitHub PR/branch/Figma/URL autodetect |
| IssueRelation | ✅ | ✅ | ✅ | Full create/delete with symmetric pairing |
| IssueSubscriber | ✅ | ✅ | ✅ | Subscribe/Unsubscribe; auto-subscribe on comment |
| Project | ✅ | ✅ | ✅ | Cross-team via project_teams; resources panel |
| ProjectResource | ✅ | ✅ | ✅ | External links per project |
| Initiative | ✅ | ✅ | ✅ | Status pill, owner, target date, project rollup |
| Cycle | ✅ | ✅ | ✅ | Per-team cycles; complete + rollover button |
| Roadmap | ✅ | ✅ | ✅ | Initiatives × projects timeline with completion fill |
| Milestone | ✅ | ✅ | ✅ | Inline add on project detail |
| View (saved) | ✅ | ✅ | ✅ | Per-team, with favorites |
| Document | ✅ | ✅ | ✅ | Workspace + project-scoped markdown w/ autosave |
| Triage | ✅ | ✅ | ✅ | Per-team queue, accept/decline |
| Customer Request | ✅ | ✅ | ✅ | Source tag, status, issue linking |
| Notification | ✅ | ✅ | ✅ | Assign / status / comment / mention / reaction |

---

## P0 features

### Workspace & teams
- ✅ Workspace home, sidebar, team switcher
- ✅ Create team UI in settings
- ✅ Team settings — name, icon color, cycles toggle, workflow states editor, team labels CRUD, estimate scale picker
- ✅ Workspace settings — members with role editor, workspace labels CRUD, teams index

### Issue CRUD
- ✅ Create issue modal (C shortcut) with inline pickers + chips
- ✅ Quick add inline in list + board views (+ button per state group)
- ✅ Open issue full page (URL-routable)
- ✅ Inline title + markdown description editing
- ✅ Delete with confirm
- ✅ Duplicate
- ✅ Archive / unarchive (banner + bulk + per-issue action)
- ✅ Move issue between teams (re-keys identifier, maps state to closest group)

### Issue metadata
- ✅ Status / Priority / Assignee / Labels / Estimate / Due date pickers
- ✅ Project + Cycle assignment
- ✅ Subscribers (Bell/BellOff button on Activity header; chip list in side rail)

### Views & filtering
- ✅ Default views (Active, Backlog, All) + Archived
- ✅ Saved views w/ favorites; `/view/<id>` route
- ✅ Filter builder (priority / status / assignee / label / project)
- ✅ Group by status / priority / assignee / project / label
- ✅ Sort — priority / updated / created / due date
- ✅ List + Board displays

### Cycles
- ✅ Configure per team (cycles_enabled + estimate scale)
- ✅ Cycle list + detail (progress, issue grouping)
- ✅ Active cycle linked from sidebar
- ✅ Complete cycle button rolls unfinished issues to the next cycle

### Projects
- ✅ Create project from `/projects` topbar
- ✅ Project overview with status row, milestones, updates, docs, resources
- ✅ Add / remove issues via picker
- ✅ Inline milestone create
- ✅ Project status + health badges
- ✅ Documents linked to projects
- ✅ External resources panel
- ✅ Cross-team projects via team chips picker

### Triage
- ✅ Triage inbox per team
- ✅ Accept / Decline actions

### Sub-issues & relations
- ✅ Convert to sub-issue (search-picker dialog from `...` menu)
- ✅ Add sub-issue inline from parent issue detail
- ✅ Issue relations: blocks / blocked-by / related / duplicate — full create UI w/ symmetric inverse, search-picker

### Comments & collaboration
- ✅ Comment thread (render + post) with real timestamps
- ✅ @mention with autocomplete (full kbd nav, mention pills, fires `mentioned` notifications)
- ✅ Reply to comment (flat one-level threads)
- ✅ Reactions (6 quick emojis + popover; per (comment, member, emoji))
- ✅ Linked PRs / branches with auto-detected type + status badge

### Search & navigation
- ✅ Command palette (`Cmd-K` / `Ctrl-K` / `/`)
- ✅ Global search across issues, projects, teams, members, views, initiatives, documents
- ✅ Palette per-property filter syntax (`in:issues`, `team:ENG`, `@alex`)
- ✅ Recent items (up-to-6 MRU per workspace from localStorage)
- ✅ Keyboard shortcuts — `C`, `0-4`, `S` / `A` / `L` / `P` / `E`, `?`, `Cmd-K`, `/`, `Esc`

### Inbox & notifications
- ✅ Inbox list with mark-read on click and "Mark all read"
- ✅ Filter pills (All / Unread / Mentions)
- ✅ Notification generation — assign, status change, comment, mention, reaction
- ✅ Auto-subscribe commenter; subscribers notified on future comments

### Bulk operations
- ✅ Multi-select w/ shift-click range
- ✅ Bulk edit action bar (state / priority / assignee)
- ✅ Bulk delete
- ✅ Archive workflow (distinct from delete)
- ✅ CSV export per team
- ✅ CSV import (paste or file upload) creates issues in target team

### Workflow customization
- ✅ Custom workflow states with full CRUD
- ✅ Custom labels (workspace + per-team)
- ✅ Custom estimate scales (fibonacci / linear / exponential / t-shirt / none); issue picker adapts

### Permissions & roles
- ✅ Admin / Member / Guest roles editable in workspace settings
- ✅ Team memberships join table with per-team role override

---

## P1+ polish (now in)

- ✅ Real relative timestamps everywhere
- ✅ Live Subscribe/Unsubscribe button
- ✅ Add-sub-issue from parent UI
- ✅ Relations create UI w/ symmetric inverse
- ✅ Create project modal
- ✅ Milestone create UI
- ✅ Project resources section
- ✅ Cross-team project chips
- ✅ Cycle complete + rollover
- ✅ CSV import / export
- ✅ Palette filter syntax + recents
- ✅ Single-key picker shortcuts (S/A/L/P/E)
- ✅ Dead-button sweep — removed stub Maximize/Section More buttons; wired board column "+"

---

## Out of scope

- No auth (current user defaults to first member)
- No realtime (router.refresh after mutations)
- Postgres-ready (docker-compose) but dev runs SQLite
- Capture/Playwright golden screenshots not re-run on each slice

---

## Coverage

All P0 features and the immediate P1 polish list are ✅. The matrix above no longer carries 🟡 partials on flagship surfaces.

---

## UI polish pass — page by page (done 2026-05-12)

Every surface returns 200 on a fresh build and has functional buttons. Pass summary:

1. ✅ **Saved views fixed** — `/view/[id]` now redirects with `?view_id=…` so the team page shows the saved-view name + colored Bookmark icon in the topbar instead of generic "Issues". Tabs hidden in view mode.
2. ✅ **Sidebar** — dead `/more`, "Try" section (Import / Invite / Connect GitHub stubs), and broken `Star`/`PanelRight` icons removed. Help button dispatches `?` (cheatsheet). PencilLine dispatches `c` (new issue). Settings link gets a real gear icon. Footer is its own bordered row.
3. ✅ **Topbar** — collapsed to 44px, dropped the unwired Star (favorite) + PanelRight (side panel) buttons, consistent `px-4` padding.
4. ✅ **Inbox** — All / Unread / Mentions pills, Mark-all-read, kind icon overlay on actor avatar, real `relTime`.
5. ✅ **My Issues** — tabs now navigate (`href` on each scope), counts inline, empty-state copy.
6. ✅ **Team list/board** — hardcoded "May 11" date replaced with `relTime(updated_at)` (or due date when set). Board column "+" wired to inline quick-add.
7. ✅ **Issue detail** — rebuilt around real-data widgets (SubIssuesPanel, RelationsPanel, IssueLinksPanel, SubscribeButton, subscriber chips, archive banner).
8. ✅ **Projects + Project detail** — NewProjectButton on /projects topbar; MilestonesPanel + ProjectResourcesPanel + ProjectTeamsPanel on project detail.
9. ✅ **Initiatives + Roadmap** — bucketed list with progress bars, status pills; roadmap has gantt bars with completion fill + today indicator.
10. ✅ **Cycles + cycle detail** — Active/Upcoming/Completed buckets; Complete-cycle CTA on active cycle detail.
11. ✅ **Documents** — listing + per-doc editor stays.
12. ✅ **Customer Requests** — bucketed by status, source pill, link-to-issue affordance, resolve/cancel buttons.
13. ✅ **Triage** — accept/decline rail per row, source pill.
14. ✅ **Settings** — left-pane `SettingsNav` already routes to Members / Labels / Teams / per-team; Members editor now changes role inline.
15. ✅ **Command palette** — recents from localStorage, `in:issues` / `team:ENG` / `@alex` filters, group headers, hint footer.
16. ✅ **Design tokens** — every new component uses `text-*`, `bg-*`, `border-*` tokens from `globals.css`; no raw hex.
17. ✅ **New routes filled in** — `/views`, `/team/[key]/views`, `/team/[key]/projects` were 404s before; all now have real pages.

Out-of-scope for this pass: auth, realtime, Postgres swap, golden-screenshot capture re-run.
