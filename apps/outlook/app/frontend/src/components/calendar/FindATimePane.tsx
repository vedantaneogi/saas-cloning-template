
import { useEffect, useMemo, useState } from 'react'
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
  /** Anchor date for the day being scheduled (initial value; the pane has
   *  its own date selector that lets the user scout other days without
   *  changing the form's date until they pick a slot). */
  date: Date
  /** Click on a suggested card. The pane emits its own date too so the
   *  parent can move the form's date if the user picked a slot from a
   *  different day. */
  onSelectSlot: (startHHMM: string, endHHMM: string, date: Date) => void
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
export function FindATimePane({ selectedSlotStart, attendeeEmails, date: initialDate, onSelectSlot, onClose }: FindATimePaneProps) {
  // Pane-local date state — lets the user scout other days via the date
  // controls without touching the form until they pick a slot. Resets if
  // the parent's anchor date changes (e.g. after the slot is applied to
  // the form, the parent re-renders with the new start_time date).
  const [paneDate, setPaneDate] = useState<Date>(initialDate)
  useEffect(() => {
    setPaneDate(initialDate)
  // Only re-sync when the *day* changes, not on every parent render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format(initialDate, 'yyyy-MM-dd')])

  const [duration, setDuration] = useState(30)

  const dayStart = useMemo(() => {
    const d = new Date(paneDate); d.setHours(0, 0, 0, 0); return d
  }, [paneDate])
  const dayEnd = useMemo(() => {
    const d = new Date(paneDate); d.setHours(23, 59, 59, 999); return d
  }, [paneDate])
  const emailsKey = [...attendeeEmails].sort().join(',')

  const { data: availability } = useQuery({
    queryKey: ['fat-availability', emailsKey, format(paneDate, 'yyyy-MM-dd')],
    queryFn: () => events.getAvailability(attendeeEmails, dayStart.toISOString(), dayEnd.toISOString()),
    enabled: attendeeEmails.length > 0,
  })

  const shiftDay = (n: number) => {
    setPaneDate((d) => {
      const next = new Date(d); next.setDate(next.getDate() + n); return next
    })
  }

  const computed: ComputedSlot[] = useMemo(() => {
    if (attendeeEmails.length === 0) return []
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
      const startD = new Date(paneDate)
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
  }, [availability, attendeeEmails, paneDate, duration])

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

      {/* Date selector row — actually navigates the pane's date so the
          user can scout other days. The form's date stays put until they
          pick a slot. */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#EDEBE9] text-xs">
        <button type="button" onClick={() => shiftDay(-1)} aria-label="Previous day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1] flex-shrink-0">
          <ChevronLeft size={14} />
        </button>
        <span className="flex items-center gap-1.5 text-[#605E5C] flex-shrink-0">
          <CalIcon size={12} />
        </span>
        <input
          type="date"
          value={format(paneDate, 'yyyy-MM-dd')}
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            const [y, m, d] = v.split('-').map(Number)
            setPaneDate(new Date(y, m - 1, d))
          }}
          aria-label="Pick a date"
          className="flex-1 min-w-0 border border-[#D2D0CE] rounded px-1 py-0.5 bg-white text-[#323130]"
        />
        <button type="button" onClick={() => shiftDay(1)} aria-label="Next day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1] flex-shrink-0">
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
                onClick={() => onSelectSlot(s.start, s.end, paneDate)}
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
