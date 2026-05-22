
import { useState } from 'react'
import { Building2, Users as UsersIcon, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type MockRoom } from './scheduling-mock'

interface RoomFinderPopoverProps {
  /** Anchor input value — used to filter rooms by name. */
  query: string
  /** Full room directory from the parent (DB-backed). */
  rooms: MockRoom[]
  /** Choose an available room (parent fills the location field). */
  onSelect: (room: MockRoom) => void
  /** Show toast / inline warning when user clicks a busy room. */
  onBusy: (room: MockRoom) => void
  /** Persist a newly-created room. Returns the saved Room (with DB-assigned
   *  UUID) so the popover can immediately select it. */
  onCreateRoom?: (room: MockRoom) => Promise<MockRoom> | void
  /** Open the "Browse all rooms" panel (full list). */
  onBrowseAll?: () => void
}

/**
 * Suggested-rooms popover for the Event form's location field. Renders the
 * mock rooms with available/busy state, capacity, and a "Browse all rooms"
 * footer link. Available rooms select on click; busy rooms call onBusy
 * which the parent typically maps to a toast.
 */
export function RoomFinderPopover({ query, rooms, onSelect, onBusy, onCreateRoom, onBrowseAll }: RoomFinderPopoverProps) {
  const [browseOpen, setBrowseOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newCapacity, setNewCapacity] = useState('6')
  const term = query.trim().toLowerCase()
  const filtered = term
    ? rooms.filter((r) => r.name.toLowerCase().includes(term) || r.location.toLowerCase().includes(term))
    : rooms

  const list = browseOpen ? rooms : filtered

  const submitCreate = async () => {
    const name = newName.trim()
    if (!name) return
    const draft: MockRoom = {
      id: `pending-${Date.now()}`,
      name,
      location: newLocation.trim() || 'Custom room',
      capacity: Math.max(1, Number(newCapacity) || 6),
      status: 'available',
    }
    // Wait for the parent to persist + return the saved room (with the
    // real UUID) so subsequent selection / SA picks reference it.
    let final = draft
    if (onCreateRoom) {
      const maybe = await onCreateRoom(draft)
      if (maybe) final = maybe
    }
    onSelect(final)
    setCreating(false)
    setNewName('')
    setNewLocation('')
    setNewCapacity('6')
  }
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
      <div className="px-3 py-2 border-t border-[#EDEBE9] space-y-2">
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
        {onCreateRoom && !creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full text-left text-xs text-[#0078D4] hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Create new room
          </button>
        )}
        {onCreateRoom && creating && (
          <div className="space-y-1.5 pt-1 border-t border-[#EDEBE9]" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCreate() } if (e.key === 'Escape') setCreating(false) }}
              placeholder="Room name"
              className="w-full text-xs border border-[#D2D0CE] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
            />
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Building, Floor (optional)"
              className="w-full text-xs border border-[#D2D0CE] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#605E5C] flex-shrink-0">Capacity</label>
              <input
                type="number"
                min={1}
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="flex-1 text-xs border border-[#D2D0CE] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitCreate}
                disabled={!newName.trim()}
                className="text-xs bg-[#0078D4] text-white px-3 py-1 rounded hover:bg-[#106EBE] disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName(''); setNewLocation(''); setNewCapacity('6') }}
                className="text-xs text-[#605E5C] hover:text-[#323130] px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
