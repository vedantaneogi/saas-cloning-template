'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X as XIcon, Plus, Building2, Users as UsersIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { events, contacts } from '@/lib/api'
import type { Contact } from '@/lib/api'
import {
  MOCK_ROOMS,
  AVATAR_COLOR,
  makeAttendeeFromEmail,
  timeToMinutes,
  SA_GRID_START_HOUR,
  SA_GRID_END_HOUR,
  SA_GRID_TOTAL_MINUTES,
  SA_WORKING_START_HOUR,
  SA_WORKING_END_HOUR,
  type MockAttendee,
  type MockRoom,
} from './scheduling-mock'

/** Pixel width per hour in the timeline. 24 × 70 = 1680px scrolling area. */
const HOUR_PX = 70

interface SchedulingAssistantViewProps {
  /** Initial start time in "HH:MM" format. */
  initialStart?: string
  /** Initial duration in minutes. */
  initialDurationMinutes?: number
  /** Initial date for the grid; falls back to today. */
  initialDate?: Date
  /** Real invitees from the parent form. */
  invitedAttendees?: { email: string; name?: string }[]
  /** Organizer (current user) — rendered as the first required row so the
   *  creator's own busy time is visible alongside everyone they invited.
   *  In Outlook the organizer is implicitly part of the meeting. */
  organizer?: { email: string; name: string }
  /** Add an invitee (called when the inline + Add input submits). */
  onAddInvitee?: (email: string, name?: string) => void
  /** Remove an invitee from the parent's list. */
  onRemoveInvitee?: (email: string) => void
  /** User-created rooms (session-only) — shown alongside MOCK_ROOMS in the
   *  Rooms add-picker. */
  extraRooms?: MockRoom[]
  /** Persist a newly-created room (e.g. quick-add inline). */
  onCreateRoom?: (room: MockRoom) => void
  /** Currently picked room IDs (lifted to parent so the location-field
   *  selection and SA's Rooms list stay in sync). */
  pickedRoomIds?: string[]
  /** Setter for picked rooms — parent merges with the location field. */
  onPickedRoomsChange?: (ids: string[]) => void
  /** Confirm — emits the chosen date + "HH:MM" start + minutes-duration. */
  onConfirm: (date: Date, startHHMM: string, durationMinutes: number) => void
  /** Cancel — discard selection and return to event form. */
  onCancel: () => void
}

/** "yyyy-MM-dd" key used to vary mock availability per date. */
function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

/**
 * Outlook Web Scheduling Assistant clone.
 *
 * Now fully interactive (per senior follow-up): real date/time controls,
 * removable demo attendees, working + Add buttons for required / optional /
 * room, and a Response options flyout. The grid still uses deterministic
 * mock availability — the dateKey hash means changing the date redraws
 * plausibly different schedules without any backend.
 */
