'use client'

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addWeeks,
  eachWeekOfInterval,
  isSameMonth,
  parseISO,
} from 'date-fns'
import type { Event, Calendar } from '@/lib/api'
import { EventCard } from './EventCard'
import { cn } from '@/lib/utils'

type CalendarView = 'day' | 'week' | 'work-week' | 'month'

interface CalendarGridProps {
  view: CalendarView
  currentDate: Date
  events: Event[]
  calendars: Calendar[]
  onEventClick?: (event: Event) => void
  onSlotClick?: (date: Date, hour?: number) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getCalendarColor(calendars: Calendar[], calendarId: string): string {
  return calendars.find((c) => c.id === calendarId)?.color ?? '#0078D4'
}

function MonthView({
  currentDate,
  events,
  calendars: calList,
  onEventClick,
  onSlotClick,
}: Omit<CalendarGridProps, 'view'>) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)

  const weeks = eachWeekOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#EDEBE9]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-[#605E5C] py-2 border-r border-[#EDEBE9] last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((weekStart) => {
          const weekDays = eachDayOfInterval({
            start: weekStart,
            end: endOfWeek(weekStart),
          })
          return (
            <div key={weekStart.toISOString()} className="grid grid-cols-7 border-b border-[#EDEBE9] min-h-[100px]">
              {weekDays.map((day) => {
                const dayEvents = events.filter((e) => {
                  try { return isSameDay(parseISO(e.start_time), day) } catch { return false }
                })
                const inMonth = isSameMonth(day, currentDate)

                return (
                  <div
                    key={day.toISOString()}
                    data-automation-id={`calendar-view-0`}
                    aria-label={format(day, 'EEEE, MMMM d')}
                    className={cn(
                      'border-r border-[#EDEBE9] last:border-r-0 p-1 cursor-pointer hover:bg-[#F3F2F1] transition-colors',
                      !inMonth && 'bg-[#FAF9F8]'
                    )}
                    onClick={() => onSlotClick?.(day)}
                  >
                    <div className="flex items-center justify-center mb-1">
                      <span
                        className={cn(
                          'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium',
                          isToday(day) && 'bg-[#0078D4] text-white',
                          !isToday(day) && inMonth && 'text-[#323130]',
                          !isToday(day) && !inMonth && 'text-[#A19F9D]'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          compact
                          color={getCalendarColor(calList, event.calendar_id)}
                          onClick={onEventClick}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-[#605E5C] pl-1">
                          +{dayEvents.length - 3} more
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
  )
}

function WeekView({
  currentDate,
  events,
  calendars: calList,
  onEventClick,
  onSlotClick,
  workWeekOnly = false,
}: Omit<CalendarGridProps, 'view'> & { workWeekOnly?: boolean }) {
  const weekStart = startOfWeek(currentDate)
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart),
  }).filter((d) => (workWeekOnly ? getDay(d) >= 1 && getDay(d) <= 5 : true))

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header row */}
      <div
        className="grid border-b border-[#EDEBE9] flex-shrink-0"
        style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}
        data-automation-id="calendar-view-header-0"
      >
        <div className="border-r border-[#EDEBE9]" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="text-center py-2 border-r border-[#EDEBE9] last:border-r-0"
          >
            <p className="text-xs text-[#605E5C]">{format(day, 'EEE')}</p>
            <p
              className={cn(
                'text-lg font-light mx-auto w-8 h-8 flex items-center justify-center rounded-full',
                isToday(day) && 'bg-[#0078D4] text-white text-sm font-medium'
              )}
            >
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div
        className="flex-1 overflow-y-auto outlook-scrollbar"
        data-automation-id="calendar-view-0"
      >
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid border-b border-[#EDEBE9]"
            style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)`, minHeight: '48px' }}
          >
            <div className="border-r border-[#EDEBE9] px-2 pt-0.5">
              <span className="text-[10px] text-[#605E5C]">
                {hour === 0 ? '' : format(new Date(2000, 0, 1, hour), 'h a')}
              </span>
            </div>
            {days.map((day) => {
              const slotEvents = events.filter((e) => {
                try {
                  const start = parseISO(e.start_time)
                  return isSameDay(start, day) && start.getHours() === hour
                } catch { return false }
              })
              return (
                <div
                  key={day.toISOString()}
                  aria-label={`${format(day, 'EEEE')} ${hour}:00`}
                  className="border-r border-[#EDEBE9] last:border-r-0 p-0.5 cursor-pointer hover:bg-[#F3F2F1] transition-colors"
                  onClick={() => {
                    const d = new Date(day)
                    d.setHours(hour)
                    onSlotClick?.(d, hour)
                  }}
                >
                  {slotEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      color={getCalendarColor(calList, event.calendar_id)}
                      onClick={onEventClick}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function DayView({
  currentDate,
  events,
  calendars: calList,
  onEventClick,
  onSlotClick,
}: Omit<CalendarGridProps, 'view'>) {
  const dayEvents = events.filter((e) => {
    try { return isSameDay(parseISO(e.start_time), currentDate) } catch { return false }
  })

  return (
    <div className="flex-1 flex flex-col overflow-auto" data-automation-id="calendar-view-0">
      {/* Header */}
      <div className="flex border-b border-[#EDEBE9] flex-shrink-0" data-automation-id="calendar-view-header-0">
        <div className="w-16" />
        <div className="flex-1 text-center py-2">
          <p className="text-xs text-[#605E5C]">{format(currentDate, 'EEEE')}</p>
          <p
            className={cn(
              'text-2xl font-light mx-auto w-10 h-10 flex items-center justify-center rounded-full',
              isToday(currentDate) && 'bg-[#0078D4] text-white text-xl font-medium'
            )}
          >
            {format(currentDate, 'd')}
          </p>
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar">
        {HOURS.map((hour) => {
          const slotEvents = dayEvents.filter((e) => {
            try { return parseISO(e.start_time).getHours() === hour } catch { return false }
          })
          return (
            <div key={hour} className="flex border-b border-[#EDEBE9] min-h-[48px]">
              <div className="w-16 border-r border-[#EDEBE9] px-2 pt-0.5 flex-shrink-0">
                <span className="text-[10px] text-[#605E5C]">
                  {hour === 0 ? '' : format(new Date(2000, 0, 1, hour), 'h a')}
                </span>
              </div>
              <div
                className="flex-1 p-0.5 cursor-pointer hover:bg-[#F3F2F1] transition-colors"
                onClick={() => {
                  const d = new Date(currentDate)
                  d.setHours(hour)
                  onSlotClick?.(d, hour)
                }}
              >
                {slotEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    color={getCalendarColor(calList, event.calendar_id)}
                    onClick={onEventClick}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarGrid(props: CalendarGridProps) {
  const { view } = props
  if (view === 'month') return <MonthView {...props} />
  if (view === 'week') return <WeekView {...props} />
  if (view === 'work-week') return <WeekView {...props} workWeekOnly />
  return <DayView {...props} />
}
