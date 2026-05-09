Copy-paste this into Claude Code as the feature spec.

# Outlook Calendar Scheduling UX Spec

## Goal

Build a realistic Outlook Web-style scheduling experience inside the Calendar route. The scope is limited to three calendar event scheduling features:

1. Scheduling Assistant with attendee availability grid
2. Find a time helper with suggested slots
3. Room finder with bookable rooms

This is a UI clone/prototype. Do not connect to Microsoft Graph, Exchange, Teams, or real calendar APIs. Use deterministic mock data and local state.

---

# Feature Area: Calendar Event Scheduling

## Primary User Story

As a calendar user, I want to create a meeting, check attendee availability, find a mutually available time, and choose an available room, so that I can schedule a realistic meeting from the calendar interface.

## Route

Use the existing Calendar route.

Recommended route:

```txt
/calendar
The route should show the Outlook-style calendar page in the background. The scheduling features should appear inside the “New event” modal.

Shared UX Requirements
Layout
The Calendar route should have:

Outlook-style blue top app bar
Left vertical app rail
Left calendar sidebar with mini month calendar
Main calendar grid in the background
A centered “New event - Calendar” modal when creating/editing an event
Modal
The event modal should support two main views:

Event form view
Scheduling assistant view
The modal should remain centered over the calendar background.

Modal Header
The header should include:

Title: New event - Calendar
Top-right actions:
Expand icon
Close icon
Modal Toolbar
The toolbar should include:

Save primary button
Discard secondary button
Scheduling assistant button
Busy status dropdown
Categorize dropdown
Response options dropdown
Overflow menu
These controls can be non-functional unless explicitly described below.

Shared Mock Data
Use this mock data for the prototype.

const attendees = [
  {
    id: "attendee-1",
    name: "Sarah Nguyen",
    initials: "SN",
    email: "sarah.nguyen@example.com",
    type: "required",
    status: "busy",
    avatarColor: "pink",
    availability: [
      { start: "13:10", end: "13:25", status: "busy" },
      { start: "13:40", end: "14:25", status: "busy" },
      { start: "16:00", end: "16:55", status: "busy" }
    ]
  },
  {
    id: "attendee-2",
    name: "Miguel Hernandez",
    initials: "MH",
    email: "miguel.hernandez@example.com",
    type: "required",
    status: "tentative",
    avatarColor: "purple",
    availability: [
      { start: "14:10", end: "14:30", status: "tentative" }
    ]
  },
  {
    id: "attendee-3",
    name: "Daisy Wilkins",
    initials: "DW",
    email: "daisy.wilkins@example.com",
    type: "required",
    status: "tentative",
    avatarColor: "blue",
    availability: [
      { start: "13:35", end: "14:05", status: "tentative" },
      { start: "15:55", end: "16:25", status: "tentative" }
    ]
  }
];

const rooms = [
  {
    id: "room-1",
    name: "Conf Room Adams",
    location: "Building 1, Floor 2",
    capacity: 8,
    status: "available"
  },
  {
    id: "room-2",
    name: "Focus Room 1",
    location: "Building 1, Floor 2",
    capacity: 4,
    status: "available"
  },
  {
    id: "room-3",
    name: "Focus Room 2",
    location: "Building 1, Floor 3",
    capacity: 6,
    status: "available"
  },
  {
    id: "room-4",
    name: "Conf Room Baker",
    location: "Building 1, Floor 2",
    capacity: 10,
    status: "busy"
  },
  {
    id: "room-5",
    name: "Conf Room Crystal",
    location: "Building 1, Floor 1",
    capacity: 12,
    status: "busy"
  }
];

const suggestedTimes = [
  {
    id: "slot-1",
    start: "14:30",
    end: "15:00",
    label: "2:30 PM - 3:00 PM",
    duration: "30 min",
    availableCount: 2,
    isRecommended: true
  },
  {
    id: "slot-2",
    start: "15:00",
    end: "15:30",
    label: "3:00 PM - 3:30 PM",
    duration: "30 min",
    availableCount: 2
  },
  {
    id: "slot-3",
    start: "15:30",
    end: "16:00",
    label: "3:30 PM - 4:00 PM",
    duration: "30 min",
    availableCount: 2
  },
  {
    id: "slot-4",
    start: "16:00",
    end: "16:30",
    label: "4:00 PM - 4:30 PM",
    duration: "30 min",
    availableCount: 2
  },
  {
    id: "slot-5",
    start: "16:30",
    end: "17:00",
    label: "4:30 PM - 5:00 PM",
    duration: "30 min",
    availableCount: 2
  }
];
Feature 1: Scheduling Assistant
User Story
As a user creating a meeting, I want to open the scheduling assistant and view attendee availability on a time grid, so that I can visually choose a time that works for everyone.

Entry Point
From the New Event modal, the user clicks:

Scheduling assistant
This switches the modal from the event form view to the scheduling assistant view.

Scheduling Assistant Layout
The modal should show:

Top Tab Row
Event
Scheduling assistant active with blue underline
Response options
Control Row
Below the tab row, show:

Today button
Previous date chevron
Next date chevron
Date dropdown: Fri, May 8, 2026
Start time dropdown: 3:00 PM
Text: to
End time dropdown: 3:30 PM
Timezone dropdown: (UTC-5:00) Eastern Time (US & Canada)
All day toggle
Main Body
The main body has two panes:

Left Pane: Attendee and Room List
Sections:

Required attendees
Optional attendees
Rooms
Required attendees should show:

Avatar initials
Attendee name
Status text
Remove X action
Example:

SN  Sarah Nguyen
    Busy

MH  Miguel Hernandez
    Tentative

DW  Daisy Wilkins
    Tentative
Rooms should show:

Conf Room Adams
Available

Focus Room 1
Available
Each section should have a small expand/collapse chevron.

Add actions:

+ Add required attendee
+ Add optional attendee
+ Add a room
These can be visually interactive but do not need full search functionality.

Right Pane: Availability Grid
Show a timeline grid for:

Friday, May 8, 2026
Time labels:

1 PM | 2 PM | 3 PM | 4 PM | 5 PM
Rows should align with attendees and rooms from the left pane.

Availability blocks:

Busy = purple diagonal hatch block
Tentative = blue diagonal hatch block
Available = green subtle background
Out of office = gray block
Show a selected meeting slot from:

3:00 PM - 3:30 PM
The selected slot should be:

Light blue vertical block
Blue border
Circular drag handles at top and bottom
Spanning the grid vertically across all rows
Bottom Legend
Show a legend row at the bottom:

Available
Busy
Tentative
Out of office
Working hours
Bottom Actions
Bottom-right buttons:

OK
Cancel
Interaction Requirements
Switch to Scheduling Assistant
Given the user is in the New Event modal
When the user clicks Scheduling assistant
Then the modal should switch to the scheduling assistant layout
And the active tab should be visually underlined in blue.

Select Time Slot
Given the scheduling assistant grid is visible
When the user clicks any available 30-minute slot in the grid
Then the selected blue vertical block should move to that slot
And the event start/end time should update.

Example:

Click 3:30 PM - 4:00 PM
Start time becomes 3:30 PM
End time becomes 4:00 PM
Confirm Time Slot
Given the user has selected a time slot
When the user clicks OK
Then the modal should return to the Event form view
And the event date/time fields should reflect the selected slot.

Cancel
Given the scheduling assistant is open
When the user clicks Cancel
Then the modal should return to the Event form view
And no time changes should be applied.

Acceptance Criteria
The scheduling assistant is accessible from the event modal.
The assistant shows a left attendee/room list and a right availability grid.
Busy, tentative, and available statuses are visually distinct.
A selected 30-minute slot is highlighted.
The user can click a slot to update the selected time.
OK applies the selected time.
Cancel discards changes.
No real calendar API is required.
Feature 2: Find a Time Helper
User Story
As a user creating a meeting, I want Outlook to suggest available time slots, so that I can quickly pick a time without manually scanning the whole grid.

Entry Point
The Find a time helper appears inside the New Event modal when:

The user has added at least one required attendee
The user has selected a meeting duration
The user is in the normal Event form view
The helper should appear as a right-side pane inside the event modal.

Layout
The modal should be split into two sections:

Left Section: Event Form
Show:

Calendar dropdown
Add title field
Required attendees field
Attendee chips
Date field
Start time dropdown
End time dropdown
All day toggle
Time zones link
Repeat dropdown
Location field
Teams meeting toggle
Description box
Attendee chips should look like Outlook chips:

SN Sarah Nguyen ×
MH Miguel Hernandez ×
Right Section: Find a Time Pane
Pane title:

Find a time
Top controls:

Close X
Date selector row:
Previous chevron
Calendar icon
Fri, May 8, 2026
Next chevron
Duration selector:

Duration: 30 minutes
Preferences link:

Preferences
Availability summary:

Excellent! Everyone is available.
Select a time to schedule.
Suggested slot cards:

2:30 PM - 3:00 PM
30 min
2 available

3:00 PM - 3:30 PM
30 min
2 available

3:30 PM - 4:00 PM
30 min
2 available

4:00 PM - 4:30 PM
30 min
2 available

4:30 PM - 5:00 PM
30 min
2 available
The first recommended slot should have:

Blue border
Light blue background
Slightly stronger visual emphasis
Bottom link:

Can’t find a suitable time?
Suggest a new time
Interaction Requirements
Show Suggested Times
Given the event modal has at least two attendees
When the modal is open
Then the Find a time pane should show suggested slots.

Select Suggested Time
Given the Find a time pane is visible
When the user clicks a suggested time card
Then that card should become selected
And the event start/end time fields should update.

Example:

Click card: 4:00 PM - 4:30 PM

Event fields update:
Start: 4:00 PM
End: 4:30 PM
Close Pane
Given the Find a time pane is open
When the user clicks the close X
Then the pane should close
And the main event form should expand to fill the modal width.

Suggest a New Time
Given the user clicks Suggest a new time
Then show a lightweight empty state or toast:

More suggestions are not available in this prototype.
Do not build a full scheduling poll.

Suggested Time Logic
For this prototype, suggested times can be hardcoded using suggestedTimes.

Optional enhancement:

Calculate suggested times by scanning 30-minute windows and excluding attendee busy/tentative blocks.

Acceptance Criteria
The Find a time pane appears on the right side of the New Event modal.
It lists suggested 30-minute slots.
Each card shows time range, duration, and availability count.
Selecting a card updates the event time.
The selected suggestion has a blue outline.
The pane can be closed.
No real scheduling backend is required.
Feature 3: Room Finder / Bookable Rooms
User Story
As a user creating a meeting, I want to search and select an available room, so that I can book a physical meeting space while scheduling the event.

Entry Point
The room finder appears when the user focuses or clicks the location field:

Search for a location or room
The location field is inside the Event form view.

Layout
When focused, show a dropdown/popover below the location field.

Popover title:

Suggested rooms
Room list:

Conf Room Adams
Available · Building 1, Floor 2
Capacity 8

Focus Room 1
Available · Building 1, Floor 2
Capacity 4

Focus Room 2
Available · Building 1, Floor 3
Capacity 6

Conf Room Baker
Busy · Building 1, Floor 2
Capacity 10

Conf Room Crystal
Busy · Building 1, Floor 1
Capacity 12
Each room row should include:

Room icon
Room name
Availability status
Location/floor
Capacity icon and number
Visual status:

Available = green text/icon
Busy = red text or muted danger text
Available room icon = green
Busy room icon = purple/red muted
Bottom action:

Browse all rooms
Interaction Requirements
Open Room Finder
Given the user is in the New Event modal
When the user clicks the location field
Then the suggested rooms popover should appear.

Select Available Room
Given the room finder popover is open
When the user clicks an available room
Then the location field should be populated with that room name
And the popover should close.

Example:

Selected room: Conf Room Adams

Location field:
Conf Room Adams
Select Busy Room
Given the room finder popover is open
When the user clicks a busy room
Then the room should not be selected
And show a small inline warning or toast:

This room is busy at the selected time.
Browse All Rooms
Given the popover is open
When the user clicks Browse all rooms
Then show a simple modal or side panel listing all rooms from the mock data.

For this prototype, it can reuse the same room list with a title:

All rooms
Acceptance Criteria
Clicking the location field opens a room suggestions popover.
Available and busy rooms are visually distinct.
Available rooms can be selected.
Busy rooms cannot be selected.
Selected room appears in the location field.
Browse all rooms shows a larger list or simple expanded panel.
No real room booking API is required.
Combined User Flow
User Story
As a user, I want to create a meeting, invite people, find a time, check availability, and choose a room in one flow, so that the scheduling experience feels complete.

Flow
User opens /calendar.
User clicks New event.
New Event modal opens.
User adds title.
User adds required attendees.
Find a time pane shows suggested slots.
User clicks a suggested slot.
Event start/end time updates.
User clicks Scheduling assistant.
Scheduling assistant grid opens.
User visually confirms attendee availability.
User clicks OK.
User clicks location field.
Room finder popover opens.
User selects an available room.
Location field updates.
User clicks Save.
Modal closes.
Calendar grid shows the new event block.
Save Behavior
On save, create a local mock event in state.

Event card on calendar should show:

3:30 PM - 4:00 PM
Project Sync
Conf Room Adams
No persistence required beyond page state.

Event State Shape
Use a single local state object for the current draft event.

type EventDraft = {
  id?: string;
  calendarId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  isAllDay: boolean;
  attendees: Attendee[];
  room?: Room;
  location?: string;
  teamsMeeting: boolean;
  repeat: "none" | "daily" | "weekly" | "monthly";
  showAs: "busy" | "free" | "tentative" | "outOfOffice";
  description: string;
};
Default draft:

const defaultDraft = {
  calendarId: "primary",
  title: "",
  date: "2026-05-08",
  startTime: "15:30",
  endTime: "16:00",
  timezone: "(UTC-5:00) Eastern Time (US & Canada)",
  isAllDay: false,
  attendees: [],
  room: undefined,
  location: "",
  teamsMeeting: false,
  repeat: "none",
  showAs: "busy",
  description: ""
};
Component Structure
Recommended components:

CalendarRoute
  ├── OutlookTopBar
  ├── OutlookAppRail
  ├── CalendarSidebar
  ├── CalendarGrid
  └── EventModal
       ├── EventModalHeader
       ├── EventToolbar
       ├── EventFormView
       │    ├── CalendarSelector
       │    ├── TitleInput
       │    ├── AttendeeInput
       │    ├── DateTimeFields
       │    ├── LocationField
       │    ├── RoomFinderPopover
       │    ├── DescriptionBox
       │    └── FindATimePane
       └── SchedulingAssistantView
            ├── SchedulingAssistantToolbar
            ├── AttendeeRoomList
            ├── AvailabilityGrid
            ├── AvailabilityLegend
            └── SchedulingAssistantActions
Visual Design Requirements
Colors
Use Outlook-like colors:

--outlook-blue: #0078d4;
--outlook-blue-dark: #005a9e;
--border-subtle: #e1e1e1;
--text-primary: #242424;
--text-secondary: #616161;
--bg-page: #f5f5f5;
--bg-modal: #ffffff;
--available-green: #107c10;
--available-bg: #eaf7ea;
--busy-purple: #b146c2;
--tentative-blue: #5b8def;
--danger-red: #c4314b;
Typography
Use system font stack:

font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
Modal Styling
White background
Rounded corners: 8px to 12px
Subtle shadow
Thin border
Background calendar slightly dimmed or visually pushed back
Grid Styling
Thin gray grid lines
Hour columns
Row-aligned attendee/room blocks
Diagonal hatch pattern for busy/tentative blocks
Selected slot in light blue with blue border
Empty States
No Attendees
If there are no attendees, Find a time should show:

Add attendees to see suggested times.
No Rooms
If no rooms match, show:

No rooms found.
Try browsing all rooms.
No Suggested Times
If suggestedTimes is empty, show:

No suitable times found.
Try changing the duration or date.
Validation Rules
Save Button
Allow save only if:

Title is not empty
Start time is before end time
Date is selected
If title is empty and user clicks Save:

Add a title before saving this event.
If time range is invalid:

End time must be after start time.
Non-Goals
Do not implement:

Microsoft Graph integration
Real attendee search
Real Exchange free/busy data
Real room mailbox booking
Real Teams meeting link generation
Scheduling polls
Recurring event backend logic
Cross-user permissions
This is a high-fidelity UI prototype using mock data.

Final Acceptance Checklist
Scheduling Assistant
 User can open Scheduling Assistant from the event modal.
 Attendees and rooms appear in the left pane.
 Availability grid appears in the right pane.
 Busy, tentative, available, and out-of-office states have distinct visual styles.
 Selected time slot is highlighted.
 Clicking a slot updates selected time.
 OK applies selected time.
 Cancel discards selected time.
Find a Time
 Right-side Find a time pane appears in event form view.
 Suggested time cards are visible.
 Recommended slot is highlighted.
 Clicking a suggested time updates event time.
 Pane can be closed.
 Empty state works when no attendees exist.
Room Finder
 Clicking location field opens suggested rooms.
 Available rooms show green status.
 Busy rooms show busy status.
 Selecting available room updates location.
 Selecting busy room shows warning.
 Browse all rooms opens expanded room list.
Save Flow
 User can create a local event.
 Modal closes on save.
 New event appears on the calendar grid.
 No external API is required.
```
