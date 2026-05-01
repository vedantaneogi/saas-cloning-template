'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, isSameMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { calendars } from '@/lib/api'
import type { Calendar } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CalendarSidebarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

function MiniCalendar({ selectedDate, onDateSelect }: CalendarSidebarProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate)

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  })

  const startPad = getDay(startOfMonth(viewMonth))

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          aria-label="Previous month"
          className="p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C] transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-[#323130]">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C] transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] text-[#605E5C] font-medium pb-1">
            {d}
          </div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDateSelect(day)}
            aria-label={format(day, 'EEEE, MMMM d, yyyy')}
            aria-pressed={isSameDay(day, selectedDate)}
            className={cn(
              'w-6 h-6 mx-auto rounded-full text-[11px] flex items-center justify-center transition-colors',
              isSameDay(day, selectedDate) && 'bg-[#0078D4] text-white',
              isToday(day) && !isSameDay(day, selectedDate) && 'border border-[#0078D4] text-[#0078D4] font-semibold',
              !isSameMonth(day, viewMonth) && 'text-[#A19F9D]',
              !isSameDay(day, selectedDate) && isSameMonth(day, viewMonth) && 'hover:bg-[#EDEBE9] text-[#323130]'
            )}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CalendarSidebar({ selectedDate, onDateSelect }: CalendarSidebarProps) {
  const queryClient = useQueryClient()
  const { data: calendarList = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendars.list(),
  })

  const toggleVisibility = useMutation({
    mutationFn: (cal: Calendar) =>
      calendars.update(cal.id, { is_visible: !cal.is_visible }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendars'] }),
  })

  return (
    <div className="w-56 flex-shrink-0 border-r border-[#EDEBE9] bg-[#F3F2F1] flex flex-col h-full">
      <MiniCalendar selectedDate={selectedDate} onDateSelect={onDateSelect} />

      <div className="h-px bg-[#EDEBE9] mx-3" />

      {/* Calendar list */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar p-3">
        <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide mb-2">
          My calendars
        </p>
        <ul className="space-y-1">
          {calendarList.map((cal) => (
            <li key={cal.id}>
              <button
                onClick={() => toggleVisibility.mutate(cal)}
                aria-label={`${cal.is_visible ? 'Hide' : 'Show'} ${cal.name} calendar`}
                aria-pressed={cal.is_visible}
                className="w-full flex items-center gap-2 px-1 py-1 rounded hover:bg-[#EDEBE9] text-sm text-[#323130] transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{
                    backgroundColor: cal.is_visible ? cal.color : 'transparent',
                    border: `2px solid ${cal.color}`,
                  }}
                />
                <span className="flex-1 text-left truncate">{cal.name}</span>
                {cal.is_visible ? (
                  <Eye size={12} className="text-[#605E5C] opacity-0 group-hover:opacity-100" />
                ) : (
                  <EyeOff size={12} className="text-[#A19F9D]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
