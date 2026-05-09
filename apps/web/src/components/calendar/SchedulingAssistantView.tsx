'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X as XIcon, Plus, Building2, Users as UsersIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  MOCK_ROOMS,
  AVATAR_COLOR,
  makeAttendeeFromEmail,
  timeToMinutes,
  SA_GRID_START_HOUR,
  SA_GRID_END_HOUR,
  SA_GRID_TOTAL_MINUTES,
  type MockAttendee,
  type MockRoom,
} from './scheduling-mock'

interface SchedulingAssistantViewProps {
  /** Initial start time in "HH:MM" format. */
  initialStart?: string
  /** Initial duration in minutes. */
  initialDurationMinutes?: number
  /** Initial date for the grid; falls back to today. */
  initialDate?: Date
  /** Real invitees from the parent form. */
  invitedAttendees?: { email: string; name?: string }[]
  /** Add an invitee (called when the inline + Add input submits). */
  onAddInvitee?: (email: string, name?: string) => void
  /** Remove an invitee from the parent's list. */
  onRemoveInvitee?: (email: string) => void
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
  // Rooms picked here. Empty by default — user adds via the Rooms picker.
  // Independent from the form's location field; SA grid is preview-only.
  const [pickedRoomIds, setPickedRoomIds] = useState<string[]>([])

  // Inline + Add editors
  const [addReqOpen, setAddReqOpen] = useState(false)
  const [addOptOpen, setAddOptOpen] = useState(false)
  const [addReqEmail, setAddReqEmail] = useState('')
  const [addOptEmail, setAddOptEmail] = useState('')
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

  // Render attendee rows from the parent's invited list — split into
  // Required / Optional via the SA-local optionalEmails Set. When no
  // attendees are added yet both sections show their empty state; no
  // demo data is rendered.
  const dk = dateKey(selectedDate)
  const liveAttendees: MockAttendee[] = invitedAttendees.map((a) =>
    makeAttendeeFromEmail(
      a.email,
      a.name,
      optionalEmails.has(a.email) ? 'optional' : 'required',
      dk,
    ),
  )
  const required = liveAttendees.filter((a) => a.type === 'required')
  const optional = liveAttendees.filter((a) => a.type === 'optional')
  const pickedRooms: MockRoom[] = pickedRoomIds
    .map((id) => MOCK_ROOMS.find((r) => r.id === id))
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

  const submitAddInvitee = (email: string, asOptional: boolean) => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) return
    onAddInvitee?.(trimmed)
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
            addOpen={addReqOpen}
            setAddOpen={setAddReqOpen}
            addEmail={addReqEmail}
            setAddEmail={setAddReqEmail}
            onSubmitAdd={() => {
              submitAddInvitee(addReqEmail, false)
              setAddReqEmail('')
              setAddReqOpen(false)
            }}
            addLabel="Add required attendee"
            emptyLabel="None added"
          />
          <Section
            title="Optional attendees"
            attendees={optional}
            onRemove={removeAttendee}
            addOpen={addOptOpen}
            setAddOpen={setAddOptOpen}
            addEmail={addOptEmail}
            setAddEmail={setAddOptEmail}
            onSubmitAdd={() => {
              submitAddInvitee(addOptEmail, true)
              setAddOptEmail('')
              setAddOptOpen(false)
            }}
            addLabel="Add optional attendee"
            emptyLabel="None added"
          />
          <RoomSection
            rooms={pickedRooms}
            onRemove={(roomId) => setPickedRoomIds((prev) => prev.filter((id) => id !== roomId))}
            addOpen={addRoomOpen}
            setAddOpen={setAddRoomOpen}
            anchorRef={addRoomRef}
            availableRooms={MOCK_ROOMS.filter((r) => r.status === 'available' && !pickedRoomIds.includes(r.id))}
            onPick={(r) => { setPickedRoomIds((prev) => [...prev, r.id]); setAddRoomOpen(false) }}
          />
        </aside>

        {/* Right pane: timeline */}
        <div className="flex-1 min-w-0 overflow-x-auto outlook-scrollbar">
          <div className="relative" style={{ minWidth: 600 }}>
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
  addOpen,
  setAddOpen,
  addEmail,
  setAddEmail,
  onSubmitAdd,
  addLabel,
  emptyLabel,
}: {
  title: string
  attendees: MockAttendee[]
  onRemove: (a: MockAttendee) => void
  addOpen: boolean
  setAddOpen: (v: boolean) => void
  addEmail: string
  setAddEmail: (v: string) => void
  onSubmitAdd: () => void
  addLabel: string
  emptyLabel?: string
}) {
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
          <button
            type="button"
            aria-label={`Remove ${a.name}`}
            onClick={() => onRemove(a)}
            className="opacity-0 group-hover:opacity-100 text-[#605E5C] hover:text-[#D13438]"
          >
            <XIcon size={12} />
          </button>
        </div>
      ))}

      {addOpen ? (
        <div className="mt-1.5 flex items-center gap-1">
          <input
            type="email"
            autoFocus
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSubmitAdd()
              }
              if (e.key === 'Escape') setAddOpen(false)
            }}
            placeholder="email@example.com"
            className="flex-1 text-xs border border-[#D2D0CE] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
          />
          <button
            type="button"
            onClick={onSubmitAdd}
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
}: {
  rooms: MockRoom[]
  onRemove: (roomId: string) => void
  addOpen: boolean
  setAddOpen: (v: boolean) => void
  anchorRef: React.RefObject<HTMLDivElement | null>
  availableRooms: MockRoom[]
  onPick: (r: MockRoom) => void
}) {
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
          <div className="absolute left-0 top-full mt-1 w-56 z-30 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1">
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
          </div>
        )}
      </div>
    </div>
  )
}

function AttendeeRow({ row }: { row: MockAttendee | MockRoom }) {
  const availability = 'availability' in row ? row.availability : []
  return (
    <div className="relative h-12 border-b border-[#EDEBE9] bg-[#EAF7EA]/40">
      {availability.map((slot, idx) => {
        const startMin = timeToMinutes(slot.start)
        const endMin = timeToMinutes(slot.end)
        const left = (startMin / SA_GRID_TOTAL_MINUTES) * 100
        const width = ((endMin - startMin) / SA_GRID_TOTAL_MINUTES) * 100
        return (
          <div
            key={idx}
            className={cn(
              'absolute top-1 bottom-1 rounded-sm',
              slot.status === 'busy' ? 'sa-hatch-busy' : 'sa-hatch-tentative',
            )}
            style={{ left: `${left}%`, width: `${width}%` }}
            title={`${slot.start} – ${slot.end}: ${slot.status}`}
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
