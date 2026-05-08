'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Lock, Globe, Calendar as CalIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FreeBusySlot {
  start: string
  end: string
  status: string
}

interface FullEvent {
  id: string
  title: string
  location: string | null
  description: string | null
  start_time: string
  end_time: string
  all_day: boolean
  status: string
}

interface FreeBusyResponse {
  calendar: string
  owner_name?: string
  owner_email?: string | null
  scope: 'free_busy'
  slots: FreeBusySlot[]
}

interface FullResponse {
  calendar: string
  owner_name?: string
  owner_email?: string | null
  scope: 'full'
  events: FullEvent[]
}

type ApiResponse = FreeBusyResponse | FullResponse

function isFull(r: ApiResponse): r is FullResponse {
  return r.scope === 'full'
}

export default function PublicCalendarPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMonth, setViewMonth] = useState(new Date())

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/v1/calendars/public/${token}`)
        if (!res.ok) {
          setError(res.status === 404 ? 'This calendar is no longer published.' : `Error ${res.status}`)
          return
        }
        const json = (await res.json()) as ApiResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Network error')
      }
    })()
    return () => { cancelled = true }
  }, [token])

  // Build a uniform list of "blocks" the calendar can render: full mode has
  // titles, free/busy mode shows just "Busy" boxes. Both share start/end.
  const blocks = useMemo(() => {
    if (!data) return [] as { start: Date; end: Date; title: string; subtitle: string | null; status: string }[]
    if (isFull(data)) {
      return data.events.map((e) => ({
        start: parseISO(e.start_time),
        end: parseISO(e.end_time),
        title: e.title,
        subtitle: e.location ?? null,
        status: e.status,
      }))
    }
    return data.slots.map((s) => ({
      start: parseISO(s.start),
      end: parseISO(s.end),
      title: s.status === 'free' ? 'Free' : 'Busy',
      subtitle: null,
      status: s.status,
    }))
  }, [data])

  if (!token) return null

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF9F8] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <Lock size={42} className="mx-auto text-[#A19F9D] mb-3" />
          <h1 className="text-lg font-semibold text-[#323130] mb-1">Calendar unavailable</h1>
          <p className="text-sm text-[#605E5C]">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FAF9F8] flex items-center justify-center">
        <p className="text-sm text-[#605E5C]">Loading…</p>
      </div>
    )
  }

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const weeks = eachWeekOfInterval({ start: calStart, end: calEnd })

  const blocksForDay = (day: Date) =>
    blocks.filter((b) => isSameDay(b.start, day))

  return (
    <div className="min-h-screen bg-[#FAF9F8]">
      {/* Hero header — show the owner's name (e.g. "Frank Miller") so the
          public viewer immediately knows whose calendar they're looking at. */}
      <header className="bg-gradient-to-r from-[#0078D4] to-[#106EBE] text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/15 rounded flex items-center justify-center text-xl font-semibold">
            {(data.owner_name || data.calendar)[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide opacity-80 flex items-center gap-1.5">
              <CalIcon size={11} /> Public calendar
            </p>
            <h1 className="text-xl font-semibold truncate">
              {data.owner_name ?? data.calendar}
            </h1>
            {data.owner_email && (
              <p className="text-xs opacity-80 truncate">{data.owner_email}</p>
            )}
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-white/15 px-2.5 py-1 rounded">
            {data.scope === 'full' ? <Globe size={12} /> : <Lock size={12} />}
            {data.scope === 'full' ? 'Full detail' : 'Free / busy only'}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#323130]">
            {format(viewMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMonth(new Date())}
              className="text-xs text-[#0078D4] hover:bg-[#EBF3FB] px-2 py-1 rounded"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C]"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Month grid */}
        <div className="bg-white border border-[#EDEBE9] rounded overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#EDEBE9] bg-[#FAF9F8]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-[#605E5C] py-2 border-r border-[#EDEBE9] last:border-r-0">
                {d}
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(110px, 1fr))` }}>
            {weeks.map((weekStart) => {
              const weekDays = eachDayOfInterval({
                start: weekStart,
                end: endOfWeek(weekStart),
              })
              return (
                <div key={weekStart.toISOString()} className="grid grid-cols-7 border-b border-[#EDEBE9] last:border-b-0">
                  {weekDays.map((day) => {
                    const inMonth = isSameMonth(day, viewMonth)
                    const dayBlocks = blocksForDay(day)
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'border-r border-[#EDEBE9] last:border-r-0 p-1.5',
                          !inMonth && 'bg-[#FAF9F8]'
                        )}
                      >
                        <div className="flex items-center justify-end mb-1">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                              isToday(day)
                                ? 'bg-[#0078D4] text-white'
                                : inMonth
                                ? 'text-[#323130]'
                                : 'text-[#A19F9D]'
                            )}
                          >
                            {format(day, 'd')}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {dayBlocks.slice(0, 3).map((b, i) => (
                            <div
                              key={i}
                              title={b.subtitle ? `${b.title} — ${b.subtitle}` : b.title}
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded truncate text-white',
                                b.status === 'free' ? 'bg-[#107C10]' :
                                b.status === 'tentative' ? 'bg-[#FFB900] text-[#323130]' :
                                b.status === 'out_of_office' ? 'bg-[#8764B8]' :
                                'bg-[#0078D4]'
                              )}
                            >
                              {format(b.start, 'h:mma').toLowerCase()} {b.title}
                            </div>
                          ))}
                          {dayBlocks.length > 3 && (
                            <p className="text-[10px] text-[#605E5C] pl-1.5">
                              +{dayBlocks.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* List view of upcoming blocks for accessibility / mobile */}
        <h3 className="text-sm font-semibold text-[#323130] mt-6 mb-2">Upcoming</h3>
        <div className="bg-white border border-[#EDEBE9] rounded divide-y divide-[#EDEBE9]">
          {blocks
            .filter((b) => b.start >= new Date(new Date().setHours(0, 0, 0, 0)))
            .slice(0, 10)
            .map((b, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                <div className="w-1 self-stretch rounded bg-[#0078D4] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#323130] truncate">{b.title}</p>
                  <p className="text-xs text-[#605E5C]">
                    {format(b.start, 'EEE, MMM d · p')} – {format(b.end, 'p')}
                    {b.subtitle ? ` · ${b.subtitle}` : ''}
                  </p>
                </div>
              </div>
            ))}
          {blocks.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-[#605E5C]">
              Nothing on the calendar.
            </p>
          )}
        </div>

        <footer className="mt-8 text-center text-[11px] text-[#A19F9D]">
          Read-only · Anyone with this link can view this calendar.
        </footer>
      </main>
    </div>
  )
}
