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

/** Pixel grid: 1 PM → 5 PM = 4 hours = 240 minutes. */
export const SA_GRID_START_HOUR = 13
export const SA_GRID_END_HOUR = 17
export const SA_GRID_TOTAL_MINUTES = (SA_GRID_END_HOUR - SA_GRID_START_HOUR) * 60

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
