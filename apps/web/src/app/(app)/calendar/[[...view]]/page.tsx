'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { events, calendars } from '@/lib/api'
import type { Event } from '@/lib/api'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar'
import { DateNavigator } from '@/components/calendar/DateNavigator'
import { EventModal } from '@/components/calendar/EventModal'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'

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

  // Apply ribbon Filter: all / mine / invites / no-allday
  const calendarFilter = useUIStore((s) => s.calendarFilter)
  const currentUserEmail = useAuthStore((s) => s.currentUser?.email)?.toLowerCase()
  const filteredEvents = useMemo(() => {
    if (calendarFilter === 'all') return eventList
    if (calendarFilter === 'no-allday') return eventList.filter((e) => !e.all_day)
    const isInvite = (e: Event) => {
      const organizer = e.attendees?.find((a) => a.is_organizer)
      if (!organizer) return false
      return !!currentUserEmail && organizer.email.toLowerCase() !== currentUserEmail
    }
    if (calendarFilter === 'invites') return eventList.filter(isInvite)
    if (calendarFilter === 'mine') return eventList.filter((e) => !isInvite(e))
    return eventList
  }, [eventList, calendarFilter, currentUserEmail])

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

      {/* Event modal */}
      <EventModal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        initialDate={initialDate}
        event={editingEvent}
      />
    </div>
  )
}
