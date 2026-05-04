# Outlook Clone - Complete Testing Checklist (P0 + P1)

## Test Accounts

| # | Name | Email | Password |
|---|---|---|---|
| 1 | Frank Miller | frank.miller@acmecorp.com | password123 |
| 2 | Alice Johnson | alice.johnson@acmecorp.com | password123 |
| 3 | Bob Smith | bob.smith@acmecorp.com | password123 |
| 4 | Carol Williams | carol.williams@vendor.com | password123 |
| 5 | David Brown | david.brown@acmecorp.com | password123 |
| 6 | Grace Wilson | grace.wilson@acmecorp.com | password123 |

Frank has full seed data. Others have empty mailboxes for cross-account testing.

---

## P0 - MUST WORK (28 items)

### 1. Mail Layout - Three-pane (P0)
- [ ] Three panels: Folder tree | Message list | Reading pane
- [ ] Panels resizable by dragging dividers
- [ ] Reading pane position changeable: Right / Bottom / Off (View ribbon tab)
- [ ] Folder tree: 2 collapsible sections - FAVORITES (Inbox/Drafts/Sent) and user@email (all folders)
- [ ] Both sections collapse/expand with chevron

### 2. Folder Management (P0)
- [ ] System folders: Inbox, Drafts, Sent Items, Archive, Junk Email, Deleted Items
- [ ] Custom folders inline (no MY FOLDERS header)
- [ ] Right-click > Rename > inline input
- [ ] Right-click > New subfolder > inline input (no browser prompt)
- [ ] Right-click > Delete folder
- [ ] Right-click > Run rules on folder
- [ ] Drag message onto folder > moves it

### 3. Conversation Grouping (P0)
- [ ] Thread accordion in reading pane shows N messages
- [ ] Expand shows individual messages chronologically

### 4. Read/Unread States (P0)
- [ ] Unread = blue dot + bold text
- [ ] Click message > auto-marks read
- [ ] Toggle via ribbon / context menu / reading pane
- [ ] Mark all as read button in list header
- [ ] Bulk select > Mark read

### 5. Reply / Reply All / Forward (P0)
- [ ] Reply > inline editor with Re: subject + quoted body
- [ ] Reply all > includes CC recipients
- [ ] Forward > compose with Fwd: subject
- [ ] Works from: ribbon, context menu, reading pane
- [ ] Delivers to recipient inbox (test Alice > Frank > switch accounts)

### 6. Delete / Archive / Move (P0)
- [ ] Delete > Deleted Items folder
- [ ] Archive > Archive folder
- [ ] Move to dropdown > search box + folder list > moves message
- [ ] Bulk select > Delete/Archive

### 7. Flag / Pin / Snooze (P0)
- [ ] Flag toggles red icon, shows in Flagged tasks view
- [ ] Pin toggles star
- [ ] Snooze presets (3h, Tomorrow, Weekend, Next week) > message hidden until time

### 8. Search with Filters (P0)
- [ ] Top bar > Enter > search results page
- [ ] Delete text > auto-returns to inbox
- [ ] Filter panel: Search in, From, To, Subject, Date, Read status, Attachments
- [ ] No duplicate results

### 9. Compose - To/Cc/Bcc Autocomplete (P0)
- [ ] New mail from ribbon > compose modal
- [ ] To: type 2+ chars > contact autocomplete dropdown
- [ ] Cc and Bcc can both be open simultaneously
- [ ] Recipients as blue chips with X

### 10. Compose - Rich Body / Attachments / Images (P0)
- [ ] Toolbar: Bold, Italic, Underline, Lists, Alignment, Link, Image, Undo/Redo
- [ ] Numbered/bulleted lists visible while typing
- [ ] Link insert > inline URL input (no browser prompt)
- [ ] Image insert > file picker (no browser prompt)
- [ ] Paste image (Ctrl+V) > embeds inline
- [ ] @ mention > contact suggestions > styled mention
- [ ] Importance buttons: ! (high/red) and down-arrow (low/blue)
- [ ] Attachments via paperclip

