'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { events, calendars } from '@/lib/api'
import type { Event } from '@/lib/api'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar'
import { ViewSwitcher } from '@/components/calendar/ViewSwitcher'
import { DateNavigator } from '@/components/calendar/DateNavigator'
import { EventModal } from '@/components/calendar/EventModal'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

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

  // Calculate date range for events query
  const getDateRange = () => {
    if (view === 'month') {
      return {
        start: format(startOfMonth(currentDate), "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(endOfMonth(currentDate), "yyyy-MM-dd'T'HH:mm:ss"),
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

  return (
    <div className="h-full flex overflow-hidden" aria-label="CalendarModule" data-automation-id="CalendarModule">
      {/* Left sidebar */}
      <CalendarSidebar selectedDate={currentDate} onDateSelect={setCurrentDate} />

      {/* Main calendar area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-[#EDEBE9] bg-white flex-shrink-0"
          aria-label="CalendarSurfaceNavigationToolbar"
          data-automation-id="CalendarSurfaceNavigationToolbar"
        >
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setInitialDate(undefined)
                setEditingEvent(undefined)
                setEventModalOpen(true)
              }}
              aria-label="New event"
              size="md"
            >
              <Plus size={14} />
              New event
            </Button>
            <DateNavigator
              currentDate={currentDate}
              view={view}
              onDateChange={setCurrentDate}
            />
          </div>
          <ViewSwitcher currentView={view} />
        </div>

        {/* Calendar grid */}
        <div
          className="flex-1 overflow-hidden flex flex-col"
          data-automation-id="CalendarModuleSurface"
        >
          <CalendarGrid
            view={view}
            currentDate={currentDate}
            events={eventList}
            calendars={calendarList}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
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
