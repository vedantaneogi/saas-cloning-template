'use client'

import { ChevronLeft, ChevronRight, Calendar as CalIcon, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_SUGGESTED_SLOTS } from './scheduling-mock'

interface FindATimePaneProps {
  /** Currently selected start "HH:MM" (matches a suggested slot's start). */
  selectedSlotStart: string | null
  /** Click on a suggested card. */
  onSelectSlot: (startHHMM: string, endHHMM: string) => void
  /** Close the pane. */
  onClose: () => void
}

/**
 * Right-rail "Find a time" pane that lives inside the Event form view.
 * Shows hardcoded 30-min suggested slots from `MOCK_SUGGESTED_SLOTS`. The
 * first slot is the recommended pick (blue border + light blue bg). Click
 * a card to push the chosen time into the parent form.
 */
export function FindATimePane({ selectedSlotStart, onSelectSlot, onClose }: FindATimePaneProps) {
  return (
    <aside className="w-72 flex-shrink-0 border-l border-[#EDEBE9] bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9]">
        <p className="text-sm font-semibold text-[#323130]">Find a time</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close find a time"
          className="text-[#605E5C] hover:bg-[#F3F2F1] rounded p-1"
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* Date selector row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9] text-xs">
        <button type="button" aria-label="Previous day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1]">
          <ChevronLeft size={14} />
        </button>
        <span className="flex items-center gap-1.5 text-[#323130]">
          <CalIcon size={12} className="text-[#605E5C]" />
          Fri, May 8, 2026
        </span>
        <button type="button" aria-label="Next day" className="p-1 rounded text-[#605E5C] hover:bg-[#F3F2F1]">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Duration + Preferences */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9] text-xs">
        <span className="text-[#605E5C]">Duration</span>
        <select className="border border-[#D2D0CE] rounded px-2 py-0.5 bg-white text-[#323130]" defaultValue="30">
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">1 hour</option>
        </select>
        <button type="button" className="text-[#0078D4] hover:underline">
          Preferences
        </button>
      </div>

      {/* Availability summary */}
      <div className="px-3 py-2 border-b border-[#EDEBE9]">
        <p className="text-xs font-medium text-[#107C10]">Excellent! Everyone is available.</p>
        <p className="text-[11px] text-[#605E5C] mt-0.5">Select a time to schedule.</p>
      </div>

      {/* Suggested slot list */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar p-2 space-y-1.5">
        {MOCK_SUGGESTED_SLOTS.map((s) => {
          const isSelected = selectedSlotStart === s.start
          const isRecommended = s.isRecommended && !selectedSlotStart
          const highlight = isSelected || isRecommended
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSlot(s.start, s.end)}
              className={cn(
                'w-full text-left px-3 py-2 rounded border transition-colors',
                highlight
                  ? 'border-[#0078D4] bg-[#EBF3FB] text-[#323130]'
                  : 'border-[#D2D0CE] bg-white text-[#323130] hover:bg-[#F3F2F1]',
              )}
            >
              <p className={cn('text-sm', highlight && 'font-semibold')}>{s.label}</p>
              <p className="text-[11px] text-[#605E5C] mt-0.5">
                {s.duration} · {s.availableCount} available
              </p>
            </button>
          )
        })}
      </div>

      {/* Bottom link */}
      <div className="px-3 py-2 border-t border-[#EDEBE9] text-[11px] text-[#605E5C]">
        Can&apos;t find a suitable time?{' '}
        <button
          type="button"
          onClick={() => alert('More suggestions are not available in this prototype.')}
          className="text-[#0078D4] hover:underline"
        >
          Suggest a new time
        </button>
      </div>
    </aside>
  )
}
