/**
 * Mock data for the Scheduling Assistant + Find-a-time + Room finder UI.
 *
 * Per senior's spec (scheduleassistanttask.md) this is a deterministic,
 * client-only prototype — no Microsoft Graph / Exchange / Teams / real
 * free-busy data. The same dataset feeds the SA grid, the Find-a-time
 * suggested cards, and the Room finder popover so they stay consistent.
 */
export interface MockAttendee {
  id: string
  name: string
  initials: string
  email: string
  type: 'required' | 'optional'
  status: 'busy' | 'tentative' | 'available'
  avatarColor: 'pink' | 'purple' | 'blue' | 'green' | 'orange'
  /** "HH:MM" 24h on the mock day (May 8, 2026). */
  availability: { start: string; end: string; status: 'busy' | 'tentative' }[]
}

export interface MockRoom {
  id: string
  name: string
  location: string
  capacity: number
  status: 'available' | 'busy'
}

export interface MockSuggestedSlot {
  id: string
  start: string
  end: string
  label: string
  duration: string
  availableCount: number
  isRecommended?: boolean
}

export const MOCK_ATTENDEES: MockAttendee[] = [
  {
    id: 'attendee-1',
    name: 'Sarah Nguyen',
    initials: 'SN',
    email: 'sarah.nguyen@example.com',
    type: 'required',
    status: 'busy',
    avatarColor: 'pink',
    availability: [
      { start: '13:10', end: '13:25', status: 'busy' },
      { start: '13:40', end: '14:25', status: 'busy' },
      { start: '16:00', end: '16:55', status: 'busy' },
    ],
  },
  {
    id: 'attendee-2',
    name: 'Miguel Hernandez',
    initials: 'MH',
    email: 'miguel.hernandez@example.com',
    type: 'required',
    status: 'tentative',
    avatarColor: 'purple',
    availability: [{ start: '14:10', end: '14:30', status: 'tentative' }],
  },
  {
    id: 'attendee-3',
    name: 'Daisy Wilkins',
    initials: 'DW',
    email: 'daisy.wilkins@example.com',
    type: 'required',
    status: 'tentative',
    avatarColor: 'blue',
    availability: [
      { start: '13:35', end: '14:05', status: 'tentative' },
      { start: '15:55', end: '16:25', status: 'tentative' },
    ],
  },
]

export const MOCK_ROOMS: MockRoom[] = [
  { id: 'room-1', name: 'Conf Room Adams', location: 'Building 1, Floor 2', capacity: 8, status: 'available' },
  { id: 'room-2', name: 'Focus Room 1', location: 'Building 1, Floor 2', capacity: 4, status: 'available' },
  { id: 'room-3', name: 'Focus Room 2', location: 'Building 1, Floor 3', capacity: 6, status: 'available' },
  { id: 'room-4', name: 'Conf Room Baker', location: 'Building 1, Floor 2', capacity: 10, status: 'busy' },
  { id: 'room-5', name: 'Conf Room Crystal', location: 'Building 1, Floor 1', capacity: 12, status: 'busy' },
]

export const MOCK_SUGGESTED_SLOTS: MockSuggestedSlot[] = [
  { id: 'slot-1', start: '14:30', end: '15:00', label: '2:30 PM - 3:00 PM', duration: '30 min', availableCount: 2, isRecommended: true },
  { id: 'slot-2', start: '15:00', end: '15:30', label: '3:00 PM - 3:30 PM', duration: '30 min', availableCount: 2 },
  { id: 'slot-3', start: '15:30', end: '16:00', label: '3:30 PM - 4:00 PM', duration: '30 min', availableCount: 2 },
  { id: 'slot-4', start: '16:00', end: '16:30', label: '4:00 PM - 4:30 PM', duration: '30 min', availableCount: 2 },
  { id: 'slot-5', start: '16:30', end: '17:00', label: '4:30 PM - 5:00 PM', duration: '30 min', availableCount: 2 },
]

/** Full-day grid: 12 AM → 12 AM (24 hours). The SA view container is
 *  horizontally scrollable, so users can scan the whole day; the working
 *  hours band (8 AM–6 PM) is highlighted with a paler background. */