### 11. Signatures (P0)
- [ ] Default signature auto-inserted on new compose
- [ ] Signature dropdown > switch/remove
- [ ] Visible in editor while composing

### 12. Drafts Auto-saved (P0)
- [ ] Auto-saves every 30s
- [ ] Close with X > saves draft
- [ ] Draft appears in Drafts folder

### 13. Send / Save / Discard (P0)
- [ ] Send > Sent Items with current timestamp
- [ ] Schedule Send > datetime picker
- [ ] Minimize > bottom bar
- [ ] Discard > closes

### 14. Attachments - Download and Preview (P0)
- [ ] Attachment bar in reading pane with filename/size/icon
- [ ] Chevron dropdown: Preview, Copy, Download
- [ ] Preview opens new window (images render, PDFs open)
- [ ] Download saves with real content
- [ ] Paperclip icon on messages with attachments

### 15. Calendar Views (P0)
- [ ] Day / Week / Work Week / Month in ribbon
- [ ] Today button + arrows in navigation bar
- [ ] Mini calendar in sidebar

### 16. Event Creation (P0)
- [ ] Toolbar ribbon: Save, Event/Series, Busy, Reminder, Delete
- [ ] Attendees with autocomplete
- [ ] Readable time summary line
- [ ] Location, Room finder, Teams toggle
- [ ] Description card with mini toolbar

### 17. Recurrence Editor (P0)
- [ ] Frequency + interval + days of week + end type

### 18. Edit/Delete Single vs Series (P0)
- [ ] Scope dialog: This event / All events in series

### 19. RSVP (P0)
- [ ] Accept / Tentative / Decline buttons
- [ ] Propose new time dialog

### 20. Calendar Navigation (P0)
- [ ] Today, arrows, mini calendar date jump

### 21. Contacts List and Search (P0)
- [ ] Alphabetical grouping, Favorites, Search

### 22. Create/Edit Contact (P0)
- [ ] Full form: name, email, phone, company, job title, address, notes

### 23. Contact Card Popover (P0)
- [ ] Click email in reading pane > popup with avatar, name, email, job, company
- [ ] Hover also works (400ms)
- [ ] Send email action

### 24. Create Task from Message (P0)
- [ ] Right-click > Create task (direct menu item)
- [ ] Task created with message subject

### 25. Flagged Items as Tasks (P0)
- [ ] Tasks > Flagged email > shows flagged messages

### 26. Multi-Account Switch (P0)
- [ ] Avatar > Add account > login form
- [ ] Switch accounts > cache cleared, data refreshes
- [ ] Logout > login as different user > no errors

### 27. Out-of-Office (P0)
- [ ] Settings > Automatic replies > enable + dates + messages > Save
- [ ] Saved values persist on reopen
- [ ] Send to OOF user > auto-reply received by sender

### 28. Signature Management (P0)
- [ ] CRUD in Settings > Signatures
- [ ] Default for new/reply
- [ ] Multiple signatures

---

## P1 - SHOULD WORK (20 items)

### 29. Rules (P1)
- [ ] CRUD: conditions + actions + priority + enable/disable
- [ ] Run rules on folder (context menu)

### 30. Categories (P1)
- [ ] CRUD in Settings > Categories (name + color)
- [ ] Apply via context menu > Categorize
- [ ] Color dots on messages
- [ ] View ribbon > Categories dropdown filter

### 31. Sweep (P1)
- [ ] Keep latest from sender, delete rest
- [ ] Move all from sender to folder

### 32. Clean Up Thread (P1)
- [ ] Removes redundant messages in conversation

### 33. Scheduling Assistant (P1)
- [ ] Free/busy grid per attendee
- [ ] Suggested time slots

### 34. Room Finder (P1)
- [ ] Searchable room list with capacity/features

### 35. Shared Calendar (P1)
- [ ] Subscribe by email, overlay, toggle visibility, unsubscribe

### 36. Delegates (P1)
- [ ] Settings > Delegates > Add by email
- [ ] Mail permission + Calendar permission levels
- [ ] Data persists via API

