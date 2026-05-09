'use client'

import { useState } from 'react'
import { Building2, Users as UsersIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_ROOMS, type MockRoom } from './scheduling-mock'

interface RoomFinderPopoverProps {
  /** Anchor input value — used to filter rooms by name. */
  query: string
  /** Choose an available room (parent fills the location field). */
  onSelect: (room: MockRoom) => void
  /** Show toast / inline warning when user clicks a busy room. */
  onBusy: (room: MockRoom) => void
  /** Open the "Browse all rooms" panel (full list). */
  onBrowseAll?: () => void
}

/**
 * Suggested-rooms popover for the Event form's location field. Renders the
 * mock rooms with available/busy state, capacity, and a "Browse all rooms"
 * footer link. Available rooms select on click; busy rooms call onBusy
 * which the parent typically maps to a toast.
 */
export function RoomFinderPopover({ query, onSelect, onBusy, onBrowseAll }: RoomFinderPopoverProps) {
  const [browseOpen, setBrowseOpen] = useState(false)
  const term = query.trim().toLowerCase()
  const filtered = term
    ? MOCK_ROOMS.filter((r) => r.name.toLowerCase().includes(term) || r.location.toLowerCase().includes(term))
    : MOCK_ROOMS

  const list = browseOpen ? MOCK_ROOMS : filtered
  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg">
      <p className="px-3 py-2 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide border-b border-[#EDEBE9]">
        {browseOpen ? 'All rooms' : 'Suggested rooms'}
      </p>
      {list.length === 0 ? (
        <p className="px-3 py-3 text-xs text-[#A19F9D] italic">No rooms found. Try browsing all rooms.</p>
      ) : (
        <ul className="max-h-72 overflow-y-auto outlook-scrollbar">
          {list.map((r) => {
            const available = r.status === 'available'
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => (available ? onSelect(r) : onBusy(r))}
                  className={cn(
                    'w-full flex items-start gap-2.5 px-3 py-2 border-b border-[#EDEBE9] last:border-0 text-left transition-colors',
                    available ? 'hover:bg-[#F3F2F1]' : 'opacity-70 hover:bg-[#FDE7E9]',
                  )}
                >
                  <Building2 size={16} className={cn('flex-shrink-0 mt-0.5', available ? 'text-[#107C10]' : 'text-[#A4262C]')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#323130] truncate">{r.name}</p>
                    <p className="text-[11px] text-[#605E5C] truncate">
                      <span className={cn(available ? 'text-[#107C10]' : 'text-[#A4262C]', 'font-medium')}>
                        {available ? 'Available' : 'Busy'}
                      </span>{' '}
                      · {r.location}
                    </p>
                  </div>
                  <span className="flex items-center gap-0.5 text-[11px] text-[#605E5C] flex-shrink-0">
                    <UsersIcon size={11} /> {r.capacity}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="px-3 py-2 border-t border-[#EDEBE9]">
        <button
          type="button"
          onClick={() => {
            if (onBrowseAll) onBrowseAll()
            setBrowseOpen((v) => !v)
          }}
          className="text-xs text-[#0078D4] hover:underline"
        >
          {browseOpen ? 'Show suggested only' : 'Browse all rooms'}
        </button>
      </div>
    </div>
  )
}
