'use client'

import type { Event } from '@/lib/api'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Share2 } from 'lucide-react'

interface EventCardProps {
  event: Event
  onClick?: (event: Event) => void
  compact?: boolean
  color?: string
  isShared?: boolean
}

export function EventCard({ event, onClick, compact = false, color = '#0078D4', isShared = false }: EventCardProps) {
  const startTime = format(new Date(event.start_time), 'h:mm a')
  const endTime = format(new Date(event.end_time), 'h:mm a')

  return (
    <button
      onClick={() => onClick?.(event)}
      aria-label={`${event.title}, ${startTime} to ${endTime}${event.location ? `, ${event.location}` : ''}${isShared ? ', shared' : ''}`}
      className={cn(
        'w-full text-left rounded px-1.5 py-0.5 text-white text-xs font-medium truncate transition-opacity hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-white/50 relative overflow-hidden',
        compact ? 'py-px' : 'py-1',
        isShared && 'border border-white/40'
      )}
      style={{
        backgroundColor: color,
        backgroundImage: isShared
          ? `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 5px)`
          : undefined,
      }}
    >
      {!compact && (
        <span className="flex items-center gap-1 truncate font-semibold">
          {event.title}
          {isShared && <Share2 size={9} className="flex-shrink-0 opacity-80" />}
        </span>
      )}
      {compact ? (
        <span className="truncate">{event.title}</span>
      ) : (
        <span className="block truncate opacity-90">{startTime}</span>
      )}
    </button>
  )
}
