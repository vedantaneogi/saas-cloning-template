'use client'

import type { Event } from '@/lib/api'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

interface EventCardProps {
  event: Event
  onClick?: (event: Event) => void
  compact?: boolean
  color?: string
}

export function EventCard({ event, onClick, compact = false, color = '#0078D4' }: EventCardProps) {
  const startTime = format(parseISO(event.start_time), 'h:mm a')
  const endTime = format(parseISO(event.end_time), 'h:mm a')

  return (
    <button
      onClick={() => onClick?.(event)}
      aria-label={`${event.title}, ${startTime} to ${endTime}${event.location ? `, ${event.location}` : ''}`}
      className={cn(
        'w-full text-left rounded px-1.5 py-0.5 text-white text-xs font-medium truncate transition-opacity hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-white/50',
        compact ? 'py-px' : 'py-1'
      )}
      style={{ backgroundColor: color }}
    >
      {!compact && (
        <span className="block truncate font-semibold">{event.title}</span>
      )}
      {compact ? (
        <span className="truncate">{event.title}</span>
      ) : (
        <span className="block truncate opacity-90">{startTime}</span>
      )}
    </button>
  )
}