export function SchedulingAssistantView({
  initialStart = '15:00',
  initialDurationMinutes = 30,
  initialDate,
  invitedAttendees = [],
  organizer,
  extraRooms = [],
  onCreateRoom,
  pickedRoomIds: pickedRoomIdsProp,
  onPickedRoomsChange,
  onAddInvitee,
  onRemoveInvitee,
  onConfirm,
  onCancel,
}: SchedulingAssistantViewProps) {
  // Date / time
  const [selectedStart, setSelectedStart] = useState(initialStart)
  const [selectedDuration, setSelectedDuration] = useState(initialDurationMinutes)
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate ?? new Date())

  // Optional-attendee toggle (SA-internal — the parent's invitee list is a
  // single bucket; we just visually split which ones are "optional" here).
  const [optionalEmails, setOptionalEmails] = useState<Set<string>>(new Set())
  // Rooms picked — controlled when the parent passes pickedRoomIds (it
  // does, so the location-field selection and SA stay in sync).
  // Falls back to local state for standalone usage.
  const [localPicked, setLocalPicked] = useState<string[]>([])
  const pickedRoomIds = pickedRoomIdsProp ?? localPicked
  const setPickedRoomIds = (updater: (prev: string[]) => string[]) => {
    if (onPickedRoomsChange) onPickedRoomsChange(updater(pickedRoomIds))
    else setLocalPicked(updater)
  }

  // Inline + Add editors (open/close state only — Section manages email +
  // contact suggestions internally)
  const [addReqOpen, setAddReqOpen] = useState(false)
  const [addOptOpen, setAddOptOpen] = useState(false)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const addRoomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!addRoomOpen) return
    const h = (e: MouseEvent) => {
      if (addRoomRef.current && !addRoomRef.current.contains(e.target as Node)) setAddRoomOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [addRoomOpen])

  // Response options flyout
  const [responseOpen, setResponseOpen] = useState(false)
  const responseRef = useRef<HTMLDivElement>(null)
  const [respFlags, setRespFlags] = useState({ request: true, forward: true, hide: false })
  useEffect(() => {
    if (!responseOpen) return
    const h = (e: MouseEvent) => {
      if (responseRef.current && !responseRef.current.contains(e.target as Node)) setResponseOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [responseOpen])

  // Fetch real availability for invited attendees from /events/availability.
  // The endpoint returns busy/tentative/OOO slots per email for the day's
  // window; we then filter to the SA grid range (1 PM–5 PM) and render
  // each attendee's actual schedule. External emails (no user record in
  // this clone) come back with empty slots = treated as "available".
  const dk = dateKey(selectedDate)
  const dayStart = useMemo(() => {
    const d = new Date(selectedDate); d.setHours(0, 0, 0, 0); return d
  }, [selectedDate])
  const dayEnd = useMemo(() => {
    const d = new Date(selectedDate); d.setHours(23, 59, 59, 999); return d
  }, [selectedDate])
  // Combined list: organizer + invitees (deduped by email). The organizer
  // is always rendered first in Required so the creator's busy time is
  // visible alongside everyone they invited.
  const allInvitees: { email: string; name?: string; isOrganizer?: boolean }[] = (() => {
    const out: { email: string; name?: string; isOrganizer?: boolean }[] = []
    const seen = new Set<string>()
    if (organizer) {
      out.push({ email: organizer.email, name: organizer.name, isOrganizer: true })
      seen.add(organizer.email.toLowerCase())
    }
    for (const a of invitedAttendees) {
      const lower = (a.email || '').toLowerCase()
      if (!lower || seen.has(lower)) continue
      out.push(a)
      seen.add(lower)
    }
    return out
  })()
  const emailsKey = allInvitees.map((a) => a.email).sort().join(',')
  const { data: availabilityData } = useQuery({
    queryKey: ['sa-availability', emailsKey, dk],
    queryFn: () =>
      events.getAvailability(
        allInvitees.map((a) => a.email),
        dayStart.toISOString(),
        dayEnd.toISOString(),
      ),
    enabled: allInvitees.length > 0,
  })

  /** Map a real /availability response to an HH:MM block list, clamped
   *  to the visible grid window. Only `busy` and `tentative` render as
   *  hatch blocks; `out_of_office` would render as gray (kept as `busy`
   *  here for simplicity since the SA legend treats them similarly). */
  const realBlocksFor = (email: string): { start: string; end: string; status: 'busy' | 'tentative' }[] => {
    const row = (availabilityData ?? []).find((r) => r.attendee.toLowerCase() === email.toLowerCase())
    if (!row) return []
    const out: { start: string; end: string; status: 'busy' | 'tentative' }[] = []
    for (const s of row.slots) {
      const sd = new Date(s.start)
      const ed = new Date(s.end)
      // Clamp to selectedDate's grid window
      const gridStart = new Date(selectedDate); gridStart.setHours(SA_GRID_START_HOUR, 0, 0, 0)
      const gridEnd = new Date(selectedDate); gridEnd.setHours(SA_GRID_END_HOUR, 0, 0, 0)
      const startMs = Math.max(sd.getTime(), gridStart.getTime())
      const endMs = Math.min(ed.getTime(), gridEnd.getTime())
      if (endMs <= startMs) continue
      const startD = new Date(startMs)
      const endD = new Date(endMs)
      const fmt = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const status: 'busy' | 'tentative' = s.status === 'tentative' ? 'tentative' : 'busy'
      out.push({ start: fmt(startD), end: fmt(endD), status })
    }
    return out
  }

  // Build attendee rows. Color + initials still come from the email-hash
  // helper (so the same person looks the same across days), but the
  // availability blocks are now the real schedule. The organizer is always
  // required (you can't make yourself optional), invitees can be flipped
  // via optionalEmails.
  const liveAttendees: MockAttendee[] = allInvitees.map((a) => {
    const isOpt = !a.isOrganizer && optionalEmails.has(a.email)
    const base = makeAttendeeFromEmail(a.email, a.name, isOpt ? 'optional' : 'required', dk)
    const realBlocks = realBlocksFor(a.email)
    const displayName = a.isOrganizer ? `${base.name} (organizer)` : base.name
    return { ...base, name: displayName, availability: realBlocks }
  })
  const required = liveAttendees.filter((a) => a.type === 'required')
  const optional = liveAttendees.filter((a) => a.type === 'optional')
  const allKnownRooms = [...MOCK_ROOMS, ...extraRooms]
  const pickedRooms: MockRoom[] = pickedRoomIds
    .map((id) => allKnownRooms.find((r) => r.id === id))
    .filter((r): r is MockRoom => !!r)

  const selectedStartMin = timeToMinutes(selectedStart)
  const selectedLeftPct = (selectedStartMin / SA_GRID_TOTAL_MINUTES) * 100
  const selectedWidthPct = (selectedDuration / SA_GRID_TOTAL_MINUTES) * 100

  // Click anywhere on the grid → snap to nearest 30-min slot.
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    const minutes = Math.round((pct * SA_GRID_TOTAL_MINUTES) / 30) * 30
    const hour = SA_GRID_START_HOUR + Math.floor(minutes / 60)
    const minute = minutes % 60
    if (hour < SA_GRID_START_HOUR || hour >= SA_GRID_END_HOUR) return
    setSelectedStart(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  }

  const removeAttendee = (a: MockAttendee) => {
    onRemoveInvitee?.(a.email)
    setOptionalEmails((prev) => {
      const next = new Set(prev)
      next.delete(a.email)
      return next
    })
  }

  const submitAddInvitee = (email: string, name: string | undefined, asOptional: boolean) => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) return
    onAddInvitee?.(trimmed, name)
    if (asOptional) {
      setOptionalEmails((prev) => new Set(prev).add(trimmed))
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* Tab row */}
      <div className="flex items-center gap-1 px-4 pt-2 border-b border-[#EDEBE9] bg-white flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-xs text-[#605E5C] hover:bg-[#F3F2F1] rounded-t"
        >
          Event
        </button>
        <button
          type="button"
          aria-current="page"
          className="px-3 py-2 text-xs font-semibold text-[#0078D4] relative after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:bg-[#0078D4]"
        >
          Scheduling assistant
        </button>
        <div ref={responseRef} className="relative">
          <button
            type="button"
            onClick={() => setResponseOpen((v) => !v)}
            aria-expanded={responseOpen}
            className={cn(
              'px-3 py-2 text-xs rounded-t flex items-center gap-1',
              responseOpen
                ? 'text-[#0078D4] bg-[#EBF3FB] font-medium'
                : 'text-[#605E5C] hover:bg-[#F3F2F1]',
            )}
          >
            Response options <ChevronLeft size={10} className="rotate-[270deg]" />
          </button>
          {responseOpen && (
            <div className="absolute left-0 top-full mt-1 z-30 w-64 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide border-b border-[#EDEBE9]">
                Response options
              </p>
              {(
                [
                  { k: 'request', label: 'Request responses', desc: 'Track who accepted, declined, or proposed.' },
                  { k: 'forward', label: 'Allow forwarding', desc: 'Recipients can forward this invite.' },
                  { k: 'hide', label: 'Hide attendee list', desc: "Don't reveal other attendees to invitees." },
                ] as const
              ).map((row) => (
                <label key={row.k} className="flex items-start gap-2 px-3 py-2 hover:bg-[#F3F2F1] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={respFlags[row.k]}
                    onChange={(e) => setRespFlags((prev) => ({ ...prev, [row.k]: e.target.checked }))}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm text-[#323130]">{row.label}</p>
                    <p className="text-[11px] text-[#605E5C]">{row.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Control row */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[#EDEBE9] bg-[#FAF9F8] flex-shrink-0 text-xs">
        <button type="button" onClick={() => setSelectedDate(new Date())} className="px-2.5 py-1 border border-[#D2D0CE] rounded text-[#323130] hover:bg-[#F3F2F1]">
          Today
        </button>
        <button type="button" onClick={() => setSelectedDate((d) => addDays(d, -1))} aria-label="Previous day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1]">
          <ChevronLeft size={14} />
        </button>
        <button type="button" onClick={() => setSelectedDate((d) => addDays(d, 1))} aria-label="Next day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1]">
          <ChevronRight size={14} />
        </button>
        <input
          type="date"
          value={dateKey(selectedDate)}
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            const [y, m, d] = v.split('-').map(Number)
            setSelectedDate(new Date(y, m - 1, d))
          }}
          aria-label="Date"
          className="border border-[#D2D0CE] rounded px-2 py-1 bg-white"
        />
        <select
          value={selectedStart}
          onChange={(e) => setSelectedStart(e.target.value)}
          aria-label="Start time"
          className="border border-[#D2D0CE] rounded px-2 py-1 bg-white"
        >
          {Array.from({ length: ((SA_GRID_END_HOUR - SA_GRID_START_HOUR) * 60) / 30 }, (_, i) => {
            const minutes = i * 30
            const h = SA_GRID_START_HOUR + Math.floor(minutes / 60)
            const m = minutes % 60
            const hhmm = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
            const display = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
            return (
              <option key={hhmm} value={hhmm}>
                {display}
              </option>
            )
          })}
        </select>
        <span className="text-[#605E5C]">to</span>
        <select
          value={selectedDuration}
          onChange={(e) => setSelectedDuration(Number(e.target.value))}
          aria-label="End time / duration"
          className="border border-[#D2D0CE] rounded px-2 py-1 bg-white text-[#323130]"
        >
          {[15, 30, 45, 60, 90, 120].map((mins) => {
            const endMin = selectedStartMin + mins
            const h = SA_GRID_START_HOUR + Math.floor(endMin / 60)
            const m = endMin % 60
            const display = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'} (${mins}m)`
            return (
              <option key={mins} value={mins}>
                {display}
              </option>
            )
          })}
        </select>
        <select className="border border-[#D2D0CE] rounded px-2 py-1 bg-white">
          <option>(UTC-5:00) Eastern Time (US &amp; Canada)</option>
        </select>
        <label className="flex items-center gap-1.5 text-[#323130] ml-2">
          <input type="checkbox" className="rounded" />
          All day
        </label>
      </div>

      {/* Main body — left list + right grid */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left pane */}
        <aside className="w-64 flex-shrink-0 border-r border-[#EDEBE9] overflow-y-auto outlook-scrollbar">
          <Section
            title="Required attendees"
            attendees={required}
            onRemove={removeAttendee}
            nonRemovableEmail={organizer?.email}
            addOpen={addReqOpen}
            setAddOpen={setAddReqOpen}
            onAdd={(email, name, asOpt) => submitAddInvitee(email, name, asOpt)}
            asOptional={false}
            addLabel="Add required attendee"
            emptyLabel="None added"
          />
          <Section
            title="Optional attendees"
            attendees={optional}
            onRemove={removeAttendee}
            addOpen={addOptOpen}
            setAddOpen={setAddOptOpen}
            onAdd={(email, name, asOpt) => submitAddInvitee(email, name, asOpt)}
            asOptional={true}
            addLabel="Add optional attendee"
            emptyLabel="None added"
          />
          <RoomSection
            rooms={pickedRooms}
            onRemove={(roomId) => setPickedRoomIds((prev) => prev.filter((id) => id !== roomId))}
            addOpen={addRoomOpen}
            setAddOpen={setAddRoomOpen}
            anchorRef={addRoomRef}
            availableRooms={[...MOCK_ROOMS, ...extraRooms].filter((r) => r.status === 'available' && !pickedRoomIds.includes(r.id))}
            onCreateRoom={onCreateRoom}
            onPick={(r) => { setPickedRoomIds((prev) => [...prev, r.id]); setAddRoomOpen(false) }}
          />
        </aside>

        {/* Right pane: timeline. Full-day (12 AM – 12 AM) horizontally
            scrollable. The container width grows with HOUR_PX so the
            user can scan the whole day; working hours (8 AM–6 PM) get
            a lighter background tint per the spec. */}
        <div className="flex-1 min-w-0 overflow-x-auto outlook-scrollbar">
          <div className="relative" style={{ minWidth: HOUR_PX * (SA_GRID_END_HOUR - SA_GRID_START_HOUR) }}>
            {/* Date header — reflects selectedDate */}
            <div className="px-4 py-2 border-b border-[#EDEBE9] bg-white sticky top-0 z-10">
              <p className="text-xs font-semibold text-[#323130]">{format(selectedDate, 'EEEE, MMM d, yyyy')}</p>
            </div>

            {/* Hour labels */}
            <div className="relative h-6 border-b border-[#EDEBE9] bg-white">
              {Array.from({ length: SA_GRID_END_HOUR - SA_GRID_START_HOUR + 1 }, (_, i) => {
                const h = SA_GRID_START_HOUR + i
                const left = (i / (SA_GRID_END_HOUR - SA_GRID_START_HOUR)) * 100
                return (
                  <span
                    key={h}
                    className="absolute top-0 text-[10px] text-[#605E5C]"
                    style={{ left: `${left}%`, transform: 'translateX(-2px)' }}
                  >
                    {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
                  </span>
                )
              })}
            </div>

            {/* Grid rows + selected-slot overlay */}
            <div className="relative" onClick={handleGridClick}>
              {/* Working-hours band — lighter tint behind rows during the
                  configured working window so non-working hours read as
                  grey by contrast (matches the Outlook SA legend). */}
              <div
                className="absolute top-0 bottom-0 bg-[#EAF7EA]/30 pointer-events-none"
                style={{
                  left: `${((SA_WORKING_START_HOUR - SA_GRID_START_HOUR) / (SA_GRID_END_HOUR - SA_GRID_START_HOUR)) * 100}%`,
                  width: `${((SA_WORKING_END_HOUR - SA_WORKING_START_HOUR) / (SA_GRID_END_HOUR - SA_GRID_START_HOUR)) * 100}%`,
                }}
              />
              {/* Vertical hour gridlines */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: SA_GRID_END_HOUR - SA_GRID_START_HOUR + 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-[#EDEBE9]"
                    style={{ left: `${(i / (SA_GRID_END_HOUR - SA_GRID_START_HOUR)) * 100}%` }}
                  />
                ))}
              </div>

              {/* Per-row availability */}
              {[...required, ...optional, ...pickedRooms].map((row) => (
                <AttendeeRow key={'id' in row ? row.id : (row as MockAttendee).id} row={row} />
              ))}

              {/* Selected slot overlay — spans all rows */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none border-2 border-[#0078D4] bg-[#0078D4]/10 z-20"
                style={{ left: `${selectedLeftPct}%`, width: `${selectedWidthPct}%` }}
              >
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#0078D4]" />
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#0078D4]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[#EDEBE9] bg-white text-[10px] text-[#605E5C] flex-shrink-0">
        <LegendSwatch label="Available" cls="bg-[#EAF7EA]" border="border-[#107C10]" />
        <LegendSwatch label="Busy" hatch="busy" />
        <LegendSwatch label="Tentative" hatch="tentative" />
        <LegendSwatch label="Out of office" cls="bg-[#A19F9D]" />
        <LegendSwatch label="Working hours" cls="bg-white" border="border-[#D2D0CE]" />
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#EDEBE9] bg-white flex-shrink-0">
        <button
          type="button"
          onClick={() => onConfirm(selectedDate, selectedStart, selectedDuration)}
          className="bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium px-4 py-1.5 rounded transition-colors"
        >
          OK
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-[#D2D0CE] text-[#323130] text-xs px-4 py-1.5 rounded hover:bg-[#F3F2F1] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function Section({
  title,
  attendees,
  onRemove,
  nonRemovableEmail,
  addOpen,
  setAddOpen,
  onAdd,
  addLabel,
  emptyLabel,
  asOptional = false,
}: {
  title: string
  attendees: MockAttendee[]
  onRemove: (a: MockAttendee) => void
  nonRemovableEmail?: string
  addOpen: boolean
  setAddOpen: (v: boolean) => void
  /** Called when the user submits an entry (typed email or picked contact). */
  onAdd: (email: string, name: string | undefined, asOptional: boolean) => void
  addLabel: string
  emptyLabel?: string
  asOptional?: boolean
}) {
  const lockedEmail = (nonRemovableEmail || '').toLowerCase()
  const [draftEmail, setDraftEmail] = useState('')
  const [draftName, setDraftName] = useState<string | undefined>(undefined)
  const [suggestions, setSuggestions] = useState<Contact[]>([])
  const [suggOpen, setSuggOpen] = useState(false)
  const [suggIndex, setSuggIndex] = useState(0)
  const suggDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addOpen) {
      setDraftEmail(''); setDraftName(undefined); setSuggestions([]); setSuggOpen(false)
    }
  }, [addOpen])

  const queryContacts = (q: string) => {
    if (suggDebounceRef.current) clearTimeout(suggDebounceRef.current)
    if (q.trim().length < 2) {
      setSuggestions([]); setSuggOpen(false); return
    }
    suggDebounceRef.current = setTimeout(async () => {
      try {
        const res = await contacts.autocomplete(q.trim())
        setSuggestions(res.slice(0, 6))
        setSuggOpen(res.length > 0)
        setSuggIndex(0)
      } catch {
        setSuggestions([]); setSuggOpen(false)
      }
    }, 200)
  }

  const submit = (email?: string, name?: string) => {
    const e = (email ?? draftEmail).trim()
    if (!e || !e.includes('@')) return
    onAdd(e, name ?? draftName, asOptional)
    setDraftEmail(''); setDraftName(undefined); setSuggestions([]); setSuggOpen(false); setAddOpen(false)
  }
  return (
    <div className="px-3 py-2 border-b border-[#EDEBE9]">
      <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide mb-1.5">{title}</p>
      {attendees.length === 0 && emptyLabel && (
        <p className="text-[11px] text-[#A19F9D] italic mb-1.5">{emptyLabel}</p>
      )}
      {attendees.map((a) => (
        <div key={a.id} className="flex items-center gap-2 py-1 group">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: AVATAR_COLOR[a.avatarColor] }}
          >
            {a.initials}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#323130] truncate">{a.name}</p>
            <p className="text-[10px] text-[#605E5C] capitalize">{a.status}</p>
          </div>
          {a.email.toLowerCase() !== lockedEmail && (
            <button
              type="button"
              aria-label={`Remove ${a.name}`}
              onClick={() => onRemove(a)}
              className="opacity-0 group-hover:opacity-100 text-[#605E5C] hover:text-[#D13438]"
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
      ))}

      {addOpen ? (
        <div className="mt-1.5 relative">
          <div className="flex items-center gap-1">
            <input
              type="email"
              autoFocus
              value={draftEmail}
              onChange={(e) => {
                const v = e.target.value
                setDraftEmail(v)
                setDraftName(undefined)  // typing clears any prior contact pick
                queryContacts(v)
              }}
              onKeyDown={(e) => {
                if (suggOpen && suggestions.length > 0) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSuggIndex((i) => (i + 1) % suggestions.length); return }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSuggIndex((i) => (i + suggestions.length - 1) % suggestions.length); return }
                  if (e.key === 'Enter') { e.preventDefault(); const c = suggestions[suggIndex]; submit(c.email, c.display_name); return }
                }
                if (e.key === 'Enter') { e.preventDefault(); submit(); return }
                if (e.key === 'Escape') { setAddOpen(false); return }
              }}
              placeholder="Type a name or email"
              className="flex-1 text-xs border border-[#D2D0CE] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
            />
            <button
              type="button"
              onClick={() => submit()}
              className="text-xs bg-[#0078D4] text-white px-2 py-1 rounded hover:bg-[#106EBE]"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              aria-label="Cancel add"
              className="text-[#605E5C] hover:text-[#323130] p-1"
            >
              <XIcon size={11} />
            </button>
          </div>
          {suggOpen && suggestions.length > 0 && (
            <div ref={suggBoxRef} className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 max-h-56 overflow-y-auto outlook-scrollbar">
              {suggestions.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); submit(c.email, c.display_name) }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 flex items-center gap-2',
                    i === suggIndex ? 'bg-[#EBF3FB]' : 'hover:bg-[#F3F2F1]',
                  )}
                >
                  <span className="w-6 h-6 rounded-full bg-[#0078D4] text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                    {(c.display_name || c.email).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#323130] truncate">{c.display_name || c.email}</p>
                    <p className="text-[10px] text-[#605E5C] truncate">{c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="text-xs text-[#0078D4] hover:underline mt-1 inline-flex items-center gap-1"
        >
          <Plus size={11} /> {addLabel}
        </button>
      )}
    </div>
  )
}

function RoomSection({
  rooms,
  onRemove,
  addOpen,
  setAddOpen,
  anchorRef,
  availableRooms,
  onPick,
  onCreateRoom,
}: {
  rooms: MockRoom[]
  onRemove: (roomId: string) => void
  addOpen: boolean
  setAddOpen: (v: boolean) => void
  anchorRef: React.RefObject<HTMLDivElement | null>
  availableRooms: MockRoom[]
  onPick: (r: MockRoom) => void
  onCreateRoom?: (room: MockRoom) => void
}) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newCapacity, setNewCapacity] = useState('6')
  const submitCreate = () => {
    const name = newName.trim()
    if (!name || !onCreateRoom) return
    const room: MockRoom = {
      id: `user-room-${Date.now()}`,
      name,
      location: newLocation.trim() || 'Custom room',
      capacity: Math.max(1, Number(newCapacity) || 6),
      status: 'available',
    }
    onCreateRoom(room)
    onPick(room)
    setCreating(false); setNewName(''); setNewLocation(''); setNewCapacity('6')
    setAddOpen(false)
  }
  return (
    <div className="px-3 py-2 border-b border-[#EDEBE9]" ref={anchorRef}>
      <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide mb-1.5">Rooms</p>
      {rooms.length === 0 && <p className="text-[11px] text-[#A19F9D] italic mb-1.5">None added</p>}
      {rooms.map((r) => (
        <div key={r.id} className="flex items-center gap-2 py-1 group">
          <Building2 size={14} className="text-[#107C10] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#323130] truncate">{r.name}</p>
            <p className="text-[10px] text-[#107C10]">Available</p>
          </div>
          <span className="text-[10px] text-[#605E5C] flex items-center gap-0.5">
            <UsersIcon size={9} /> {r.capacity}
          </span>
          <button
            type="button"
            aria-label={`Remove ${r.name}`}
            onClick={() => onRemove(r.id)}
            className="opacity-0 group-hover:opacity-100 text-[#605E5C] hover:text-[#D13438]"
          >
            <XIcon size={12} />
          </button>
        </div>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setAddOpen(!addOpen)}
          className="text-xs text-[#0078D4] hover:underline mt-1 inline-flex items-center gap-1"
        >
          <Plus size={11} /> Add a room
        </button>
        {addOpen && (
          <div className="absolute left-0 top-full mt-1 w-64 z-30 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1">
            {availableRooms.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[#A19F9D] italic">No more rooms available.</p>
            ) : (
              availableRooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onPick(r)}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2"
                >
                  <Building2 size={14} className="text-[#107C10] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#323130] truncate">{r.name}</p>
                    <p className="text-[10px] text-[#605E5C] truncate">{r.location}</p>
                  </div>
                  <span className="text-[10px] text-[#605E5C] flex items-center gap-0.5">
                    <UsersIcon size={9} /> {r.capacity}
                  </span>
                </button>
              ))
            )}
            {onCreateRoom && (
              <div className="border-t border-[#EDEBE9] mt-1 pt-1 px-2 pb-2">
                {!creating ? (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="w-full text-left text-xs text-[#0078D4] hover:underline flex items-center gap-1 px-1 py-1"
                  >
                    <Plus size={11} /> Create new room
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCreate() } if (e.key === 'Escape') setCreating(false) }}
                      placeholder="Room name"
                      className="w-full text-xs border border-[#D2D0CE] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
                    />
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="Building, Floor (optional)"
                      className="w-full text-xs border border-[#D2D0CE] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-[#605E5C] flex-shrink-0">Capacity</label>
                      <input type="number" min={1} value={newCapacity}
                        onChange={(e) => setNewCapacity(e.target.value)}
                        className="flex-1 text-xs border border-[#D2D0CE] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={submitCreate} disabled={!newName.trim()}
                        className="text-xs bg-[#0078D4] text-white px-3 py-1 rounded hover:bg-[#106EBE] disabled:opacity-50">Create</button>
                      <button type="button" onClick={() => { setCreating(false); setNewName(''); setNewLocation(''); setNewCapacity('6') }}
                        className="text-xs text-[#605E5C] hover:text-[#323130] px-2 py-1">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AttendeeRow({ row }: { row: MockAttendee | MockRoom }) {
  const availability = 'availability' in row ? row.availability : []
  const ownerName = 'name' in row ? row.name : (row as MockRoom).name
  return (
    <div className="relative h-12 border-b border-[#EDEBE9]">
      {availability.map((slot, idx) => {
        const startMin = timeToMinutes(slot.start)
        const endMin = timeToMinutes(slot.end)
        const left = (startMin / SA_GRID_TOTAL_MINUTES) * 100
        const width = ((endMin - startMin) / SA_GRID_TOTAL_MINUTES) * 100
        const statusLabel = slot.status === 'busy' ? 'Busy' : 'Tentative'
        return (
          <div
            key={idx}
            className={cn(
              'absolute top-1 bottom-1 rounded-sm',
              slot.status === 'busy' ? 'sa-hatch-busy' : 'sa-hatch-tentative',
            )}
            style={{ left: `${left}%`, width: `${width}%` }}
            title={`${ownerName} — ${statusLabel} ${slot.start}–${slot.end}`}
          />
        )
      })}
    </div>
  )
}

function LegendSwatch({ label, cls, border, hatch }: { label: string; cls?: string; border?: string; hatch?: 'busy' | 'tentative' }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          'w-4 h-3 rounded-sm border',
          cls,
          border ?? 'border-[#D2D0CE]',
          hatch === 'busy' && 'sa-hatch-busy',
          hatch === 'tentative' && 'sa-hatch-tentative',
        )}
      />
      {label}
    </span>
  )
}