export const SA_GRID_START_HOUR = 0
export const SA_GRID_END_HOUR = 24
export const SA_GRID_TOTAL_MINUTES = (SA_GRID_END_HOUR - SA_GRID_START_HOUR) * 60
/** Working hours band — used to draw the lighter "available" tint behind
 *  the rows; outside this range the row is a slightly darker non-working
 *  background, matching the Outlook SA legend. */
export const SA_WORKING_START_HOUR = 8
export const SA_WORKING_END_HOUR = 18

/** Convert an "HH:MM" string into minutes-since-grid-start. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h - SA_GRID_START_HOUR) * 60 + m
}

/** Background colors for attendee avatars (matches the spec naming). */
export const AVATAR_COLOR: Record<MockAttendee['avatarColor'], string> = {
  pink: '#E3008C',
  purple: '#8764B8',
  blue: '#0078D4',
  green: '#107C10',
  orange: '#FF8C00',
}

const COLOR_KEYS: MockAttendee['avatarColor'][] = ['pink', 'purple', 'blue', 'green', 'orange']

/** Stable-ish hash → number, used to deterministically pick a color or
 *  seed mock availability so the same email always renders the same way. */
function djb2(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  return h
}

/** Pull initials out of a display name; falls back to email local-part. */
function deriveInitials(name: string | undefined, email: string): string {
  const source = (name && name.trim()) || email.split('@')[0]
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

/** Build a MockAttendee from a real invitee. Color is deterministic on
 *  email; availability also folds in `dateKey` (yyyy-MM-dd) so changing
 *  the SA date redraws plausibly different schedules per person. The
 *  layout stays stable on the same date though — same email + date =
 *  same blocks. Generates 1–3 busy/tentative blocks within 1 PM–5 PM. */
export function makeAttendeeFromEmail(
  email: string,
  name?: string,
  type: 'required' | 'optional' = 'required',
  dateKey?: string,
): MockAttendee {
  const h = djb2(email + (dateKey ?? ''))
  // Color is keyed on email alone so the same person always shows the
  // same avatar tint regardless of which date is active.
  const color = COLOR_KEYS[djb2(email) % COLOR_KEYS.length]
  // Deterministic 1–2 busy + 0–1 tentative blocks, snapped to 5-min ticks.
  const blocks: { start: string; end: string; status: 'busy' | 'tentative' }[] = []
  // First busy block — somewhere in 1–3 PM
  const b1Start = 13 * 60 + ((h >> 1) % 24) * 5
  const b1Dur = 15 + ((h >> 5) % 4) * 10
  blocks.push({
    start: minutesToHHMM(b1Start),
    end: minutesToHHMM(b1Start + b1Dur),
    status: 'busy',
  })
  // Second busy block — somewhere in 3–5 PM (skip if hash bit 12 set)
  if ((h & (1 << 12)) === 0) {
    const b2Start = 15 * 60 + ((h >> 7) % 24) * 5
    const b2Dur = 20 + ((h >> 9) % 4) * 10
    blocks.push({
      start: minutesToHHMM(b2Start),
      end: minutesToHHMM(b2Start + b2Dur),
      status: 'busy',
    })
  }
  // Optional tentative — 50% based on hash bit
  if ((h & (1 << 14)) !== 0) {
    const tStart = 13 * 60 + 30 + ((h >> 11) % 36) * 5
    const tDur = 20 + ((h >> 13) % 3) * 10
    blocks.push({
      start: minutesToHHMM(tStart),
      end: minutesToHHMM(tStart + tDur),
      status: 'tentative',
    })
  }
  // Top-level status reflects the most-severe block.
  const status: MockAttendee['status'] = blocks.some((b) => b.status === 'busy')
    ? 'busy'
    : blocks.some((b) => b.status === 'tentative')
      ? 'tentative'
      : 'available'
  return {
    id: `attendee-${email}`,
    name: name?.trim() || email,
    initials: deriveInitials(name, email),
    email,
    type,
    status,
    avatarColor: color,
    availability: blocks.sort((a, b) => a.start.localeCompare(b.start)),
  }
}

function minutesToHHMM(minutes: number): string {
  const h = Math.max(SA_GRID_START_HOUR, Math.min(SA_GRID_END_HOUR, Math.floor(minutes / 60)))
  const m = Math.max(0, Math.min(59, minutes % 60))
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
