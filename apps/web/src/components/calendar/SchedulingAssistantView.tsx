'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MOCK_ATTENDEES,
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
  /** Real invitees from the parent form. When non-empty, these replace the
   *  spec's static MOCK_ATTENDEES so the grid reflects the people the user
   *  actually invited (with deterministic mock busy/tentative blocks per
   *  email). When empty we fall back to the spec demo so the empty-state
   *  is still recognisably Outlook-like. */
  invitedAttendees?: { email: string; name?: string }[]
  /** Confirm — emits the chosen "HH:MM" start + minutes-duration. */
  onConfirm: (startHHMM: string, durationMinutes: number) => void
  /** Cancel — discard selection and return to event form. */
  onCancel: () => void
}

/**
 * Outlook Web Scheduling Assistant clone — tabbed view that replaces the
 * Event form body when active. Uses deterministic mock attendees, rooms,
 * and availability per senior's spec.
 *
 * Layout:
 *   [tab row: Event / Scheduling assistant / Response options]
 *   [control row: Today / prev / next / date / start–end / TZ / All day]
 *   [main body]
 *     ├── left pane: Required + Optional + Rooms (collapsible, with avatars)
 *     └── right pane: time grid + busy/tentative blocks + selected-slot block
 *   [legend row]
 *   [bottom right: OK / Cancel]
 */
export function SchedulingAssistantView({
  initialStart = '15:00',
  initialDurationMinutes = 30,
  invitedAttendees,
  onConfirm,
  onCancel,
}: SchedulingAssistantViewProps) {
  const [selectedStart, setSelectedStart] = useState(initialStart)
  const [duration] = useState(initialDurationMinutes)

  // If the parent invited real people, render them with deterministic mock
  // availability. Otherwise show the spec's three demo attendees so the
  // empty state still demonstrates the layout.
  const liveAttendees: MockAttendee[] = (invitedAttendees && invitedAttendees.length > 0)
    ? invitedAttendees.map((a) => makeAttendeeFromEmail(a.email, a.name, 'required'))
    : MOCK_ATTENDEES
  const required = liveAttendees.filter((a) => a.type === 'required')
  const optional = liveAttendees.filter((a) => a.type === 'optional')

  const selectedStartMin = timeToMinutes(selectedStart)
  const selectedLeftPct = (selectedStartMin / SA_GRID_TOTAL_MINUTES) * 100
  const selectedWidthPct = (duration / SA_GRID_TOTAL_MINUTES) * 100

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
        <button
          type="button"
          className="px-3 py-2 text-xs text-[#605E5C] hover:bg-[#F3F2F1] rounded-t"
        >
          Response options
        </button>
      </div>

      {/* Control row */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[#EDEBE9] bg-[#FAF9F8] flex-shrink-0 text-xs">
        <button type="button" className="px-2.5 py-1 border border-[#D2D0CE] rounded text-[#323130] hover:bg-[#F3F2F1]">
          Today
        </button>
        <button type="button" aria-label="Previous day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1]">
          <ChevronLeft size={14} />
        </button>
        <button type="button" aria-label="Next day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1]">
          <ChevronRight size={14} />
        </button>
        <select className="border border-[#D2D0CE] rounded px-2 py-1 bg-white">
          <option>Fri, May 8, 2026</option>
        </select>
        <select
          value={selectedStart}
          onChange={(e) => setSelectedStart(e.target.value)}
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
        <span className="border border-[#D2D0CE] rounded px-2 py-1 bg-white text-[#323130] min-w-[88px] inline-block text-center">
          {(() => {
            const endMin = selectedStartMin + duration
            const h = SA_GRID_START_HOUR + Math.floor(endMin / 60)
            const m = endMin % 60
            return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
          })()}
        </span>
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
          <Section title="Required attendees" addLabel="Add required attendee" attendees={required} />
          <Section title="Optional attendees" addLabel="Add optional attendee" attendees={optional} />
          <RoomSection rooms={MOCK_ROOMS.filter((r) => r.status === 'available').slice(0, 2)} />
        </aside>

        {/* Right pane: timeline */}
        <div className="flex-1 min-w-0 overflow-x-auto outlook-scrollbar">
          <div className="relative" style={{ minWidth: 600 }}>
            {/* Date header */}
            <div className="px-4 py-2 border-b border-[#EDEBE9] bg-white sticky top-0 z-10">
              <p className="text-xs font-semibold text-[#323130]">Friday, May 8, 2026</p>
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
              {[...required, ...optional, ...MOCK_ROOMS.filter((r) => r.status === 'available').slice(0, 2)].map((row) => (
                <AttendeeRow key={'id' in row ? row.id : (row as MockAttendee).id} row={row} />
              ))}

              {/* Selected slot overlay — spans all rows */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none border-2 border-[#0078D4] bg-[#0078D4]/10 z-20"
                style={{ left: `${selectedLeftPct}%`, width: `${selectedWidthPct}%` }}
              >
                {/* Drag handles top + bottom */}
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
          onClick={() => onConfirm(selectedStart, duration)}
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

function Section({ title, addLabel, attendees }: { title: string; addLabel: string; attendees: MockAttendee[] }) {
  return (
    <div className="px-3 py-2 border-b border-[#EDEBE9]">
      <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide mb-1.5">{title}</p>
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
          <button type="button" aria-label={`Remove ${a.name}`} className="opacity-0 group-hover:opacity-100 text-[#605E5C] hover:text-[#D13438]">
            <XIcon size={12} />
          </button>
        </div>
      ))}
      <button type="button" className="text-xs text-[#0078D4] hover:underline mt-1">
        + {addLabel}
      </button>
    </div>
  )
}

function RoomSection({ rooms }: { rooms: MockRoom[] }) {
  return (
    <div className="px-3 py-2 border-b border-[#EDEBE9]">
      <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide mb-1.5">Rooms</p>
      {rooms.map((r) => (
        <div key={r.id} className="py-1">
          <p className="text-xs text-[#323130] truncate">{r.name}</p>
          <p className="text-[10px] text-[#107C10]">Available</p>
        </div>
      ))}
      <button type="button" className="text-xs text-[#0078D4] hover:underline mt-1">
        + Add a room
      </button>
    </div>
  )
}

function AttendeeRow({ row }: { row: MockAttendee | MockRoom }) {
  // Rooms have no `availability` blocks; treat as fully free.
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
