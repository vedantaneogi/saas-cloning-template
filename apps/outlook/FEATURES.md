# Features — Outlook Clone

## Summary

- **Target app:** Microsoft Outlook (Web)
- **Total features cataloged:** 38
- **Tier 1 (full build):** 32 features
- **Tier 2 (UI stubs):** 6 features

## Tier 1 — Full Implementation

| #  | Feature                            | Page types                                | Tools                                                                                                                       | DB Tables                       |
| -- | ---------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1  | **Authentication**                 | Login, Sign-up                            | `signup_user`, `login`, `logout`, `get_me`                                                                                  | `users`, `sessions`             |
| 2  | **Inbox + Folder navigation**      | Folder tree, Mail list                    | `list_folders`, `create_folder`, `rename_folder`, `delete_folder`                                                           | `folders`                       |
| 3  | **Reading pane**                   | Reading pane (Right/Bottom/Off)           | `get_message`, `mark_read`, `mark_unread`, `flag_message`, `pin_message`                                                    | `messages`                      |
| 4  | **Conversation threading**         | Thread expansion + cross-mailbox grouping | `list_conversations`, `get_conversation`                                                                                    | `conversations`                 |
| 5  | **Compose new mail**               | Full compose pane (ribbon + body editor)  | `create_message`, `update_message`, `delete_message`                                                                        | `messages`                      |
| 6  | **Reply / Reply all / Forward**    | Inline compose                            | `reply_message`, `forward_message`                                                                                          | `messages`                      |
| 7  | **Attachments**                    | Attach + preview modal (PDF/img/Office)   | `upload_attachment`, `download_attachment`, `delete_attachment`                                                              | `attachments`                   |
| 8  | **Drafts + autosave**              | Drafts folder                             | `create_message` (is_draft=true)                                                                                            | `messages`                      |
| 9  | **Schedule send**                  | Scheduled folder + editor                 | `schedule_message`, `cancel_scheduled`                                                                                      | `messages.scheduled_send_at`    |
| 10 | **Boomerang follow-up**            | Inbox resurface + flagged row             | `set_boomerang`, `clear_boomerang`                                                                                          | `messages.boomerang_at`         |
| 11 | **Focused / Other**                | Inbox tabs                                | `list_messages?focused=true|false`                                                                                          | `messages.is_focused`           |
| 12 | **Snooze**                         | Snoozed folder + per-row action           | `snooze_message`, `unsnooze_message`                                                                                        | `messages.snooze_until`         |
| 13 | **Follow up**                      | Follow-up surface                         | `list_followup`                                                                                                             | derived                         |
| 14 | **Categories**                     | Sidebar filter + per-msg categorize       | `list_categories`, `assign_category`, `unassign_category`                                                                   | `categories`, `message_categories` |
| 15 | **Rules**                          | Settings: Rules                           | `list_rules`, `create_rule`, `update_rule`, `delete_rule`, `run_rule`                                                       | `rules`                         |
| 16 | **Signatures**                     | Settings: Signatures                      | `list_signatures`, `create_signature`, `update_signature`, `delete_signature`                                               | `signatures`                    |
| 17 | **Out-of-office (OOF)**            | Settings: Automatic Replies               | `set_oof`, `get_oof`                                                                                                        | `users.out_of_office_*`         |
| 18 | **Quick steps**                    | Inbox toolbar                             | `list_quick_steps`, `run_quick_step`                                                                                        | `quick_steps`                   |
| 19 | **DLP policy tips**                | Inline banner in compose                  | `evaluate_dlp`                                                                                                              | (rules engine)                  |
| 20 | **Sensitivity labels + Encrypt**   | Compose ribbon controls                   | `set_sensitivity`, `set_encrypt_mode`                                                                                       | `messages.sensitivity`          |
| 21 | **Search**                         | Top-bar search + Search results page      | `search_messages`, `search_files`, `search_people`                                                                          | derived                         |
| 22 | **Calendar — events**              | Day/Week/Month + Event editor             | `list_events`, `get_event`, `create_event`, `update_event`, `delete_event`                                                  | `events`, `event_attendees`     |
| 23 | **Calendar — recurring**           | Recurrence expansion                      | (server-side `_expand_recurring_event`)                                                                                     | `events.recurrence_rule`        |
| 24 | **Scheduling Assistant**           | Per-attendee availability grid            | `get_availability`, `find_meeting_times`                                                                                    | `events`                        |
| 25 | **Rooms**                          | Room picker + create-new-room             | `list_rooms`, `create_room`                                                                                                 | `rooms`                         |
| 26 | **Contacts (People)**              | List + detail pane                        | `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `delete_contact`                                        | `contacts`                      |
| 27 | **To Do — lists**                  | Lists sidebar                             | `list_task_lists`, `create_task_list`, `delete_task_list`                                                                   | `task_lists`                    |
| 28 | **To Do — tasks**                  | Task pane                                 | `list_tasks`, `create_task`, `update_task`, `complete_task`                                                                 | `tasks`                         |
| 29 | **Groups**                         | Group list + tabs                         | `list_groups`, `get_group`, `list_group_members`                                                                            | `groups`, `group_members`       |
| 30 | **Settings**                       | Settings modal                            | `get_settings`, `update_settings`                                                                                           | `user_settings`                 |
| 31 | **Mailbox quota**                  | Banner at bottom of folder sidebar        | `get_quota`                                                                                                                 | derived                         |
| 32 | **Account switching**              | Top-bar avatar menu                       | `login`, `logout` (multi-account in localStorage)                                                                           | `sessions`                      |

## Tier 2 — UI Stubs (read-only, seeded data)

| #  | Feature                             | Page type          | Notes                                                |
| -- | ----------------------------------- | ------------------ | ---------------------------------------------------- |
| 33 | **Sharing and permissions**         | Folder menu action | Toast stub (per §1 — no auth backend yet)            |
| 34 | **Assign policy**                   | Folder menu action | Toast stub                                           |
| 35 | **Add shared folder to mailbox**    | Folder menu action | Toast stub                                           |
| 36 | **Recover items**                   | Folder menu action | Toast stub                                           |
| 37 | **Microsoft 365 app launcher**      | Top-bar waffle     | 17 Fluent app icons; only Outlook/To Do navigate     |
| 38 | **Add-ins (Zoom/Salesforce/Asana)** | Left rail bottom   | Visual stubs, no integration                         |

## Design Tokens

Lifted from the Outlook web UI's Fluent design system. Full list in
`app/frontend/src/design-tokens.css`. Headline values:

- **Sidebar background:** `#F3F2F1`
- **Topbar background:** `#0F6CBD`
- **Primary action color:** `#0078D4`
- **Hover surface:** `#EDEBE9`
- **Active selection surface:** `#EBF3FB`
- **Active selection text/border:** `#0078D4`
- **Font family:** `Segoe UI, system-ui, sans-serif`
- **Body text size:** `0.875rem (14px)`
- **Border radius:** `4px (controls), 2px (rows)`

## Navigation Structure

Top app rail (left):

1. **Mail** → `/mail/inbox`
2. **Calendar** → `/calendar/month`
3. **People** → `/contacts`
4. **To Do** → `/tasks`
5. **Groups** → `/groups`

Plus visual add-in stubs at the bottom (Zoom / Salesforce / Asana).

Mail folder sidebar (when /mail is active):

- **Favorites** (collapsible) — Inbox, Drafts, Sent Items
- **<account email>** (collapsible) — Inbox, Drafts, Sent Items, Scheduled,
  Archive, Junk Email, Deleted Items, Snoozed (virtual), Follow up (virtual),
  any custom user folders (recursive).
- "Go to Groups" jump link at the bottom.
