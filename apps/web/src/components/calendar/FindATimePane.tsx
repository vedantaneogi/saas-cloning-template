'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { events } from '@/lib/api'
import { SA_WORKING_START_HOUR, SA_WORKING_END_HOUR, MOCK_SUGGESTED_SLOTS } from './scheduling-mock'

interface FindATimePaneProps {
  /** Currently selected start "HH:MM" (matches a suggested slot's start). */
  selectedSlotStart: string | null
  /** Invited attendee emails — drive the dynamic suggestion calculation. */
  attendeeEmails: string[]
  /** Anchor date for the day being scheduled. */
  date: Date
  /** Click on a suggested card. */
  onSelectSlot: (startHHMM: string, endHHMM: string) => void
  /** Close the pane. */
  onClose: () => void
}

interface ComputedSlot {
  id: string
  start: string
  end: string
  label: string
  duration: string
  availableCount: number
  isRecommended?: boolean
}

/**
 * Right-rail "Find a time" pane that lives inside the Event form view.
 * Now computes suggested slots dynamically: scans 30-min windows in the
 * working-hours band (8 AM–6 PM), excludes any window that overlaps a
 * busy/tentative block on any attendee's real schedule, returns up to 6
 * free windows. The first one is auto-recommended (blue border + light
 * blue bg). Falls back to the spec's hardcoded slots when no attendees
 * are invited so the pane still renders something.
 */
export function FindATimePane({ selectedSlotStart, attendeeEmails, date, onSelectSlot, onClose }: FindATimePaneProps) {
  const [duration, setDuration] = useState(30)

  const dayStart = useMemo(() => {
    const d = new Date(date); d.setHours(0, 0, 0, 0); return d
  }, [date])
  const dayEnd = useMemo(() => {
    const d = new Date(date); d.setHours(23, 59, 59, 999); return d
  }, [date])
  const emailsKey = [...attendeeEmails].sort().join(',')

  const { data: availability } = useQuery({
    queryKey: ['fat-availability', emailsKey, format(date, 'yyyy-MM-dd')],
    queryFn: () => events.getAvailability(attendeeEmails, dayStart.toISOString(), dayEnd.toISOString()),
    enabled: attendeeEmails.length > 0,
  })

  const computed: ComputedSlot[] = useMemo(() => {
    if (attendeeEmails.length === 0) {
      // No attendees → fall back to the spec's hardcoded demo slots.
      return MOCK_SUGGESTED_SLOTS as unknown as ComputedSlot[]
    }
    if (!availability) return []
    // Helper: is the (start, end) window overlap-free for everyone?
    const isWindowFree = (winStart: Date, winEnd: Date): boolean => {
      for (const row of availability) {
        for (const s of row.slots) {
          const bs = new Date(s.start)
          const be = new Date(s.end)
          if (bs < winEnd && be > winStart) return false
        }
      }
      return true
    }
    const slots: ComputedSlot[] = []
    const stepMinutes = 30
    for (let h = SA_WORKING_START_HOUR * 60; h + duration <= SA_WORKING_END_HOUR * 60; h += stepMinutes) {
      const startD = new Date(date)
      startD.setHours(Math.floor(h / 60), h % 60, 0, 0)
      const endD = new Date(startD.getTime() + duration * 60_000)
      if (!isWindowFree(startD, endD)) continue
      const fmtH = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const fmtL = (d: Date) =>
        `${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
      slots.push({
        id: `slot-${fmtH(startD)}`,
        start: fmtH(startD),
        end: fmtH(endD),
        label: `${fmtL(startD)} - ${fmtL(endD)}`,
        duration: `${duration} min`,
        availableCount: attendeeEmails.length,
        isRecommended: slots.length === 0,
      })
      if (slots.length >= 6) break
    }
    return slots
  }, [availability, attendeeEmails, date, duration])

  const summary = (() => {
    if (attendeeEmails.length === 0) return null
    if (computed.length === 0) return { tone: 'warn' as const, msg: 'No suitable times found.', sub: 'Try changing the duration or date.' }
    if (computed.length >= 5) return { tone: 'good' as const, msg: 'Excellent! Everyone is available.', sub: 'Select a time to schedule.' }
    return { tone: 'ok' as const, msg: `${computed.length} times work for everyone.`, sub: 'Select a time to schedule.' }
  })()
  return (
    <aside className="w-72 flex-shrink-0 border-l border-[#EDEBE9] bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9]">
        <p className="text-sm font-semibold text-[#323130]">Find a time</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close find a time"
          className="text-[#605E5C] hover:bg-[#F3F2F1] rounded p-1"
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* Date selector row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9] text-xs">
        <button type="button" aria-label="Previous day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1]">
          <ChevronLeft size={14} />
        </button>
        <span className="flex items-center gap-1.5 text-[#323130]">
          <CalIcon size={12} className="text-[#605E5C]" />
          Fri, May 8, 2026
        </span>
        <button type="button" aria-label="Next day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1]">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Duration + Preferences */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9] text-xs">
        <span className="text-[#605E5C]">Duration</span>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="border border-[#D2D0CE] rounded px-2 py-0.5 bg-white text-[#323130]"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>90 minutes</option>
          <option value={120}>2 hours</option>
        </select>
        <button type="button" className="text-[#0078D4] hover:underline">
          Preferences
        </button>
      </div>

      {/* Availability summary — colour reflects how many slots fit. */}
      {summary && (
        <div className="px-3 py-2 border-b border-[#EDEBE9]">
          <p className={cn('text-xs font-medium', summary.tone === 'good' ? 'text-[#107C10]' : summary.tone === 'warn' ? 'text-[#A4262C]' : 'text-[#0078D4]')}>
            {summary.msg}
          </p>
          <p className="text-[11px] text-[#605E5C] mt-0.5">{summary.sub}</p>
        </div>
      )}
      {attendeeEmails.length === 0 && (
        <div className="px-3 py-2 border-b border-[#EDEBE9]">
          <p className="text-xs text-[#605E5C]">Add attendees to see suggested times.</p>
        </div>
      )}

      {/* Suggested slot list */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar p-2 space-y-1.5">
        {computed.length === 0 && attendeeEmails.length > 0 ? (
          <p className="text-xs text-[#605E5C] italic px-2 py-3">
            No suitable times found. Try changing the duration or date.
          </p>
        ) : (
          computed.map((s) => {
            const isSelected = selectedSlotStart === s.start
            const isRecommended = s.isRecommended && !selectedSlotStart
            const highlight = isSelected || isRecommended
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSlot(s.start, s.end)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded border transition-colors',
                  highlight
                    ? 'border-[#0078D4] bg-[#EBF3FB] text-[#323130]'
                    : 'border-[#D2D0CE] bg-white text-[#323130] hover:bg-[#F3F2F1]',
                )}
              >
                <p className={cn('text-sm', highlight && 'font-semibold')}>{s.label}</p>
                <p className="text-[11px] text-[#605E5C] mt-0.5">
                  {s.duration} · {s.availableCount} available
                </p>
              </button>
            )
          })
        )}
      </div>

      {/* Bottom link */}
      <div className="px-3 py-2 border-t border-[#EDEBE9] text-[11px] text-[#605E5C]">
        Can&apos;t find a suitable time?{' '}
        <button
          type="button"
          onClick={() => alert('More suggestions are not available in this prototype.')}
          className="text-[#0078D4] hover:underline"
        >
          Suggest a new time
        </button>
      </div>
    </aside>
  )
}
