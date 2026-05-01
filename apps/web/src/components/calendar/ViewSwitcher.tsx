'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type CalendarView = 'day' | 'week' | 'work-week' | 'month'

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'work-week', label: 'Work week' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

interface ViewSwitcherProps {
  currentView: string
}

export function ViewSwitcher({ currentView }: ViewSwitcherProps) {
  const router = useRouter()

  return (
    <div
      role="tablist"
      aria-label="Calendar view"
      className="flex items-center border border-[#D2D0CE] rounded overflow-hidden"
    >
      {VIEWS.map((view) => (
        <button
          key={view.id}
          role="tab"
          aria-selected={currentView === view.id}
          aria-label={`${view.label} view`}
          onClick={() => router.push(`/calendar/${view.id}`)}
          className={cn(
            'px-3 py-1.5 text-sm transition-colors border-r border-[#D2D0CE] last:border-r-0',
            currentView === view.id
              ? 'bg-[#0078D4] text-white'
              : 'bg-white text-[#323130] hover:bg-[#F3F2F1]'
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}
