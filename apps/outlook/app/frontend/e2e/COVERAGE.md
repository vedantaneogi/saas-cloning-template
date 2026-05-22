# e2e Coverage — Outlook Clone

The contract the gen-spec generator reads. One row per flow.

Status legend:
- ✅ implemented and passing
- 🟡 stubbed (`test.fixme`) — POM exists, spec deferred
- ❌ out of scope for this milestone
- ⚠️ flaky / requires triage

|  # | Flow                                                | Endpoint/Tool                      | Page          | Spec                                  | Status |
| -: | --------------------------------------------------- | ---------------------------------- | ------------- | ------------------------------------- | :----: |
|  1 | Valid login lands on inbox                          | POST /api/v1/auth/login            | LoginPage     | auth.spec.ts::valid login              |   ✅   |
|  2 | Invalid password shows error                        | POST /api/v1/auth/login            | LoginPage     | auth.spec.ts::invalid password         |   ✅   |
|  3 | Logged-out access redirects                         | (router guard)                     | LoginPage     | auth.spec.ts::logged-out redirect      |   ✅   |
|  4 | Session persists across reload                      | localStorage `outlook_auth`        | LoginPage     | auth.spec.ts::session persists         |   ✅   |
|  5 | Sign-up creates an account                          | POST /api/v1/auth/signup           | SignUpPage    | (deferred)                              |   🟡   |
|  6 | Logout clears auth + sends to /sign-in              | POST /api/v1/auth/logout           | (top-toolbar) | (deferred)                              |   🟡   |
|  7 | Inbox loads                                         | GET /api/v1/messages               | MailPage      | mail.spec.ts::inbox loads              |   ✅   |
|  8 | Switch to Sent folder                               | GET /api/v1/messages               | MailPage      | mail.spec.ts::switches to sent         |   ✅   |
|  9 | Open seeded message in reading pane                 | GET /api/v1/messages/{id}          | MailPage      | mail.spec.ts::open seeded message       |   ✅   |
| 10 | Focused / Other toggle                              | GET /api/v1/messages?focused=…     | MailPage      | mail.spec.ts::focused other toggle      |   ✅   |
| 11 | Mark message as read                                | PATCH /api/v1/messages/{id}        | ReadingPane   | (deferred)                              |   🟡   |
| 12 | Flag a message                                      | PATCH /api/v1/messages/{id}        | ReadingPane   | (deferred)                              |   🟡   |
| 13 | Delete a message moves to Deleted Items             | DELETE /api/v1/messages/{id}       | ReadingPane   | (deferred)                              |   🟡   |
| 14 | Pin a message                                       | PATCH /api/v1/messages/{id}        | ReadingPane   | (deferred)                              |   🟡   |
| 15 | Snooze a message                                    | PATCH /api/v1/messages/{id}        | ReadingPane   | (deferred)                              |   🟡   |
| 16 | Reply via ribbon opens compose                      | (ui)                               | ComposePage   | (deferred)                              |   🟡   |
| 17 | Send a reply threads with original                  | POST /api/v1/messages              | ComposePage   | (deferred)                              |   🟡   |
| 18 | Reply All includes original CC                      | POST /api/v1/messages              | ComposePage   | (deferred)                              |   🟡   |
| 19 | Forward to external recipient                       | POST /api/v1/messages              | ComposePage   | (deferred)                              |   🟡   |
| 20 | Compose draft autosaves                             | POST /api/v1/messages (is_draft)   | ComposePage   | (deferred)                              |   🟡   |
| 21 | Schedule-send queues message                        | POST /api/v1/messages              | ComposePage   | (deferred)                              |   🟡   |
| 22 | Boomerang follow-up resurfaces in Inbox             | (background)                       | MailPage      | (deferred)                              |   🟡   |
| 23 | DLP banner appears in compose                       | POST /api/v1/dlp/evaluate          | ComposePage   | (deferred)                              |   🟡   |
| 24 | Sensitivity label dropdown in compose ribbon        | (ui)                               | ComposePage   | (deferred)                              |   🟡   |
| 25 | Encrypt-Only mode shows encrypt banner              | (ui)                               | ComposePage   | (deferred)                              |   🟡   |
| 26 | Create new folder via 3-dot menu                    | POST /api/v1/folders               | FolderTree    | (deferred)                              |   🟡   |
| 27 | Rename folder                                       | PATCH /api/v1/folders/{id}         | FolderTree    | (deferred)                              |   🟡   |
| 28 | Delete folder                                       | DELETE /api/v1/folders/{id}        | FolderTree    | (deferred)                              |   🟡   |
| 29 | Drag a message to a folder                          | POST /api/v1/messages/{id}/move    | MailPage      | (deferred)                              |   🟡   |
| 30 | "Go to Groups" jump link                            | (router push)                      | FolderTree    | (deferred)                              |   🟡   |
| 31 | Search by keyword from top bar                      | GET /api/v1/messages/search        | SearchPage    | (deferred)                              |   🟡   |
| 32 | Search with from / subject filters                  | GET /api/v1/messages/search        | SearchPage    | (deferred)                              |   🟡   |
| 33 | Files tab opens in-app preview                      | GET /api/v1/attachments/{id}       | SearchPage    | (deferred)                              |   🟡   |
| 34 | Recent searches persist in localStorage             | (localStorage)                     | SearchPage    | (deferred)                              |   🟡   |
| 35 | Calendar month view renders                         | GET /api/v1/events                 | CalendarPage  | calendar.spec.ts::month view            |   ✅   |
| 36 | Calendar week view renders                          | GET /api/v1/events                 | CalendarPage  | calendar.spec.ts::week view             |   ✅   |
| 37 | Calendar day view renders                           | GET /api/v1/events                 | CalendarPage  | calendar.spec.ts::day view              |   ✅   |
| 38 | Create event via day-grid click                     | POST /api/v1/events                | CalendarPage  | (deferred)                              |   🟡   |
| 39 | Edit event in modal                                 | PATCH /api/v1/events/{id}          | CalendarPage  | (deferred)                              |   🟡   |
| 40 | Delete event                                        | DELETE /api/v1/events/{id}         | CalendarPage  | (deferred)                              |   🟡   |
| 41 | Scheduling Assistant shows attendee availability    | POST /api/v1/events/availability   | CalendarPage  | (deferred)                              |   🟡   |
| 42 | Room finder lists rooms                             | GET /api/v1/rooms                  | CalendarPage  | (deferred)                              |   🟡   |
| 43 | Recurring event expands on the grid                 | server-side recurrence             | CalendarPage  | (deferred)                              |   🟡   |
| 44 | Contacts list renders                               | GET /api/v1/contacts               | ContactsPage  | smoke.spec.ts::contacts renders         |   ✅   |
| 45 | Create new contact                                  | POST /api/v1/contacts              | ContactsPage  | (deferred)                              |   🟡   |
| 46 | Edit contact                                        | PATCH /api/v1/contacts/{id}        | ContactsPage  | (deferred)                              |   🟡   |
| 47 | Delete contact                                      | DELETE /api/v1/contacts/{id}       | ContactsPage  | (deferred)                              |   🟡   |
| 48 | Tasks list renders                                  | GET /api/v1/tasks                  | TasksPage     | smoke.spec.ts::tasks renders            |   ✅   |
| 49 | Create new task                                     | POST /api/v1/tasks                 | TasksPage     | (deferred)                              |   🟡   |
| 50 | Mark task complete                                  | POST /api/v1/tasks/{id}/complete   | TasksPage     | (deferred)                              |   🟡   |
| 51 | Groups list renders                                 | GET /api/v1/groups                 | GroupsPage    | smoke.spec.ts::groups renders           |   ✅   |
| 52 | Group email tab                                     | GET /api/v1/groups/{id}/messages   | GroupsPage    | (deferred)                              |   🟡   |
| 53 | Settings — Mail page renders                        | GET /api/v1/settings               | SettingsPage  | smoke.spec.ts::settings renders         |   ✅   |
| 54 | Settings — Signatures CRUD                          | POST /api/v1/signatures            | SettingsPage  | (deferred)                              |   🟡   |
| 55 | Settings — Rules CRUD                               | POST /api/v1/rules                 | SettingsPage  | (deferred)                              |   🟡   |
| 56 | Settings — Categories CRUD                          | POST /api/v1/categories            | SettingsPage  | (deferred)                              |   🟡   |
| 57 | Settings — OOF toggle                               | PUT /api/v1/settings               | SettingsPage  | (deferred)                              |   🟡   |
| 58 | Quick steps run                                     | POST /api/v1/quick-steps/{id}/run  | (ribbon)      | (deferred)                              |   🟡   |
| 59 | Tool registry exposes ≥30 tools                     | GET /tools                          | (api)         | smoke.spec.ts::tools registry           |   ✅   |
| 60 | Step endpoint rejects unknown tool                  | POST /step                          | (api)         | smoke.spec.ts::step rejects unknown     |   ✅   |
| 61 | Mailbox quota banner appears                        | GET /api/v1/settings/quota         | FolderTree    | (deferred)                              |   🟡   |
| 62 | Account switching via top-bar avatar                | (multi-account localStorage)       | (top-toolbar) | (deferred)                              |   🟡   |

**Totals:** 14 ✅ passing • 48 🟡 stubbed • 0 ❌ • 0 ⚠️
