'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Calendar as CalendarIcon, Users, Plus, Search, X,
  Settings, ChevronDown, UserPlus, LogOut, Edit2, Home, ChevronDown as ChevronDownIcon,
  Send, Trash2, Reply, ReplyAll, Forward, MailOpen,
} from 'lucide-react'
import { groups, messages, events as eventsApi } from '@/lib/api'
import type { Group } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

type GroupTab = 'email' | 'events' | 'members'

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
function AddMemberDialog({
  group,
  open,
  onClose,
}: {
  group: Group
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addMutation = useMutation({
    mutationFn: (e: string) => groups.addMember(group.id, e),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', group.id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      showNotification('Member added')
      setEmail('')
      onClose()
    },
    onError: (e: Error) => setError(e.message || 'Could not add member'),
  })

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add members"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9]">
          <h2 className="text-base font-semibold text-[#323130]">Add members to {group.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C]"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-4 py-4 space-y-2">
          <label className="block text-xs font-medium text-[#605E5C]" htmlFor="add-member-email">
            Member email
          </label>
          <input
            id="add-member-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null) }}
            placeholder="name@company.com"
            autoFocus
            className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
          />
          {error && <p className="text-xs text-[#D13438]">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#EDEBE9]">
          <button
            type="button"
            onClick={onClose}
            className="text-sm border border-[#8A8886] text-[#323130] px-4 py-1.5 rounded hover:bg-[#F3F2F1]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => email.trim() && addMutation.mutate(email.trim())}
            disabled={!email.trim() || addMutation.isPending}
            className={cn(
              'text-sm bg-[#0078D4] hover:bg-[#106EBE] text-white px-4 py-1.5 rounded',
              (!email.trim() || addMutation.isPending) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {addMutation.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Email tab ────────────────────────────────────────────────────────────────
function EmailTab({ group }: { group: Group }) {
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

      {/* Reading pane */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar bg-white">
        {selected ? (
          <div className="px-6 py-4">
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

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      {isLoading ? (
        <p className="text-xs text-[#605E5C] py-4">Loading events…</p>
      ) : eventList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          {/* Empty state — calendar illustration matches Outlook screenshot */}
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
          <p className="text-sm text-[#323130] mb-1">
            Nothing planned right now.
          </p>
          <p className="text-xs text-[#605E5C]">Enjoy!</p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-2">
          {eventList.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center gap-3 p-3 border border-[#EDEBE9] rounded hover:bg-[#F3F2F1] transition-colors cursor-pointer"
            >
              <div
                className="w-2 self-stretch rounded-full flex-shrink-0"
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
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<GroupTab>('email')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [groupsExpanded, setGroupsExpanded] = useState(true)

  const { data: groupList = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groups.list(),
  })

  const selectedGroup = groupList.find((g) => g.id === selectedId) ?? groupList[0] ?? null

  const leaveMutation = useMutation({
    mutationFn: (id: string) => groups.leave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setSelectedId(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => groups.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setSelectedId(created.id)
      setNewName('')
      setNewDesc('')
      setShowCreate(false)
    },
  })

  const openComposer = useUIStore((s) => s.openComposer)

  // Action handlers
  const handleNewMail = () => {
    if (!selectedGroup) return
    openComposer({
      to: [selectedGroup.email],
      subject: `[${selectedGroup.name}] `,
    })
  }

  const handleNewEvent = () => {
    if (!selectedGroup) return
    // Navigate to calendar then signal a new-event open on next tick so the
    // page is mounted when the event fires.
    if (typeof window !== 'undefined') {
      window.location.href = '/calendar/month?new=1'
    }
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
          onEditGroup={() => { /* TODO: edit dialog */ }}
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
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#323130] hover:bg-[#F3F2F1]"
              >
                <Home size={14} />
                Home
              </button>

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
                    groupList.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedId(g.id)}
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

            {/* Inline create form */}
            {showCreate && (
              <div className="border-t border-[#EDEBE9] p-3 space-y-2 bg-[#FAF9F8]">
                <p className="text-xs font-semibold text-[#323130]">New group</p>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Group name"
                  autoFocus
                  className="w-full text-xs border border-[#EDEBE9] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                />
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full text-xs border border-[#EDEBE9] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      createMutation.mutate({
                        name: newName.trim(),
                        description: newDesc.trim() || undefined,
                      })
                    }
                    disabled={!newName.trim() || createMutation.isPending}
                    className="flex-1 text-xs font-medium bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white px-2 py-1.5 rounded"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}
                    className="text-xs text-[#605E5C] hover:bg-[#EDEBE9] px-2 py-1.5 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Main content area */}
          {selectedGroup ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Group header */}
              <div className="px-6 py-3 border-b border-[#EDEBE9] flex items-start justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedGroup.name} color={selectedGroup.color} size={40} />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-base font-semibold text-[#323130]">{selectedGroup.name}</h1>
                      <button aria-label="Favorite" className="text-[#A19F9D] hover:text-[#FFB900]">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z" stroke="currentColor" strokeWidth="1" />
                        </svg>
                      </button>
                      <button aria-label="Edit" className="text-[#A19F9D] hover:text-[#605E5C]">
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
                {activeTab === 'email' && <EmailTab group={selectedGroup} />}
                {activeTab === 'events' && <EventsTab group={selectedGroup} />}
                {activeTab === 'members' && <MembersTab group={selectedGroup} />}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users size={48} className="mx-auto text-[#A19F9D] mb-3" />
                <p className="text-sm text-[#605E5C]">Select a group to view its content</p>
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
