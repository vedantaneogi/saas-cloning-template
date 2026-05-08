'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Calendar as CalendarIcon, Plus, Search, X,
  Settings, ChevronDown, UserPlus, LogOut, Edit2, Home, ChevronDown as ChevronDownIcon,
  Send, Trash2, Reply, ReplyAll, Forward, MailOpen, Lock, Globe, Check,
} from 'lucide-react'
import { groups, messages, events as eventsApi, contacts } from '@/lib/api'
import type { Group, Contact } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'
import { format, isSameDay } from 'date-fns'
import { ComposeModal } from '@/components/mail/ComposeModal'
import { EventModal } from '@/components/calendar/EventModal'

type GroupTab = 'email' | 'events' | 'members'
type ViewMode = 'home' | 'group'

// ─── Avatar helper ────────────────────────────────────────────────────────────
function Avatar({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <span
      className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-semibold"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  )
}

function MemberAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  // Pick a stable color from the name
  const palette = ['#0078D4', '#107C10', '#7719AA', '#D13438', '#C19C00', '#5C2E91']
  const idx = (name || '').length % palette.length
  return (
    <span
      className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-semibold text-xs"
      style={{ backgroundColor: palette[idx], width: size, height: size }}
    >
      {initials}
    </span>
  )
}

// ─── Members tab ──────────────────────────────────────────────────────────────
function MembersTab({ group }: { group: Group }) {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const currentEmail = useAuthStore((s) => s.currentUser?.email)?.toLowerCase()
  const [search, setSearch] = useState('')

  const { data: memberList = [], isLoading } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () => groups.members(group.id),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => groups.removeMember(group.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', group.id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      showNotification('Member removed')
    },
    onError: () => showNotification('Could not remove member'),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return memberList
    return memberList.filter(
      (m) =>
        (m.display_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q),
    )
  }, [memberList, search])

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#323130]">All members and guests</h3>
        <div className="relative w-64">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A19F9D]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or alias"
            aria-label="Search members"
            className="w-full text-xs border border-[#EDEBE9] rounded pl-7 pr-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
          />
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[1fr,140px,80px] items-center gap-4 px-2 py-2 border-b border-[#EDEBE9] text-[11px] font-semibold text-[#605E5C] uppercase tracking-wide">
        <span>Name</span>
        <span>Role</span>
        <span />
      </div>

      {isLoading ? (
        <p className="text-xs text-[#605E5C] py-4 px-2">Loading members…</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-[#605E5C] py-8 text-center italic">
          {search ? 'No members match that search.' : 'No members yet.'}
        </p>
      ) : (
        filtered.map((m) => {
          const isMe = (m.email || '').toLowerCase() === currentEmail
          const canRemove = group.is_owner && m.role !== 'owner' && !isMe
          return (
            <div
              key={m.id}
              className="grid grid-cols-[1fr,140px,80px] items-center gap-4 px-2 py-2.5 border-b border-[#EDEBE9] hover:bg-[#F3F2F1] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MemberAvatar name={m.display_name || m.email || ''} />
                <span className="truncate text-sm text-[#323130]">
                  {m.display_name || m.email}
                </span>
              </div>
              <span className="text-sm text-[#323130] capitalize">{m.role}</span>
              <div className="flex items-center justify-end">
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove ${m.display_name || m.email} from ${group.name}?`)) {
                        removeMutation.mutate(m.user_id)
                      }
                    }}
                    aria-label={`Remove ${m.display_name || m.email}`}
                    title="Remove from group"
                    className="w-6 h-6 flex items-center justify-center rounded text-[#605E5C] hover:text-[#D13438] hover:bg-[#FDE7E9]"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <span aria-hidden="true" className="w-6 h-6 inline-block" />
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Add member dialog ────────────────────────────────────────────────────────
// Standalone "Add members" dialog — wraps the same picker the create-group
// flow uses so the UX is identical: search box + scrollable contact list with
// + buttons, chip preview of picks, Skip / Add footer.
function AddMemberDialog({
  group,
  open,
  onClose,
}: {
  group: Group
  open: boolean
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add members to ${group.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-3xl flex max-h-[90vh] overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C] z-10"
        >
          <X size={14} />
        </button>
        <AddMembersStep group={group} onDone={onClose} />
      </div>
    </div>
  )
}

// ─── Email tab ────────────────────────────────────────────────────────────────
function EmailTab({
  group, composing, onCloseCompose,
}: {
  group: Group
  composing: boolean
  onCloseCompose: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Treat group inbox as messages where the group's email appears anywhere on
  // the address lists. Server doesn't expose a dedicated endpoint for this, so
  // we reuse the search route which already does fuzzy matching.
  const { data, isLoading } = useQuery({
    queryKey: ['group-messages', group.id, group.email],
    queryFn: () => messages.search({ q: group.email }),
  })
  const list = data?.items ?? []
  const selected = list.find((m) => m.id === selectedId) ?? list[0] ?? null

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Inbox column */}
      <div className="w-[340px] flex-shrink-0 border-r border-[#EDEBE9] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9] bg-white">
          <span className="text-sm font-semibold text-[#323130]">Inbox</span>
          <button aria-label="Filter" className="p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C]">
            <Mail size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto outlook-scrollbar">
          {isLoading ? (
            <p className="text-xs text-[#605E5C] py-4 text-center">Loading…</p>
          ) : list.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Mail size={32} className="mx-auto text-[#A19F9D] mb-2" />
              <p className="text-sm text-[#323130]">No messages yet</p>
              <p className="text-xs text-[#605E5C] mt-1">
                Send an email to {group.email} to start.
              </p>
            </div>
          ) : (
            list.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedId(msg.id)}
                className={cn(
                  'w-full text-left flex items-start gap-2.5 px-3 py-2.5 border-b border-[#EDEBE9] hover:bg-[#F3F2F1] transition-colors',
                  selected?.id === msg.id && 'bg-[#EBF3FB] border-l-2 border-l-[#0078D4]'
                )}
              >
                <Avatar
                  name={msg.from_name || msg.from_address}
                  color={group.color}
                  size={28}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[#323130] truncate">
                      {msg.from_name || msg.from_address.split('@')[0]}
                    </p>
                    <span className="text-[11px] text-[#605E5C] flex-shrink-0">
                      {msg.received_at ? format(new Date(msg.received_at), 'p') : ''}
                    </span>
                  </div>
                  <p className="text-sm text-[#323130] truncate">{msg.subject}</p>
                  <p className="text-xs text-[#605E5C] truncate">
                    {msg.body_text?.slice(0, 80) ?? ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Reading pane / inline compose. Compose takes over the right side
          when "New mail" is clicked, mirroring the regular mail-page flow
          (no popup) and pre-filling To with the group's email. */}
      <div className="flex-1 overflow-hidden bg-white">
        {composing ? (
          <ComposeModal
            inline
            open={true}
            onClose={onCloseCompose}
          />
        ) : selected ? (
          <div className="h-full overflow-y-auto outlook-scrollbar px-6 py-4">
            <h2 className="text-xl font-semibold text-[#323130] mb-3">{selected.subject}</h2>
            <div className="flex items-center gap-2 mb-4">
              <Avatar name={selected.from_name || selected.from_address} color={group.color} size={32} />
              <div>
                <p className="text-sm font-semibold text-[#323130]">
                  {selected.from_name || selected.from_address}
                </p>
                <p className="text-xs text-[#605E5C]">to {group.name}</p>
              </div>
            </div>
            {selected.body_html ? (
              <div
                className="prose prose-sm max-w-none text-[#323130]"
                dangerouslySetInnerHTML={{ __html: selected.body_html }}
              />
            ) : (
              <p className="text-sm text-[#323130] whitespace-pre-wrap">{selected.body_text}</p>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[#605E5C]">Select a message to read</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Events tab ───────────────────────────────────────────────────────────────
function EventsTab({ group }: { group: Group }) {
  const { data: eventList = [], isLoading } = useQuery({
    queryKey: ['group-events', group.id],
    queryFn: async () => {
      const start = new Date()
      start.setMonth(start.getMonth() - 1)
      const end = new Date()
      end.setMonth(end.getMonth() + 2)
      const list = await eventsApi.list({
        start: start.toISOString(),
        end: end.toISOString(),
      })
      // Filter to events whose attendees include the group email.
      return list.filter((ev) =>
        ev.attendees?.some((a) => (a.email || '').toLowerCase() === group.email.toLowerCase())
      )
    },
  })

  // Mini-cal selection — controls what slice of upcoming events shows. When
  // a specific day is picked we filter to that day; otherwise show the next
  // 60-day window (matches the "from May 26 to July 26" copy in group2.png).
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const today = new Date()
  const upcomingStart = selectedDay ?? today
  const upcomingEnd = (() => {
    if (selectedDay) {
      const e = new Date(selectedDay)
      e.setHours(23, 59, 59)
      return e
    }
    const e = new Date(today)
    e.setMonth(e.getMonth() + 2)
    return e
  })()

  const upcoming = eventList
    .filter((ev) => {
      const s = new Date(ev.start_time)
      return s >= upcomingStart && s <= upcomingEnd
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Days that have at least one group event — used for indicators on the
  // mini calendar so the user can spot busy days at a glance.
  const eventDayKeys = new Set(
    eventList.map((ev) => format(new Date(ev.start_time), 'yyyy-MM-dd'))
  )

  return (
    <div className="flex-1 overflow-y-auto outlook-scrollbar px-6 py-6">
      <div className="max-w-5xl flex flex-col md:flex-row gap-6">
        {/* Mini month calendar — clicking a day filters Upcoming to that day. */}
        <div className="md:w-[280px] flex-shrink-0">
          <div className="border border-[#EDEBE9] rounded-lg bg-white">
            <GroupMiniCalendar
              selectedDay={selectedDay}
              onSelectDay={(d) => setSelectedDay((prev) =>
                prev && isSameDay(prev, d) ? null : d
              )}
              eventDayKeys={eventDayKeys}
              groupColor={group.color}
            />
          </div>
          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="mt-2 text-xs text-[#0078D4] hover:underline"
            >
              Clear day filter
            </button>
          )}
        </div>

        {/* Upcoming events / empty state */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <p className="text-xs text-[#605E5C] py-4">Loading events…</p>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg width="80" height="80" viewBox="0 0 96 96" fill="none" className="mb-3">
                <rect x="14" y="22" width="68" height="58" rx="6" fill="#EFF6FC" />
                <rect x="14" y="22" width="68" height="14" rx="6" fill="#83C7F2" />
                <circle cx="32" cy="50" r="4" fill="#FFB900" />
                <circle cx="48" cy="50" r="4" fill="#107C10" />
                <circle cx="64" cy="50" r="4" fill="#E81123" />
                <circle cx="32" cy="64" r="4" fill="#0078D4" />
                <circle cx="48" cy="64" r="4" fill="#FFB900" />
                <path d="M58 65l5 5 12-12" stroke="#0078D4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <p className="text-sm text-[#323130] mb-1 text-center">
                Nothing planned from {format(upcomingStart, 'MMM d, yyyy')} to {format(upcomingEnd, 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-[#605E5C]">Enjoy!</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-[#323130] mb-3">
                {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'Upcoming'}
              </h3>
              <div className="space-y-2">
                {upcoming.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 p-3 border border-[#EDEBE9] rounded bg-white hover:bg-[#F3F2F1] transition-colors cursor-pointer"
                  >
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#323130] truncate">{ev.title}</p>
                      <p className="text-xs text-[#605E5C]">
                        {format(new Date(ev.start_time), 'EEE, MMM d · p')}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mini calendar (group-scoped) ─────────────────────────────────────────────
// Standalone month grid that highlights the days where group events exist
// (a small dot underneath the day number). Clicking a day filters Upcoming.
function GroupMiniCalendar({
  selectedDay, onSelectDay, eventDayKeys, groupColor,
}: {
  selectedDay: Date | null
  onSelectDay: (d: Date) => void
  eventDayKeys: Set<string>
  groupColor: string
}) {
  const [viewMonth, setViewMonth] = useState(selectedDay ?? new Date())

  const monthDays = (() => {
    const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
    const days: Date[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
    }
    return days
  })()
  const startPad = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay()
  const today = new Date()

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          aria-label="Previous month"
          className="p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C]"
        >
          <ChevronDownIcon size={14} className="rotate-90" />
        </button>
        <span className="text-sm font-semibold text-[#323130]">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          aria-label="Next month"
          className="p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C]"
        >
          <ChevronDownIcon size={14} className="-rotate-90" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center gap-y-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`${d}-${i}`} className="text-[10px] text-[#605E5C] font-medium pb-1">
            {d}
          </div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {monthDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const hasEvents = eventDayKeys.has(key)
          const isSelected = !!selectedDay && isSameDay(day, selectedDay)
          const isCurrentDay = isSameDay(day, today)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-label={format(day, 'EEEE, MMMM d')}
              aria-pressed={isSelected}
              className="relative w-7 h-7 mx-auto flex items-center justify-center"
            >
              <span
                className={cn(
                  'w-7 h-7 rounded-full text-[11px] flex items-center justify-center transition-colors',
                  isSelected
                    ? 'bg-[#0078D4] text-white'
                    : isCurrentDay
                    ? 'border border-[#0078D4] text-[#0078D4] font-semibold'
                    : 'text-[#323130] hover:bg-[#EDEBE9]'
                )}
              >
                {format(day, 'd')}
              </span>
              {hasEvents && !isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ backgroundColor: groupColor }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<GroupTab>('email')
  const [showCreate, setShowCreate] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [groupsExpanded, setGroupsExpanded] = useState(true)
  const [favoritesExpanded, setFavoritesExpanded] = useState(true)
  const [previewGroupId, setPreviewGroupId] = useState<string | null>(null)
  const [editGroupId, setEditGroupId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const closeComposer = useUIStore((s) => s.closeComposer)

  const { data: groupList = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groups.list(),
  })

  // viewMode='home' overrides the auto-fallback so the home page survives
  // even when the user has groups joined.
  const selectedGroup = viewMode === 'home'
    ? null
    : (groupList.find((g) => g.id === selectedId) ?? groupList.find((g) => g.is_member) ?? null)

  const leaveMutation = useMutation({
    mutationFn: (id: string) => groups.leave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setSelectedId(null)
    },
  })

  const favoriteMutation = useMutation({
    mutationFn: (id: string) => groups.toggleFavorite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })

  const openComposer = useUIStore((s) => s.openComposer)

  // Action handlers
  const handleNewMail = () => {
    if (!selectedGroup) return
    // Inline compose in the Email tab — mirrors the mail-page flow rather
    // than the popup ComposeModal. Seed the To field with the group email
    // via the shared composer-draft store; ComposeModal reads it on mount.
    openComposer({
      to: [selectedGroup.email],
      subject: `[${selectedGroup.name}] `,
    })
    setActiveTab('email')
    setComposing(true)
  }

  const handleNewEvent = () => {
    if (!selectedGroup) return
    // Open the EventModal in-place (no redirect). The modal reads the
    // selected group via initialAttendees so the group email is pre-attached.
    setActiveTab('events')
    setEventModalOpen(true)
  }

  const handleLeave = () => {
    if (!selectedGroup) return
    if (confirm(`Leave ${selectedGroup.name}?`)) {
      leaveMutation.mutate(selectedGroup.id)
    }
  }

  return (
    <div className="h-full flex overflow-hidden bg-white" aria-label="Groups">
      {/* Toolbar — context-sensitive per active tab */}
      <div className="w-full flex flex-col overflow-hidden">
        <Toolbar
          activeTab={activeTab}
          group={selectedGroup}
          onNewMail={handleNewMail}
          onNewEvent={handleNewEvent}
          onAddMembers={() => setShowAddMember(true)}
          onEditGroup={() => selectedGroup && setEditGroupId(selectedGroup.id)}
          onLeave={handleLeave}
          onNewGroup={() => setShowCreate(true)}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Left rail — Home + Groups list */}
          <div className="w-56 flex-shrink-0 border-r border-[#EDEBE9] bg-white flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto outlook-scrollbar py-2">
              {/* Home */}
              <button
                type="button"
                onClick={() => { setViewMode('home'); setSelectedId(null) }}
                aria-pressed={viewMode === 'home'}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#F3F2F1]',
                  viewMode === 'home' ? 'bg-[#EBF3FB] text-[#0078D4]' : 'text-[#323130]'
                )}
              >
                <Home size={14} />
                Home
              </button>

              {/* Favorites — same as joined groups for now (no real favorite
                  flag yet); senior wanted the section visible per newgroup3.png. */}
              <button
                type="button"
                onClick={() => setFavoritesExpanded((v) => !v)}
                className="w-full flex items-center gap-1 px-3 py-1.5 text-sm text-[#323130] hover:bg-[#F3F2F1]"
              >
                <ChevronDownIcon
                  size={12}
                  className={cn('transition-transform', !favoritesExpanded && '-rotate-90')}
                />
                <span className="font-semibold flex-1 text-left">Favorites</span>
              </button>
              {favoritesExpanded && (
                <div className="pl-2">
                  {groupList.filter((g) => g.is_favorite).length === 0 ? (
                    <p className="text-xs text-[#A19F9D] italic px-3 py-1.5">
                      No favorites yet.
                    </p>
                  ) : (
                    groupList
                      .filter((g) => g.is_favorite)
                      .map((g) => (
                        <button
                          key={`fav-${g.id}`}
                          onClick={() => { setViewMode('group'); setSelectedId(g.id) }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#F3F2F1] text-left',
                            viewMode === 'group' && selectedId === g.id && 'bg-[#EBF3FB] text-[#0078D4]'
                          )}
                        >
                          <Avatar name={g.name} color={g.color} size={20} />
                          <span className="truncate">{g.name}</span>
                        </button>
                      ))
                  )}
                </div>
              )}

              {/* Groups header */}
              <button
                type="button"
                onClick={() => setGroupsExpanded((v) => !v)}
                className="w-full flex items-center gap-1 px-3 py-1.5 text-sm text-[#323130] hover:bg-[#F3F2F1]"
              >
                <ChevronDownIcon
                  size={12}
                  className={cn('transition-transform', !groupsExpanded && '-rotate-90')}
                />
                <span className="font-semibold flex-1 text-left">Groups</span>
              </button>

              {groupsExpanded && (
                <div className="pl-2">
                  {groupList.length === 0 ? (
                    <p className="text-xs text-[#A19F9D] italic px-3 py-2">No groups yet.</p>
                  ) : (
                    groupList
                      .filter((g) => g.is_member)
                      .map((g) => (
                        <button
                          key={g.id}
                          onClick={() => { setViewMode('group'); setSelectedId(g.id) }}
                          aria-pressed={selectedGroup?.id === g.id}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#F3F2F1] text-left',
                            selectedGroup?.id === g.id && 'bg-[#EBF3FB] text-[#0078D4]'
                          )}
                        >
                          <Avatar name={g.name} color={g.color} size={20} />
                          <span className="truncate">{g.name}</span>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Main content area */}
          {viewMode === 'home' || !selectedGroup ? (
            <HomeView
              groupList={groupList}
              onOpenCreate={() => setShowCreate(true)}
              onOpenGroup={(id) => { setViewMode('group'); setSelectedId(id) }}
              onPreviewGroup={(id) => setPreviewGroupId(id)}
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Group header */}
              <div className="px-6 py-3 border-b border-[#EDEBE9] flex items-start justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedGroup.name} color={selectedGroup.color} size={40} />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-base font-semibold text-[#323130]">{selectedGroup.name}</h1>
                      <button
                        type="button"
                        aria-label={selectedGroup.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        aria-pressed={selectedGroup.is_favorite}
                        onClick={() => favoriteMutation.mutate(selectedGroup.id)}
                        disabled={favoriteMutation.isPending}
                        className={cn(
                          'transition-colors',
                          selectedGroup.is_favorite ? 'text-[#FFB900]' : 'text-[#A19F9D] hover:text-[#FFB900]'
                        )}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill={selectedGroup.is_favorite ? 'currentColor' : 'none'}>
                          <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z" stroke="currentColor" strokeWidth="1" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => setEditGroupId(selectedGroup.id)}
                        className="text-[#A19F9D] hover:text-[#605E5C]"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-[#605E5C]">{selectedGroup.member_count} member{selectedGroup.member_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleNewMail}
                    aria-label="Send email to group"
                    className="flex items-center gap-1.5 text-sm text-[#323130] border border-[#EDEBE9] hover:bg-[#F3F2F1] px-3 py-1 rounded"
                  >
                    <Send size={13} /> Send email
                  </button>
                  <button
                    type="button"
                    aria-label="Following in inbox"
                    className="flex items-center gap-1.5 text-sm text-[#323130] border border-[#EDEBE9] hover:bg-[#F3F2F1] px-3 py-1 rounded"
                  >
                    Following in inbox
                    <ChevronDown size={11} />
                  </button>
                  <button aria-label="Group settings" className="p-1.5 rounded border border-[#EDEBE9] hover:bg-[#F3F2F1] text-[#605E5C]">
                    <Settings size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddMember(true)}
                    aria-label="Add members"
                    className="p-1.5 rounded border border-[#EDEBE9] hover:bg-[#F3F2F1] text-[#605E5C]"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#EDEBE9] px-6 flex-shrink-0">
                {([
                  ['email', 'Email'],
                  ['events', 'Events'],
                  ['members', 'Members'],
                ] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    aria-selected={activeTab === tab}
                    role="tab"
                    className={cn(
                      'px-1 py-2.5 mr-6 text-sm border-b-2 transition-colors',
                      activeTab === tab
                        ? 'border-[#0078D4] text-[#0078D4] font-medium'
                        : 'border-transparent text-[#605E5C] hover:text-[#323130]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 flex overflow-hidden">
                {activeTab === 'email' && (
                  <EmailTab
                    group={selectedGroup}
                    composing={composing}
                    onCloseCompose={() => { setComposing(false); closeComposer() }}
                  />
                )}
                {activeTab === 'events' && <EventsTab group={selectedGroup} />}
                {activeTab === 'members' && <MembersTab group={selectedGroup} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedGroup && (
        <AddMemberDialog
          group={selectedGroup}
          open={showAddMember}
          onClose={() => setShowAddMember(false)}
        />
      )}

      <CreateGroupDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(g) => { setViewMode('group'); setSelectedId(g.id) }}
      />

      {/* Group detail popup — opened by clicking a Frequently used card. */}
      <GroupDetailPopup
        group={groupList.find((g) => g.id === previewGroupId) ?? null}
        open={!!previewGroupId}
        onClose={() => setPreviewGroupId(null)}
        onOpenGroup={(id) => {
          setPreviewGroupId(null)
          setViewMode('group')
          setSelectedId(id)
        }}
        onOpenEdit={() => {
          if (previewGroupId) {
            setEditGroupId(previewGroupId)
            setPreviewGroupId(null)
          }
        }}
      />

      {/* Edit + delete dialog */}
      <EditGroupDialog
        key={editGroupId ?? 'edit'}
        group={groupList.find((g) => g.id === editGroupId) ?? null}
        open={!!editGroupId}
        onClose={() => setEditGroupId(null)}
        onDeleted={() => {
          setEditGroupId(null)
          setViewMode('home')
          setSelectedId(null)
        }}
      />

      {/* New event — opens in-place over the groups page. The group's email
          is pre-attached as an attendee so the event surfaces in the group's
          Events tab (which filters by attendee.email == group.email), and
          the title is seeded "<Group> event" so it's identifiable at a
          glance. */}
      {selectedGroup && (
        <EventModal
          key={`group-event-${selectedGroup.id}-${eventModalOpen}`}
          open={eventModalOpen}
          onClose={() => setEventModalOpen(false)}
          initialDate={new Date()}
          initialAttendees={[{ email: selectedGroup.email, name: selectedGroup.name }]}
          initialTitle={`${selectedGroup.name} event`}
        />
      )}
    </div>
  )
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
// The buttons differ per active tab to mirror Outlook's contextual ribbon
// (group1 = Email tab, group2 = Events tab, group3 = Members tab).
function Toolbar({
  activeTab,
  group,
  onNewMail,
  onNewEvent,
  onAddMembers,
  onEditGroup,
  onLeave,
  onNewGroup,
}: {
  activeTab: GroupTab
  group: Group | null
  onNewMail: () => void
  onNewEvent: () => void
  onAddMembers: () => void
  onEditGroup: () => void
  onLeave: () => void
  onNewGroup: () => void
}) {
  const showNotification = useUIStore((s) => s.showNotification)
  const isOwner = group?.is_owner ?? false
  const isMember = group?.is_member ?? false

  // Home mode: no group selected — toolbar mirrors grouphome.png with
  // "New group" as the primary action.
  if (!group) {
    return (
      <div className="flex items-center h-11 px-3 gap-1 border-b border-[#EDEBE9] bg-white flex-shrink-0">
        <ToolbarPrimary onClick={onNewGroup} icon={<Plus size={13} />} label="New group" />
        <ToolbarSep />
        <ToolbarBtn icon={<Search size={13} />} label="Discover groups" onClick={() => showNotification('Browse below')} />
      </div>
    )
  }

  return (
    <div className="flex items-center h-11 px-3 gap-1 border-b border-[#EDEBE9] bg-white flex-shrink-0">
      {activeTab === 'email' && (
        <>
          <ToolbarPrimary onClick={onNewMail} icon={<Mail size={13} />} label="New mail" />
          <ToolbarSep />
          <ToolbarBtn icon={<Trash2 size={13} />} label="Delete" onClick={() => showNotification('Delete')} />
          <ToolbarBtn icon={<Reply size={13} />} label="Reply" onClick={() => showNotification('Reply')} />
          <ToolbarBtn icon={<ReplyAll size={13} />} label="Reply all" onClick={() => showNotification('Reply all')} />
          <ToolbarBtn icon={<Forward size={13} />} label="Forward" onClick={() => showNotification('Forward')} />
          <ToolbarBtn icon={<MailOpen size={13} />} label="Read / Unread" onClick={() => showNotification('Mark read')} />
        </>
      )}
      {activeTab === 'events' && (
        <>
          <ToolbarPrimary onClick={onNewEvent} icon={<CalendarIcon size={13} />} label="New event" />
          <ToolbarSep />
          <ToolbarBtn
            icon={<CalendarIcon size={13} />}
            label="View in calendar"
            onClick={() => { window.location.href = '/calendar/month' }}
          />
        </>
      )}
      {activeTab === 'members' && (
        <>
          <ToolbarPrimary onClick={onNewGroup} icon={<Plus size={13} />} label="New group" />
          <ToolbarSep />
          <ToolbarBtn icon={<Edit2 size={13} />} label="Edit group" onClick={onEditGroup} disabled={!isOwner} />
          <ToolbarBtn
            icon={<UserPlus size={13} />}
            label="Add members"
            onClick={onAddMembers}
            disabled={!isOwner}
          />
          <ToolbarBtn
            icon={<LogOut size={13} />}
            label="Leave group"
            onClick={onLeave}
            disabled={!isMember}
          />
        </>
      )}
    </div>
  )
}

function ToolbarPrimary({
  icon, label, onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <div className="flex items-center mr-1 flex-shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium pl-3 pr-2 h-7 rounded-l transition-colors"
      >
        {icon}
        <span>{label}</span>
      </button>
      <button
        type="button"
        aria-label={`${label} options`}
        className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-7 px-1 rounded-r border-l border-white/30 transition-colors"
      >
        <ChevronDown size={10} />
      </button>
    </div>
  )
}

function ToolbarBtn({
  icon, label, onClick, disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'flex items-center gap-1.5 px-2.5 h-7 rounded text-xs',
        disabled
          ? 'text-[#A19F9D] cursor-not-allowed'
          : 'text-[#323130] hover:bg-[#F3F2F1]'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function ToolbarSep() {
  return <div className="w-px h-6 bg-[#EDEBE9] mx-1 flex-shrink-0" aria-hidden="true" />
}

// ─── Home view ────────────────────────────────────────────────────────────────
// Greeting hero + empty-state + Discover groups grid. Matches grouphome.png.
function HomeView({
  groupList,
  onOpenCreate,
  onOpenGroup,
  onPreviewGroup,
}: {
  groupList: Group[]
  onOpenCreate: () => void
  onOpenGroup: (id: string) => void
  onPreviewGroup: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const openComposer = useUIStore((s) => s.openComposer)
  const currentUser = useAuthStore((s) => s.currentUser)
  const firstName = (currentUser?.display_name || '').split(/\s+/)[0] || 'there'

  const myGroups = groupList.filter((g) => g.is_member)
  const discoverGroups = groupList.filter((g) => !g.is_member)

  const joinMutation = useMutation({
    mutationFn: (id: string) => groups.join(id),
    onSuccess: (_data, id) => {
      const g = groupList.find((x) => x.id === id)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      showNotification(
        g?.privacy === 'private'
          ? 'Request to join sent'
          : `Joined ${g?.name ?? 'group'}`
      )
    },
    onError: (e: Error) => showNotification(e.message || 'Could not request to join'),
  })

  const greeting = (() => {
    const hr = new Date().getHours()
    if (hr < 12) return 'Good morning'
    if (hr < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="flex-1 overflow-y-auto outlook-scrollbar bg-[#FAF9F8]">
      <div className="max-w-6xl mx-auto px-8 py-6 space-y-8">
        {/* Hero */}
        <div className="rounded-lg bg-gradient-to-r from-[#FFF4D6] via-[#FFE6E6] to-[#E6F1FF] px-8 py-7 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#323130]">
              {greeting}, {firstName}!
            </h1>
            <p className="text-sm text-[#605E5C] mt-1">
              Achieve more with Outlook Groups
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.open('https://support.microsoft.com/en-us/office/learn-about-groups-b565caa1-5c40-40ef-9915-60fdb2d97fa2', '_blank')}
            className="bg-white border border-[#EDEBE9] hover:bg-[#F3F2F1] text-sm text-[#323130] px-3 py-1.5 rounded shadow-sm"
          >
            More about Groups
          </button>
        </div>

        {/* Empty state when no joined groups */}
        {myGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <svg width="64" height="64" viewBox="0 0 96 96" fill="none" className="mb-3">
              <circle cx="36" cy="40" r="14" fill="#0078D4" opacity="0.2" />
              <circle cx="60" cy="40" r="14" fill="#0078D4" opacity="0.4" />
              <circle cx="48" cy="58" r="14" fill="#0078D4" opacity="0.6" />
            </svg>
            <p className="text-sm text-[#323130] mb-1">
              You don&rsquo;t have any groups yet!
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="text-sm text-[#0078D4] hover:underline"
            >
              Create or join a group to get started.
            </button>
          </div>
        )}

        {/* Frequently used groups — appears once the user has joined groups.
            Cards have quick-action icons (Email/Files/Calendar/People) per
            newgroup3.png. Clicking the card opens the detail popup. */}
        {myGroups.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-[#323130] mb-3">Frequently used groups</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {myGroups.slice(0, 8).map((g) => (
                <FrequentCard
                  key={g.id}
                  group={g}
                  onPreview={() => onPreviewGroup(g.id)}
                  onEmail={() => openComposer({ to: [g.email], subject: `[${g.name}] ` })}
                  onFiles={() => { onOpenGroup(g.id); showNotification('Files') }}
                  onCalendar={() => onOpenGroup(g.id)}
                  onPeople={() => onOpenGroup(g.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent files — empty state. The clone doesn't yet have a per-group
            files store, so we show the same "No files to show" placeholder
            Outlook surfaces. */}
        <div>
          <h2 className="text-base font-semibold text-[#323130] mb-3">Recent files</h2>
          <div className="bg-white border border-[#EDEBE9] rounded-lg py-12 flex flex-col items-center justify-center">
            <svg width="64" height="48" viewBox="0 0 96 72" fill="none" className="mb-3 opacity-90">
              <rect x="20" y="14" width="44" height="48" rx="3" fill="#E1DFDD" />
              <rect x="32" y="20" width="44" height="48" rx="3" fill="#A19F9D" />
              <path d="M40 12l-3 7-7-3 5-7-7-3 7-3 3-7 3 7 7 3-5 7 7 3z" fill="#FFB900" opacity="0.85" />
            </svg>
            <p className="text-sm text-[#323130]">No files to show</p>
            <p className="text-xs text-[#605E5C] mt-1">
              Recent files stored with groups appear here
            </p>
          </div>
        </div>

        {/* Discover groups */}
        {discoverGroups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#323130]">Discover groups</h2>
              <button
                type="button"
                className="text-xs text-[#0078D4] hover:underline"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {discoverGroups.slice(0, 10).map((g) => (
                <DiscoverCard
                  key={g.id}
                  group={g}
                  onJoin={() => joinMutation.mutate(g.id)}
                  onOpen={() => onOpenGroup(g.id)}
                  joining={joinMutation.isPending && joinMutation.variables === g.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Card used in "Frequently used groups". Card body opens the detail popup;
// the bottom action row deep-links into Email/Files/Calendar/People.
function FrequentCard({
  group, onPreview, onEmail, onFiles, onCalendar, onPeople,
}: {
  group: Group
  onPreview: () => void
  onEmail: () => void
  onFiles: () => void
  onCalendar: () => void
  onPeople: () => void
}) {
  const queryClient = useQueryClient()
  const favMutation = useMutation({
    mutationFn: () => groups.toggleFavorite(group.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
  const isPrivate = group.privacy === 'private'
  // Outer wrapper is a div (not a button) so the Favorite + QuickAction
  // buttons can live inside without producing nested-<button> hydration errors.
  // Keyboard support is preserved via role + onKeyDown.
  return (
    <div className="bg-white border border-[#EDEBE9] rounded-lg overflow-hidden hover:shadow-sm transition-shadow flex flex-col">
      <div
        role="button"
        tabIndex={0}
        onClick={onPreview}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onPreview()
          }
        }}
        aria-label={`Open ${group.name}`}
        className="text-left px-4 pt-4 pb-3 flex-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
      >
        <div className="flex items-start gap-2">
          <Avatar name={group.name} color={group.color} size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-[#323130] truncate">{group.name}</p>
              <button
                type="button"
                aria-label={group.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={group.is_favorite}
                onClick={(e) => { e.stopPropagation(); favMutation.mutate() }}
                disabled={favMutation.isPending}
                className={cn(
                  'transition-colors',
                  group.is_favorite ? 'text-[#FFB900]' : 'text-[#A19F9D] hover:text-[#FFB900]'
                )}
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill={group.is_favorite ? 'currentColor' : 'none'}>
                  <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z" stroke="currentColor" strokeWidth="1" />
                </svg>
              </button>
            </div>
            <p className="text-[11px] text-[#605E5C] flex items-center gap-1 mt-0.5">
              {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
              {isPrivate ? 'Private group' : 'Public group'}
              <span>·</span>
              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>
      {/* Action icons */}
      <div className="border-t border-[#EDEBE9] px-2 py-1.5 flex items-center justify-around">
        <QuickAction icon={<Mail size={14} />} label="Email" onClick={onEmail} />
        <QuickAction icon={<FileGlyph />} label="Files" onClick={onFiles} />
        <QuickAction icon={<CalendarIcon size={14} />} label="Calendar" onClick={onCalendar} />
        <QuickAction icon={<UsersGlyph />} label="People" onClick={onPeople} />
      </div>
    </div>
  )
}

function QuickAction({
  icon, label, onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      aria-label={label}
      title={label}
      className="w-7 h-7 flex items-center justify-center rounded text-[#605E5C] hover:text-[#0078D4] hover:bg-[#F3F2F1]"
    >
      {icon}
    </button>
  )
}

function DiscoverCard({
  group, onJoin, onOpen, joining,
}: {
  group: Group
  onJoin: () => void
  onOpen: () => void
  joining: boolean
}) {
  const isPrivate = group.privacy === 'private'
  return (
    <div className="bg-white border border-[#EDEBE9] rounded-lg p-4 flex flex-col items-center text-center hover:shadow-sm transition-shadow">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${group.name}`}
        className="flex flex-col items-center w-full"
      >
        <span
          className="w-14 h-14 rounded flex items-center justify-center text-white text-xl font-semibold mb-2"
          style={{ backgroundColor: group.color }}
        >
          {group.name[0].toUpperCase()}
        </span>
        <p className="text-sm font-semibold text-[#323130] truncate w-full">
          {group.name}
        </p>
        <p className="text-xs text-[#605E5C] flex items-center gap-1 justify-center mt-0.5">
          {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
          {isPrivate ? 'Private group' : 'Public group'}
        </p>
      </button>
      <p className="text-[11px] text-[#605E5C] mt-2 mb-2">
        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
      </p>
      <button
        type="button"
        onClick={onJoin}
        disabled={joining}
        className={cn(
          'mt-1 w-full text-xs font-medium border rounded py-1.5 transition-colors',
          joining
            ? 'bg-[#F3F2F1] text-[#A19F9D] border-[#EDEBE9] cursor-not-allowed'
            : 'border-[#EDEBE9] text-[#0078D4] hover:bg-[#EFF6FC]'
        )}
      >
        {joining ? '…' : isPrivate ? 'Request to join' : 'Join'}
      </button>
    </div>
  )
}

// ─── Create group dialog ──────────────────────────────────────────────────────
// Matches Outlook's "Create a group" flow: name, description, group email
// (auto-suggested), privacy, plus initial people picker. Each member is added
// via groups.addMember after the group is created (the creator is owner).
// ─── Group illustrations ──────────────────────────────────────────────────────
// Used by the create / add-members / edit dialogs as the left-column visual.
function GroupHeroIllustration() {
  return (
    <svg width="160" height="160" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <circle cx="100" cy="110" r="80" fill="#EFF6FC" />
      <circle cx="70" cy="80" r="22" fill="#FFC845" />
      <circle cx="130" cy="80" r="22" fill="#83C7F2" />
      <path d="M40 160c0-22 13-40 30-40s30 18 30 40" fill="#FFC845" opacity="0.85" />
      <path d="M100 160c0-22 13-40 30-40s30 18 30 40" fill="#83C7F2" opacity="0.85" />
      <path d="M150 50l8 4 4 8 4-8 8-4-8-4-4-8-4 8z" fill="#FFC845" />
      <path d="M30 130l5 2 2 5 2-5 5-2-5-2-2-5-2 5z" fill="#0078D4" />
    </svg>
  )
}

// ─── Two-step Create group dialog ────────────────────────────────────────────
// Step 1 = group details + default settings. On submit, the group is created
// and we slide to step 2 = picker for initial members. Matches newgroup1.png
// and newgroup2.png. Ditches the cramped single-column form.
function CreateGroupDialog({
  open, onClose, onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (g: Group) => void
}) {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [emailEdited, setEmailEdited] = useState(false)
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private')
  const [language, setLanguage] = useState('English (United States)')
  const [subscribeMembers, setSubscribeMembers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null)

  // Auto-fill the group email from the name unless the user has overridden it.
  useEffect(() => {
    if (emailEdited) return
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setEmail(slug ? `${slug}@company.com` : '')
  }, [name, emailEdited])

  const reset = () => {
    setStep(1); setName(''); setDescription(''); setEmail(''); setEmailEdited(false)
    setPrivacy('private'); setLanguage('English (United States)'); setSubscribeMembers(true)
    setError(null); setCreatedGroup(null)
  }

  const close = () => { reset(); onClose() }

  const createMutation = useMutation({
    mutationFn: () => groups.create({
      name: name.trim(),
      description: description.trim() || undefined,
      email: email.trim() || undefined,
      privacy,
    }),
    onSuccess: (g) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      showNotification(`Group "${g.name}" created`)
      setCreatedGroup(g)
      setStep(2)
    },
    onError: (e: Error) => setError(e.message || 'Could not create group'),
  })

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={step === 1 ? 'Create new group' : `Add members to ${createdGroup?.name ?? ''}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-3xl flex max-h-[90vh] overflow-hidden">
        {/* Close X — absolute over both columns */}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C] z-10"
        >
          <X size={14} />
        </button>

        {step === 1 ? (
          <>
            {/* Left illustration column */}
            <div className="hidden md:flex w-[260px] flex-shrink-0 bg-[#FAF9F8] flex-col items-center justify-center px-6 py-8">
              <h3 className="text-base font-semibold text-[#323130] mb-3 text-center">
                New group
              </h3>
              <GroupHeroIllustration />
              <p className="text-xs text-[#605E5C] text-center mt-4 leading-relaxed">
                Working better as a project or shared goal? Create a group to give your team a space for conversations, shared files, scheduling events and more.
              </p>
            </div>

            {/* Right form column */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 px-6 py-6 space-y-3 overflow-y-auto outlook-scrollbar">
                <div>
                  <label className="block text-xs font-medium text-[#323130] mb-1" htmlFor="g-name">
                    Name
                  </label>
                  <input
                    id="g-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Marketing team"
                    autoFocus
                    className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#323130] mb-1" htmlFor="g-email">
                    Email address
                  </label>
                  <input
                    id="g-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailEdited(true) }}
                    placeholder="group@company.com"
                    className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#323130] mb-1" htmlFor="g-desc">
                    Description
                  </label>
                  <textarea
                    id="g-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Tell people the purpose of your group"
                    className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                  />
                </div>

                {/* Default settings */}
                <div className="border-t border-[#EDEBE9] pt-3 space-y-3">
                  <p className="text-sm font-semibold text-[#323130]">Default settings</p>

                  {/* Privacy */}
                  <div>
                    <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="g-privacy">
                      Privacy
                    </label>
                    <select
                      id="g-privacy"
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
                      className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 bg-white focus:outline-none focus:border-[#0078D4]"
                    >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="g-lang">
                      Language for group-related notifications
                    </label>
                    <select
                      id="g-lang"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 bg-white focus:outline-none focus:border-[#0078D4]"
                    >
                      <option>English (United States)</option>
                      <option>English (India)</option>
                      <option>English (United Kingdom)</option>
                      <option>Español</option>
                      <option>Français</option>
                      <option>Deutsch</option>
                    </select>
                  </div>

                  {/* Subscription */}
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subscribeMembers}
                      onChange={(e) => setSubscribeMembers(e.target.checked)}
                      className="mt-0.5 accent-[#0078D4]"
                    />
                    <span className="text-xs text-[#323130] leading-relaxed">
                      <span className="font-medium">Subscription:</span> Members will receive all group conversations and events in their inboxes.
                    </span>
                  </label>
                </div>

                {error && <p className="text-xs text-[#D13438]">{error}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#EDEBE9]">
                <button
                  type="button"
                  onClick={() => name.trim() && createMutation.mutate()}
                  disabled={!name.trim() || createMutation.isPending}
                  className={cn(
                    'text-sm bg-[#0078D4] hover:bg-[#106EBE] text-white px-4 py-1.5 rounded',
                    (!name.trim() || createMutation.isPending) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm border border-[#8A8886] text-[#323130] px-4 py-1.5 rounded hover:bg-[#F3F2F1]"
                >
                  Discard
                </button>
              </div>
            </div>
          </>
        ) : (
          // Step 2 — add members. The created group exists, so we hand it off
          // when the user clicks "Add" or "Not now".
          createdGroup && (
            <AddMembersStep
              group={createdGroup}
              onDone={() => {
                onCreated(createdGroup)
                close()
              }}
            />
          )
        )}
      </div>
    </div>
  )
}

// ─── Step 2: Add members (also reusable as a stand-alone "Add members" flow) ─
function AddMembersStep({
  group, onDone,
}: {
  group: Group
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<{ email: string; name: string }[]>([])

  const { data: suggestions = [] } = useQuery<Contact[]>({
    queryKey: ['group-add-autocomplete', query],
    queryFn: () => contacts.autocomplete(query || 'a'),
  })

  const addAllMutation = useMutation({
    mutationFn: async () => {
      for (const m of picked) {
        try { await groups.addMember(group.id, m.email) } catch { /* non-fatal */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group-members', group.id] })
      if (picked.length > 0) {
        showNotification(`Added ${picked.length} member${picked.length !== 1 ? 's' : ''}`)
      }
      onDone()
    },
  })

  const filtered = suggestions.filter((c) =>
    !picked.some((p) => p.email.toLowerCase() === c.email.toLowerCase())
    && (c.email.toLowerCase() !== group.email.toLowerCase())
  )

  return (
    <>
      {/* Left illustration column */}
      <div className="hidden md:flex w-[260px] flex-shrink-0 bg-[#FAF9F8] flex-col items-center justify-start px-6 py-8 overflow-y-auto outlook-scrollbar">
        <h3 className="text-base font-semibold text-[#323130] mb-3 text-center">
          Add members to {group.name}
        </h3>
        <GroupHeroIllustration />
        <p className="text-xs text-[#605E5C] text-center mt-4 leading-relaxed">
          Your group has been created. Add members to your group to start collaborating. You can choose to add colleagues, members of working groups or distribution lists, or guests.
        </p>
        <div className="mt-4 self-stretch">
          <p className="text-xs font-semibold text-[#323130] mb-1">Who is a guest?</p>
          <p className="text-[11px] text-[#605E5C] leading-relaxed">
            Guests are people from outside your organization. They will receive all messages sent to the group in their inbox, and can collaborate as files in the group.
          </p>
        </div>
      </div>

      {/* Right column: search + suggestions */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EDEBE9]">
          <h3 className="text-base font-semibold text-[#323130] mb-2">Add members</h3>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A19F9D]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              autoFocus
              className="w-full text-sm border border-[#8A8886] rounded pl-7 pr-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
            />
          </div>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {picked.map((m, idx) => (
                <span
                  key={`${m.email}-${idx}`}
                  className="inline-flex items-center gap-1 bg-[#EFF6FC] border border-[#0078D4]/40 text-[#0078D4] rounded-full px-2 py-0.5 text-xs"
                >
                  {m.name || m.email}
                  <button
                    type="button"
                    onClick={() => setPicked((p) => p.filter((_, i) => i !== idx))}
                    aria-label={`Remove ${m.name || m.email}`}
                    className="hover:text-[#D13438]"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto outlook-scrollbar">
          {filtered.length === 0 ? (
            <p className="text-xs text-[#A19F9D] italic px-6 py-4">No suggestions.</p>
          ) : (
            filtered.slice(0, 12).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setPicked((p) => [...p, { email: c.email, name: c.display_name }])}
                className="w-full flex items-center gap-2.5 px-6 py-2 hover:bg-[#F3F2F1] text-left"
              >
                <MemberAvatar name={c.display_name || c.email} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#323130] truncate">{c.display_name}</p>
                  <p className="text-[11px] text-[#605E5C] truncate">{c.email}</p>
                </div>
                <Plus size={14} className="text-[#0078D4] flex-shrink-0" />
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#EDEBE9]">
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-[#605E5C] hover:bg-[#F3F2F1] px-4 py-1.5 rounded"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => addAllMutation.mutate()}
            disabled={picked.length === 0 || addAllMutation.isPending}
            className={cn(
              'text-sm bg-[#0078D4] hover:bg-[#106EBE] text-white px-4 py-1.5 rounded',
              (picked.length === 0 || addAllMutation.isPending) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {addAllMutation.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Edit group dialog ────────────────────────────────────────────────────────
// Mirrors the create dialog layout but loaded with current group data and adds
// a Delete group destructive action. Owner-only.
function EditGroupDialog({
  group, open, onClose, onDeleted,
}: {
  group: Group | null
  open: boolean
  onClose: () => void
  onDeleted?: () => void
}) {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)

  const [activeTab, setActiveTab] = useState<'about' | 'members'>('about')
  const [name, setName] = useState(group?.name ?? '')
  const [description, setDescription] = useState(group?.description ?? '')
  const [privacy, setPrivacy] = useState<'public' | 'private'>(group?.privacy ?? 'private')
  const [language, setLanguage] = useState('English (United States)')
  const [allowExternal, setAllowExternal] = useState(false)
  const [subscribeMembers, setSubscribeMembers] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Re-seed when the group prop changes (parent uses key= but defensive).
  useEffect(() => {
    if (!group) return
    setName(group.name)
    setDescription(group.description ?? '')
    setPrivacy(group.privacy)
    setError(null)
  }, [group])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!group) throw new Error('No group')
      return groups.update(group.id, {
        name: name.trim(),
        description: description.trim() || null,
        privacy,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      showNotification('Group updated')
      onClose()
    },
    onError: (e: Error) => setError(e.message || 'Could not save group'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!group) throw new Error('No group')
      return groups.delete(group.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      showNotification('Group deleted')
      onDeleted?.()
      onClose()
    },
    onError: (e: Error) => setError(e.message || 'Could not delete group'),
  })

  if (!open || !group) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit group"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-3xl flex max-h-[90vh] overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C] z-10"
        >
          <X size={14} />
        </button>

        {/* Left illustration */}
        <div className="hidden md:flex w-[260px] flex-shrink-0 bg-[#FAF9F8] flex-col items-center justify-center px-6 py-8">
          <h3 className="text-base font-semibold text-[#323130] mb-3 text-center">
            Edit group
          </h3>
          <GroupHeroIllustration />
          <p className="text-xs text-[#605E5C] text-center mt-4 leading-relaxed">
            Working better as a project or shared goal? Update settings to tune privacy, subscriptions, and members.
          </p>
        </div>

        {/* Right column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#EDEBE9] px-6 flex-shrink-0">
            {([['about', 'About'], ['members', 'Members']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                className={cn(
                  'px-1 py-2.5 mr-6 text-sm border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-[#0078D4] text-[#0078D4] font-medium'
                    : 'border-transparent text-[#605E5C] hover:text-[#323130]'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 px-6 py-4 overflow-y-auto outlook-scrollbar">
            {activeTab === 'about' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#323130] mb-1" htmlFor="eg-name">
                    Name
                  </label>
                  <input
                    id="eg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#323130] mb-1" htmlFor="eg-desc">
                    Description
                  </label>
                  <textarea
                    id="eg-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                  />
                </div>

                <div className="border-t border-[#EDEBE9] pt-3 space-y-3">
                  <p className="text-sm font-semibold text-[#323130]">Edit settings</p>

                  <div>
                    <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="eg-privacy">
                      Privacy
                    </label>
                    <select
                      id="eg-privacy"
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
                      className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 bg-white focus:outline-none focus:border-[#0078D4]"
                    >
                      <option value="private">Private — Only approved members can see what's inside</option>
                      <option value="public">Public — Anyone in your org can see and join</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="eg-lang">
                      Language for group-related notifications
                    </label>
                    <select
                      id="eg-lang"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 bg-white focus:outline-none focus:border-[#0078D4]"
                    >
                      <option>English (United States)</option>
                      <option>English (India)</option>
                      <option>English (United Kingdom)</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowExternal}
                      onChange={(e) => setAllowExternal(e.target.checked)}
                      className="mt-0.5 accent-[#0078D4]"
                    />
                    <span className="text-xs text-[#323130] leading-relaxed">
                      Let people outside the organization email this group
                    </span>
                  </label>

                  <div className="pt-1">
                    <p className="text-xs font-medium text-[#605E5C] mb-1">Subscription</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subscribeMembers}
                        onChange={(e) => setSubscribeMembers(e.target.checked)}
                        className="mt-0.5 accent-[#0078D4]"
                      />
                      <span className="text-xs text-[#323130] leading-relaxed">
                        Members will receive all group conversations and events in their inboxes. They can stop following this group later if they want to.
                      </span>
                    </label>
                  </div>
                </div>

                {error && <p className="text-xs text-[#D13438]">{error}</p>}
              </div>
            ) : (
              // Members tab inside the edit dialog — reuses the standalone tab.
              <MembersTab group={group} />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-6 py-3 border-t border-[#EDEBE9]">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!name.trim() || saveMutation.isPending}
              className={cn(
                'text-sm bg-[#0078D4] hover:bg-[#106EBE] text-white px-4 py-1.5 rounded',
                (!name.trim() || saveMutation.isPending) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm border border-[#8A8886] text-[#323130] px-4 py-1.5 rounded hover:bg-[#F3F2F1]"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete the group "${group.name}"? This cannot be undone.`)) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
              className={cn(
                'ml-auto text-sm flex items-center gap-1.5 text-[#D13438] hover:bg-[#FDE7E9] px-3 py-1.5 rounded',
                deleteMutation.isPending && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Trash2 size={13} />
              {deleteMutation.isPending ? 'Deleting…' : 'Delete group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Group detail popup ───────────────────────────────────────────────────────
// Shown when a frequently-used group card is clicked. Quick overview with
// Send Email, Members preview, About info, Apps grid, and Edit Group entry.
function GroupDetailPopup({
  group, open, onClose, onOpenGroup, onOpenEdit,
}: {
  group: Group | null
  open: boolean
  onClose: () => void
  onOpenGroup: (id: string) => void
  onOpenEdit: () => void
}) {
  const openComposer = useUIStore((s) => s.openComposer)
  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview')
  const { data: memberList = [] } = useQuery({
    queryKey: ['group-members', group?.id],
    queryFn: () => (group ? groups.members(group.id) : Promise.resolve([])),
    enabled: !!group && open,
  })

  if (!open || !group) return null

  const apps: { label: string; icon: React.ReactNode; color: string; onClick?: () => void }[] = [
    { label: 'Email', icon: <Mail size={16} />, color: '#0078D4', onClick: () => openComposer({ to: [group.email], subject: `[${group.name}] ` }) },
    { label: 'Calendar', icon: <CalendarIcon size={16} />, color: '#107C10', onClick: () => onOpenGroup(group.id) },
    { label: 'Groups', icon: <UsersGlyph />, color: '#5C2E91', onClick: () => onOpenGroup(group.id) },
    { label: 'Files', icon: <FileGlyph />, color: '#0078D4' },
    { label: 'Notebook', icon: <NotebookGlyph />, color: '#7719AA' },
    { label: 'Site', icon: <SiteGlyph />, color: '#5C2E91' },
    { label: 'Planner', icon: <PlannerGlyph />, color: '#107C10' },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${group.name} details`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C] z-10"
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={group.name} color={group.color} size={48} />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#323130] truncate">{group.name}</h2>
              <p className="text-xs text-[#605E5C] flex items-center gap-1">
                {group.privacy === 'private' ? <Lock size={10} /> : <Globe size={10} />}
                {group.privacy === 'private' ? 'Private group' : 'Public group'}
                <span>·</span>
                {group.member_count} Member{group.member_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openComposer({ to: [group.email], subject: `[${group.name}] ` })}
              className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-sm px-3 py-1.5 rounded"
            >
              <Send size={13} /> Send Email
            </button>
            <button
              type="button"
              aria-label="Following"
              className="p-1.5 rounded border border-[#EDEBE9] hover:bg-[#F3F2F1] text-[#605E5C]"
            >
              <Mail size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#EDEBE9] px-6 flex-shrink-0">
          {([['overview', 'Overview'], ['members', 'Members']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              className={cn(
                'px-1 py-2 mr-6 text-sm border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-[#0078D4] text-[#0078D4] font-medium'
                  : 'border-transparent text-[#605E5C] hover:text-[#323130]'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto outlook-scrollbar px-6 py-4 space-y-4">
          {activeTab === 'overview' ? (
            <>
              {/* About */}
              <section>
                <h3 className="text-sm font-semibold text-[#323130] mb-2">About this group</h3>
                {group.description && (
                  <p className="text-xs text-[#605E5C] leading-relaxed mb-2">{group.description}</p>
                )}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-[#323130]">
                    <UsersGlyph />
                    <span>{group.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#0078D4]">
                    <Mail size={14} className="text-[#605E5C]" />
                    <a href={`mailto:${group.email}`} className="hover:underline truncate">{group.email}</a>
                  </div>
                </div>
              </section>

              {/* Members preview */}
              <section>
                <h3 className="text-sm font-semibold text-[#323130] mb-2">
                  Members ({group.member_count})
                </h3>
                <div className="space-y-2">
                  {memberList.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <MemberAvatar name={m.display_name || m.email || ''} size={28} />
                      <div className="min-w-0">
                        <p className="text-sm text-[#323130] truncate">{m.display_name || m.email}</p>
                        <p className="text-[11px] text-[#605E5C] capitalize">{m.role}</p>
                      </div>
                    </div>
                  ))}
                  {memberList.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('members')}
                      className="text-xs text-[#0078D4] hover:underline"
                    >
                      See all {memberList.length} members
                    </button>
                  )}
                </div>
              </section>

              {/* Apps grid */}
              <section>
                <h3 className="text-sm font-semibold text-[#323130] mb-2">Apps</h3>
                <div className="grid grid-cols-3 gap-2">
                  {apps.map((app) => (
                    <button
                      key={app.label}
                      type="button"
                      onClick={app.onClick}
                      disabled={!app.onClick}
                      className={cn(
                        'flex items-center gap-2 px-2 py-2 rounded text-left text-sm',
                        app.onClick ? 'hover:bg-[#F3F2F1] text-[#323130]' : 'text-[#A19F9D] cursor-not-allowed'
                      )}
                    >
                      <span className="w-6 h-6 flex items-center justify-center" style={{ color: app.color }}>
                        {app.icon}
                      </span>
                      {app.label}
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <MembersTab group={group} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#EDEBE9] px-6 py-2.5 flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenEdit}
            disabled={!group.is_owner}
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded',
              group.is_owner
                ? 'text-[#0078D4] hover:bg-[#EFF6FC]'
                : 'text-[#A19F9D] cursor-not-allowed'
            )}
          >
            <Edit2 size={13} /> Edit Group
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── App glyph helpers (used in the Apps grid) ───────────────────────────────
function UsersGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="6" r="2.5" fill="currentColor" />
      <circle cx="11" cy="7" r="1.8" fill="currentColor" opacity="0.55" />
      <path d="M2 13c0-1.8 1.7-3.2 4-3.2s4 1.4 4 3.2" fill="currentColor" />
      <path d="M9.5 13c0-1.2 1-2.5 2.5-3 .5-.2 1-.3 1.5-.3 1 0 1.5.7 1.5 2" fill="currentColor" opacity="0.55" />
    </svg>
  )
}
function FileGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2h6l4 4v8H3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}
function NotebookGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1" fill="currentColor" />
      <line x1="6" y1="2" x2="6" y2="14" stroke="white" strokeWidth="1" />
    </svg>
  )
}
function SiteGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1" fill="currentColor" opacity="0.85" />
      <rect x="2" y="3" width="12" height="3" fill="currentColor" />
    </svg>
  )
}
function PlannerGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="3" width="10" height="11" rx="1.5" fill="currentColor" opacity="0.85" />
      <path d="M6 8l1.5 1.5L11 6" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
