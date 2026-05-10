'use client'

import { useState, useRef, useEffect } from 'react'
import type { Event } from '@/lib/api'
import { events } from '@/lib/api'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Share2, ExternalLink, Forward, Tag, Lock, Copy, Trash2, ChevronRight } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/store/ui'

interface EventCardProps {
  event: Event
  onClick?: (event: Event) => void
  onDuplicate?: (event: Event) => void
  compact?: boolean
  color?: string
  isShared?: boolean
}

export function EventCard({ event, onClick, onDuplicate, compact = false, color = '#0078D4', isShared = false }: EventCardProps) {
  const startTime = format(new Date(event.start_time), 'h:mm a')
  const endTime = format(new Date(event.end_time), 'h:mm a')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [deleteSubOpen, setDeleteSubOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)

  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  const deleteMutation = useMutation({
    mutationFn: (scope?: 'single' | 'following' | 'series') => {
      if ((scope === 'single' || scope === 'following') && event.recurrence_parent_id) {
        return events.delete(event.recurrence_parent_id, scope, event.start_time)
      }
      return events.delete(event.id, scope)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setContextMenu(null)
    },
  })

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); onClick?.(event) }}
        onContextMenu={handleContextMenu}
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
            {event.categories && event.categories.length > 0 && (
              <Tag size={9} className="flex-shrink-0 opacity-90" />
            )}
            {event.title}
            {isShared && <Share2 size={9} className="flex-shrink-0 opacity-80" />}
          </span>
        )}
        {compact ? (
          <span className="flex items-center gap-1 truncate">
            {event.categories && event.categories.length > 0 && (
              <Tag size={8} className="flex-shrink-0 opacity-90" />
            )}
            <span className="truncate">{event.title}</span>
          </span>
        ) : (
          <span className="block truncate opacity-90">{startTime}</span>
        )}
      </button>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[100] w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 350),
          }}
        >
          {/* Open */}
          <button role="menuitem" onClick={() => { onClick?.(event); setContextMenu(null) }}
            className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
            <ExternalLink size={14} className="text-[#605E5C]" /> Open
            <ChevronRight size={12} className="ml-auto text-[#605E5C]" />
          </button>

          {/* Forward */}
          <button role="menuitem" onClick={() => { showNotification('Forward event'); setContextMenu(null) }}
            className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
            <Forward size={14} className="text-[#605E5C]" /> Forward
            <ChevronRight size={12} className="ml-auto text-[#605E5C]" />
          </button>

          {/* Send to OneNote */}
          <button role="menuitem" onClick={() => { showNotification('Sent to OneNote'); setContextMenu(null) }}
            className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="1.5" fill="#7719AA"/><text x="5" y="11.5" fontSize="8" fill="white" fontWeight="bold" fontFamily="Arial">N</text></svg>
            Send to OneNote
          </button>

          <div className="h-px bg-[#EDEBE9] my-1" />

          {/* Categorize */}
          <button role="menuitem" onClick={() => { showNotification('Categorize'); setContextMenu(null) }}
            className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
            <Tag size={14} className="text-[#605E5C]" /> Categorize
            <ChevronRight size={12} className="ml-auto text-[#605E5C]" />
          </button>

          {/* Private */}
          <button role="menuitem" onClick={() => { showNotification('Marked as private'); setContextMenu(null) }}
            className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
            <Lock size={14} className="text-[#605E5C]" /> Private
          </button>

          {/* Duplicate */}
          <button role="menuitem" onClick={() => { onDuplicate?.(event); setContextMenu(null) }}
            className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
            <Copy size={14} className="text-[#605E5C]" /> Duplicate event
          </button>

          {/* Delete — with scope submenu for recurring events */}
          <div className="relative" onMouseEnter={() => setDeleteSubOpen(true)} onMouseLeave={() => setDeleteSubOpen(false)}>
            <button role="menuitem"
              onClick={() => {
                if (!event.is_recurring) { deleteMutation.mutate(undefined); return }
              }}
              className="w-full flex items-center gap-2 text-sm text-[#D13438] px-3 py-1.5 hover:bg-[#FDE7E9]">
              <Trash2 size={14} /> Delete
              {event.is_recurring && <ChevronRight size={12} className="ml-auto" />}
            </button>
            {event.is_recurring && deleteSubOpen && (
              <div className="absolute left-full top-0 w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 z-50">
                <button role="menuitem" onClick={() => deleteMutation.mutate('single')}
                  className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
                  This event
                </button>
                <button role="menuitem" onClick={() => deleteMutation.mutate('following')}
                  className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
                  This and all following events
                </button>
                <button role="menuitem" onClick={() => deleteMutation.mutate('series')}
                  className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
                  All events in the series
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
