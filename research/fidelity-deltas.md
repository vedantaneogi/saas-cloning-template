# UI fidelity — clone vs Linear reference

Side-by-side comparison of `research/clone-shots/*.png` (the running clone)
against `research/screenshots/*/*.png` (captures from real Linear). Lists
remaining visual deltas with file:component pointers.

Last updated: 2026-05-11 after the polish pass.

---

## What this pass fixed
- Sidebar `Workspace` / `Your teams` / `Try` section chevrons now toggle (state + animated rotation).
- Per-team chevrons now collapse/expand the team's child links.
- Section header padding tightened (was `mt-4 pb-1`, kept but with proper hover).
- Issue row sizes (`h-[26px]` items in sidebar, `h-[34px]` rows in list) match Linear's row rhythm.
- Create-issue modal redesigned: team-key chip + `›` separator + "New issue" label + maximize/close, all 7 property chips (Status / Priority / Assignee / Project / Labels / Estimate / Due date), paperclip + Create more toggle in footer.
- Priority icon rebuilt to Linear's pattern (first bar lit for Low, two for Medium, three for High; lit ones full opacity, dim ones at 0.28).
- Status "In Progress" rebuilt to half-filled circle (was a partial stroke).

## Remaining deltas per surface

### 1. `issues.team.active` — list view
Compare: `research/screenshots/issues/issues.team.active.dark.png` ↔ `research/clone-shots/clone.team.active.png`

| Delta | Severity | Fix location |
| --- | :-: | --- |
| Linear's "Active" tab pill background is slightly lighter (`bg-row-selected`) than mine | low | `apps/web/src/components/topbar.tsx` |
| Linear's date column shows month + day (e.g. "May 11") in `text-text-tertiary`; mine matches | ok | — |
| Linear's status group header (`In Progress 15`) has a thin border-bottom on the row strip; mine matches | ok | — |
| Linear's issue rows show a star/favorite icon on hover before the priority icon (left side); mine shows `GripVertical` | low | `apps/web/src/components/issue-row.tsx:14` |
| Linear renders sub-issue progress as a small ring with done/total text; mine matches | ok | — |
| Labels in Linear are slightly smaller pills (`px-1.5 py-0`); mine uses `px-2 py-0.5` | low | `apps/web/src/components/issue-row.tsx:37` |
| Linear's `In Review` group icon is a half-filled circle with a blue ring; mine matches | ok | — |

### 2. `issue-detail.full` — single issue page
Compare: `research/screenshots/issue-detail/issue-detail.full.dark.png` ↔ `research/clone-shots/clone.issue.full.png`

| Delta | Severity | Fix location |
| --- | :-: | --- |
| Linear's title is centered under the topbar with the breadcrumb above; mine matches | ok | — |
| Linear's description has tighter line-height (~1.5) and uses `font-size-default` (0.9375rem); mine renders close but slightly looser | low | `apps/web/src/components/issue-title.tsx:90` |
| Linear's "Sub-issues" panel uses chevron-down when open; mine uses chevron-right always | low | `apps/web/src/app/(app)/[workspace]/issue/[identifier]/page.tsx:46` |
| Linear's sub-issue rows have an extra column for priority icon before status; mine omits | low | issue detail sub-issue list |
| Linear's right rail "Properties" rows have a fixed-width label column (52px); mine uses `w-16` (64px) — slightly wider | low | `apps/web/src/components/issue-properties.tsx` `Row` |
| Linear's relations show the target issue's priority + status icons inline; mine shows only status | medium | `issue/[identifier]/page.tsx:144` |
| Linear's comments have a subtle border + bg matching `bg-elevated`; mine matches | ok | — |

### 3. `workspace.home` (sidebar)
Compare: `research/screenshots/workspace/workspace.home.dark.png` ↔ `research/clone-shots/clone.team.active.png` (sidebar region)

| Delta | Severity | Fix location |
| --- | :-: | --- |
| Linear's workspace switcher row is ~44px tall with `text-default`; mine matches | ok | — |
| Linear's "Workspace" / "Your teams" / "Try" section headers use uppercase + 0.06em tracking; mine matches | ok | — |
| Linear's team rows show a small chevron + colored 3×3 square; mine matches | ok | — |
| Linear renders the inbox unread count as a small rounded chip (8px rad); mine matches | ok | — |
| Linear's help (`?`) and avatar at footer have a thin top border; mine has no border | low | `apps/web/src/components/sidebar.tsx` footer div |
| The "Try" section in Linear is below the teams section AFTER all teams; mine matches | ok | — |
| Linear collapses sections by hiding contents (no slide animation); mine matches | ok | — |

### 4. `issue-create.modal`
Compare: `research/screenshots/issue-create/issue-create.modal.dark.png` ↔ `research/clone-shots/clone.create-modal.png`

| Delta | Severity | Fix location |
| --- | :-: | --- |
| Linear modal width ~720px; mine 740px (very close) | ok | — |
| Linear title input renders slightly larger (~18px); mine uses `text-large` (18px) | ok | — |
| Linear puts `📎` attach button on left of footer; Create more + Create issue on right; mine matches | ok | — |
| Linear has a "..." overflow chip after Labels for additional fields; mine omits | low | modal chips section |
| Linear's modal backdrop is slightly stronger (closer to 75% black); mine uses 65% | low | `bg-black/65` in modal root |
| Linear's modal corner radius ~8px; mine uses `rounded-lg` (8px) | ok | — |

### 5. `inbox` — empty state
Compare: `research/screenshots/inbox/inbox.default.dark.png` ↔ `research/clone-shots/clone.inbox.png`

| Delta | Severity | Fix location |
| --- | :-: | --- |
| Linear's empty inbox uses an illustration + "Get back to work" copy; mine shows minimal "Your inbox is quiet" | medium | `apps/web/src/app/(app)/[workspace]/inbox/page.tsx` |
| Linear has tabs at top: "Inbox / Archived"; mine has none | medium | inbox page topbar |

### 6. `my-issues`
Compare: `research/screenshots/my-issues/my-issues.assigned.dark.png` ↔ `research/clone-shots/clone.my-issues.png`

| Delta | Severity | Fix location |
| --- | :-: | --- |
| Linear's tabs: "Assigned / Created / Subscribed / Activity"; mine matches | ok | — |
| Linear shows issue counts in the tabs; mine omits | low | my-issues tabs |
| Otherwise visually identical to issues list | ok | — |

---

## Pixel-perfection roadmap

Bucket fixes by where to start next:

1. **Inbox empty state + tabs** (medium impact)
2. **Sub-issue priority icon + sub-issue panel chevron direction** (medium)
3. **Relations rendering — priority icon for target** (medium)
4. **Star/favorite icon on issue row hover** (low)
5. **Tab counts on my-issues** (low)
6. **Footer top border in sidebar** (low)
7. **Modal `...` overflow chip + 75% backdrop** (low)

Most other deltas are within a few px and below perception threshold. The
list above is the meaningful set if we keep tightening.
