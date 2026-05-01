'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns'

interface DateNavigatorProps {
  currentDate: Date
  view: string
  onDateChange: (date: Date) => void
}

export function DateNavigator({ currentDate, view, onDateChange }: DateNavigatorProps) {
  const goBack = () => {
    if (view === 'day') onDateChange(subDays(currentDate, 1))
    else if (view === 'week' || view === 'work-week') onDateChange(subWeeks(currentDate, 1))
    else onDateChange(subMonths(currentDate, 1))
  }

  const goForward = () => {
    if (view === 'day') onDateChange(addDays(currentDate, 1))
    else if (view === 'week' || view === 'work-week') onDateChange(addWeeks(currentDate, 1))
    else onDateChange(addMonths(currentDate, 1))
  }

  const goToday = () => onDateChange(new Date())

  const getLabel = () => {
    if (view === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy')
    if (view === 'month') return format(currentDate, 'MMMM yyyy')
    return format(currentDate, 'MMMM yyyy')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goToday}
        aria-label="Go to today"
        className="px-3 py-1.5 text-sm border border-[#D2D0CE] rounded hover:bg-[#F3F2F1] transition-colors text-[#323130]"
      >
        Today
      </button>
      <button
        onClick={goBack}
        aria-label="Previous"
        className="p-1.5 rounded hover:bg-[#F3F2F1] transition-colors text-[#605E5C]"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={goForward}
        aria-label="Next"
        className="p-1.5 rounded hover:bg-[#F3F2F1] transition-colors text-[#605E5C]"
      >
        <ChevronRight size={16} />
      </button>
      <h2
        aria-label={`Current date range: ${getLabel()}`}
        className="text-base font-semibold text-[#323130] min-w-[180px]"
      >
        {getLabel()}
      </h2>
    </div>
  )
}