### 37. Groups (P1)
- [ ] My Groups + Discover, Create, Join/Leave
- [ ] Conversations tab > real messages (searched by group name)
- [ ] Calendar and Files tabs

### 38. Focused vs Other (P1)
- [ ] Focused: contacts, high importance, flagged, replies
- [ ] Other: everything else
- [ ] Both show real data

### 39. Schedule Send (P1)
- [ ] Compose > Send dropdown > datetime picker

### 40. Snooze (P1)
- [ ] Preset times, message hidden until snooze expires

### 41. Pin (P1)
- [ ] Star icon toggle on messages

### 42. @ Mentions (P1)
- [ ] Type @ in compose > contact suggestions > styled mention

### 43. Sensitivity + DLP (P1)
- [ ] Sensitivity: Normal/Personal/Private/Confidential
- [ ] DLP scans body for: credit cards, SSNs, passwords, bank accounts
- [ ] Warning dialog with Send anyway option
- [ ] Warns on sensitive content to external recipients

### 44. Calendar Publish (P1)
- [ ] Publish dialog > Availability only / All details
- [ ] Real public endpoint: GET /calendars/pub/{id} (no auth)

### 45. To Do Integration (P1)
- [ ] Lists, sublists (steps), due dates, reminders
- [ ] Grid layout: Title / Due Date / Importance columns

### 46. Quick Steps (P1)
- [ ] CRUD + run on selected message

### 47. Add-ins Sidebar (P1)
- [ ] Zoom, Salesforce, Asana icons in reading pane
- [ ] Expanded panel shows message context (sender + subject)

### 48. Follow-ups (P1)
- [ ] Sent messages with no reply after N days

---

## Layout and UI

### 49. Top Bar
- [ ] Waffle > app launcher grid (Outlook, Calendar, Word, Excel, etc.)
- [ ] Search bar (white, Enter only)
- [ ] Bell, Gear (settings modal), Help, Avatar

### 50. Ribbon Row 2
- [ ] Hamburger > File > Home > View > Help (after icon rail)
- [ ] File > dropdown (Options, Auto replies, Rules, Print)

### 51. Ribbon Row 3 - changes per section, never disappears
- [ ] Mail: New mail, Delete, Archive, Move to, Reply/all/Forward, Read/Unread, Flag, Print, Undo
- [ ] Calendar: New event, Day/Work week/Week/Month, Share, Print
- [ ] Contacts: New contact, Edit, Delete, Favorites
- [ ] Tasks: New task, Complete, Delete, Flag

### 52. Context Menu - all functional
- [ ] Report > moves to Junk (API)
- [ ] Block sender > ALL messages to Junk (API)
- [ ] Ignore > conversation to Deleted (API)
- [ ] Copy > duplicates message (API)
- [ ] View > raw headers / new tab (functional)

### 53. Timestamps
- [ ] Local timezone, varied times, real current time for new messages

### 54. Dark Mode
- [ ] Settings > General > Theme > Dark/Light toggle

### 55. Cross-Account Delivery
- [ ] Send between internal users > delivered to recipient inbox
- [ ] Real email via Resend (when API key configured)

---

## API Endpoints (all verified working)

| Category | Endpoints |
|---|---|
| Messages | GET/POST /messages, PATCH/DELETE /messages/{id}, reply, forward, move, copy, report, block, ignore, bulk, search, needs-followup, sweep, cleanup-thread |
| Attachments | GET/POST /messages/{id}/attachments, GET download |
| Folders | CRUD /folders |
| Contacts | CRUD /contacts, GET autocomplete |
| Calendars | CRUD /calendars, GET pub/{id}, POST subscribe |
| Events | CRUD /events, respond, propose-time, availability |
| Tasks | CRUD /tasks, complete, uncomplete |
| Rules | CRUD /rules, POST run |
| Signatures | CRUD /signatures |
| Categories | CRUD /categories |
| Quick Steps | CRUD /quick-steps, POST run |
| Groups | CRUD /groups, join, leave, members |
| Settings | GET/PATCH /settings, oof, delegates |
| Auth | POST login |