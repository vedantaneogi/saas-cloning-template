'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { events, calendars, categories as categoriesApi } from '@/lib/api'
import type { Event } from '@/lib/api'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar'
import { DateNavigator } from '@/components/calendar/DateNavigator'
import { EventModal } from '@/components/calendar/EventModal'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import { Tag, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalendarView = 'day' | 'week' | 'work-week' | 'month'

const VALID_VIEWS: CalendarView[] = ['day', 'week', 'work-week', 'month']

export default function CalendarPage() {
  const params = useParams()
  const rawView = (params?.view as string[] | undefined)?.[0] ?? 'month'
  const view: CalendarView = VALID_VIEWS.includes(rawView as CalendarView)
    ? (rawView as CalendarView)
    : 'month'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | undefined>()
  const [initialDate, setInitialDate] = useState<Date | undefined>()

  // Listen for "New event" from ribbon toolbar
  useEffect(() => {
    const handler = () => {
      setInitialDate(new Date())
      setEditingEvent(undefined)
      setEventModalOpen(true)
    }
    window.addEventListener('outlook:new-event', handler)
    return () => window.removeEventListener('outlook:new-event', handler)
  }, [])

  // Calculate date range for events query
  // Month view widens to startOfWeek(startOfMonth) → endOfWeek(endOfMonth)
  // so events on leading/trailing days the grid paints are included.
  const getDateRange = () => {
    if (view === 'month') {
      return {
        start: format(startOfWeek(startOfMonth(currentDate)), "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(endOfWeek(endOfMonth(currentDate)), "yyyy-MM-dd'T'HH:mm:ss"),
      }
    }
    if (view === 'week' || view === 'work-week') {
      return {
        start: format(startOfWeek(currentDate), "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(endOfWeek(currentDate), "yyyy-MM-dd'T'HH:mm:ss"),
      }
    }
    return {
      start: format(currentDate, "yyyy-MM-dd'T'00:00:00"),
      end: format(currentDate, "yyyy-MM-dd'T'23:59:59"),
    }
  }

  const { start, end } = getDateRange()

  const { data: calendarList = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendars.list(),
  })

  const { data: eventList = [] } = useQuery({
    queryKey: ['events', view, start, end],
    queryFn: () => events.list({ start, end }),
  })

  // Category filter — multi-select against event.categories
  const [categoryFilterIds, setCategoryFilterIds] = useState<Set<string>>(new Set())
  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  // Apply ribbon Filter: all / mine / invites / no-allday
  const calendarFilter = useUIStore((s) => s.calendarFilter)
  const currentUserEmail = useAuthStore((s) => s.currentUser?.email)?.toLowerCase()
  const filteredEvents = useMemo(() => {
    let list = eventList
    if (categoryFilterIds.size > 0) {
      list = list.filter((e) =>
        e.categories?.some((c) => categoryFilterIds.has(c.id))
      )
    }
    if (calendarFilter === 'all') return list
    if (calendarFilter === 'no-allday') return list.filter((e) => !e.all_day)
    const isInvite = (e: Event) => {
      const organizer = e.attendees?.find((a) => a.is_organizer)
      if (!organizer) return false
      return !!currentUserEmail && organizer.email.toLowerCase() !== currentUserEmail
    }
    if (calendarFilter === 'invites') return list.filter(isInvite)
    if (calendarFilter === 'mine') return list.filter((e) => !isInvite(e))
    return list
  }, [eventList, calendarFilter, currentUserEmail, categoryFilterIds])

  const [catMenuOpen, setCatMenuOpen] = useState(false)
  const catMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!catMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) {
        setCatMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [catMenuOpen])

  const toggleCategory = (id: string) => {
    setCategoryFilterIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSlotClick = (date: Date) => {
    setInitialDate(date)
    setEditingEvent(undefined)
    setEventModalOpen(true)
  }

  const handleEventClick = (event: Event) => {
    setEditingEvent(event)
    setInitialDate(undefined)
    setEventModalOpen(true)
  }

  const router = useRouter()
  // Click anywhere in a month-view day cell — open new event modal at that date.
  // Outlook opens compose; previously this jumped to Day view, which was wrong.
  const handleDayClick = (date: Date) => {
    setInitialDate(date)
    setEditingEvent(undefined)
    setEventModalOpen(true)
  }
  // Click on the day number / "+N more" — navigate to that day's Day view.
  const handleDayNavigate = (date: Date) => {
    setCurrentDate(date)
    router.push('/calendar/day')
  }

  return (
    <div className="h-full flex overflow-hidden" aria-label="CalendarModule" data-automation-id="CalendarModule">
      {/* Left sidebar */}
      <CalendarSidebar selectedDate={currentDate} onDateSelect={setCurrentDate} />

      {/* Main calendar area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        {/* Date navigation bar — matches Outlook: Today + arrows + date range */}
        <div
          className="flex items-center px-4 py-2 border-b border-[#EDEBE9] bg-white flex-shrink-0"
          aria-label="CalendarSurfaceNavigationToolbar"
        >
          <DateNavigator
            currentDate={currentDate}
            view={view}
            onDateChange={setCurrentDate}
          />

          {/* Category filter — multi-select chip on the right of the toolbar */}
          <div className="ml-auto relative" ref={catMenuRef}>
            <button
              type="button"
              onClick={() => setCatMenuOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={catMenuOpen}
              aria-label="Filter by category"
              className={cn(
                'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors',
                categoryFilterIds.size > 0
                  ? 'border-[#0078D4] bg-[#EFF6FC] text-[#0078D4]'
                  : 'border-[#EDEBE9] text-[#605E5C] hover:bg-[#F3F2F1]'
              )}
            >
              <Tag size={12} />
              {categoryFilterIds.size === 0
                ? 'All categories'
                : `${categoryFilterIds.size} selected`}
              <ChevronDown size={12} />
            </button>
            {catMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 z-30 max-h-72 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setCategoryFilterIds(new Set()); setCatMenuOpen(false) }}
                  className="w-full text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130] flex items-center gap-2"
                >
                  {categoryFilterIds.size === 0 && <Check size={12} className="text-[#0078D4]" />}
                  <span className={categoryFilterIds.size === 0 ? '' : 'pl-4'}>All categories</span>
                </button>
                {categoryList.length === 0 && (
                  <p className="px-3 py-2 text-xs text-[#A19F9D] italic">No categories yet</p>
                )}
                {categoryList.map((c) => {
                  const checked = categoryFilterIds.has(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className="w-full text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130] flex items-center gap-2"
                    >
                      {checked
                        ? <Check size={12} className="text-[#0078D4]" />
                        : <span className="w-3" />}
                      <Tag size={12} style={{ color: c.color }} />
                      <span className="truncate">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Calendar grid */}
        <div
          className="flex-1 overflow-hidden flex flex-col"
          data-automation-id="CalendarModuleSurface"
        >
          <CalendarGrid
            view={view}
            currentDate={currentDate}
            events={filteredEvents}
            calendars={calendarList}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
            onDayClick={handleDayClick}
            onDayNavigate={handleDayNavigate}
          />
        </div>
      </div>

      {/* Event modal — keyed so the form resets between openings (react-hook-form
          only seeds defaultValues on mount). */}
      <EventModal
        key={editingEvent?.id ?? `new-${initialDate?.toISOString() ?? ''}`}
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        initialDate={initialDate}
        event={editingEvent}
      />
    </div>
  )
}
