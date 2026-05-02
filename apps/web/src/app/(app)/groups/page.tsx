'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UsersRound, Mail, Calendar, Folder, Plus, LogIn, LogOut, Check, FileText, Image, Archive, MoreHorizontal } from 'lucide-react'
import { groups } from '@/lib/api'
import type { Group } from '@/lib/api'
import { cn } from '@/lib/utils'

type GroupTab = 'mail' | 'calendar' | 'files'

export default function GroupsPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<GroupTab>('mail')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const { data: groupList = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groups.list(),
  })

  const selectedGroup = groupList.find((g) => g.id === selectedId) ?? groupList[0] ?? null

  const joinMutation = useMutation({
    mutationFn: (id: string) => groups.join(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })

  const leaveMutation = useMutation({
    mutationFn: (id: string) => groups.leave(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
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

  const toggleMembership = (g: Group) => {
    if (g.is_member) {
      leaveMutation.mutate(g.id)
    } else {
      joinMutation.mutate(g.id)
    }
  }

  const myGroups = groupList.filter((g) => g.is_member)
  const discoverGroups = groupList.filter((g) => !g.is_member)

  return (
    <div className="h-full flex overflow-hidden" aria-label="Groups">
      {/* Left sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-[#EDEBE9] bg-[#F3F2F1] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-[#EDEBE9] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#323130]">Groups</h2>
          <button
            onClick={() => setShowCreate(true)}
            aria-label="New group"
            className="w-6 h-6 flex items-center justify-center text-[#605E5C] hover:text-[#0078D4] hover:bg-[#EDEBE9] rounded transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto outlook-scrollbar">
          {/* My groups */}
          {myGroups.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide px-2 mb-1">
                My groups
              </p>
              {myGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  aria-label={g.name}
                  aria-pressed={selectedGroup?.id === g.id}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-colors',
                    selectedGroup?.id === g.id ? 'bg-[#EDEBE9] text-[#0078D4]' : 'hover:bg-[#EDEBE9] text-[#323130]'
                  )}
                >
                  <span
                    className="w-7 h-7 flex-shrink-0 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: g.color }}
                  >
                    {g.name[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <p className="text-xs text-[#605E5C]">{g.member_count} members</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Discover */}
          {discoverGroups.length > 0 && (
            <div className="p-2 border-t border-[#EDEBE9]">
              <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide px-2 mb-1">
                Discover
              </p>
              {discoverGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  aria-label={g.name}
                  aria-pressed={selectedGroup?.id === g.id}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-colors',
                    selectedGroup?.id === g.id ? 'bg-[#EDEBE9] text-[#0078D4]' : 'hover:bg-[#EDEBE9] text-[#323130]'
                  )}
                >
                  <span
                    className="w-7 h-7 flex-shrink-0 rounded flex items-center justify-center text-white text-xs font-bold opacity-60"
                    style={{ backgroundColor: g.color }}
                  >
                    {g.name[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[#605E5C]">{g.name}</p>
                    <p className="text-xs text-[#A19F9D]">{g.privacy === 'private' ? 'Private' : `${g.member_count} members`}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create group form */}
        {showCreate && (
          <div className="border-t border-[#EDEBE9] p-3 space-y-2 bg-white">
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
                onClick={() => createMutation.mutate({ name: newName.trim(), description: newDesc.trim() || undefined })}
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

      {/* Main content */}
      {selectedGroup ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Group header */}
          <div className="px-6 py-4 border-b border-[#EDEBE9] bg-white flex items-start justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <span
                className="w-10 h-10 flex-shrink-0 rounded flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: selectedGroup.color }}
              >
                {selectedGroup.name[0]}
              </span>
              <div>
                <h1 className="text-lg font-semibold text-[#323130]">{selectedGroup.name}</h1>
                <p className="text-xs text-[#605E5C]">{selectedGroup.email} · {selectedGroup.member_count} members · {selectedGroup.privacy}</p>
                {selectedGroup.description && (
                  <p className="text-sm text-[#605E5C] mt-0.5">{selectedGroup.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => toggleMembership(selectedGroup)}
              disabled={joinMutation.isPending || leaveMutation.isPending}
              aria-label={selectedGroup.is_member ? `Leave ${selectedGroup.name}` : `Join ${selectedGroup.name}`}
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded border transition-colors flex-shrink-0 disabled:opacity-50',
                selectedGroup.is_member
                  ? 'border-[#EDEBE9] text-[#605E5C] hover:bg-[#FDE7E9] hover:text-[#D13438] hover:border-[#D13438]'
                  : 'border-[#0078D4] text-[#0078D4] hover:bg-[#EBF3FB]'
              )}
            >
              {selectedGroup.is_member ? <><LogOut size={13} /> Leave</> : <><LogIn size={13} /> Join</>}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#EDEBE9] bg-white px-6 flex-shrink-0">
            {([['mail', 'Conversations', Mail], ['calendar', 'Calendar', Calendar], ['files', 'Files', Folder]] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-selected={activeTab === tab}
                role="tab"
                className={cn(
                  'flex items-center gap-1.5 px-1 py-3 mr-6 text-sm border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-[#0078D4] text-[#0078D4] font-medium'
                    : 'border-transparent text-[#605E5C] hover:text-[#323130]'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto outlook-scrollbar p-6">
            {activeTab === 'mail' ? (
              <div className="max-w-2xl space-y-3">
                {selectedGroup.is_member ? (
                  <>
                    <p className="text-xs text-[#605E5C] mb-4">
                      Showing group conversations for <strong>{selectedGroup.name}</strong>.
                      Messages sent to {selectedGroup.email} appear here.
                    </p>
                    {[
                      { from: 'Alex Johnson', subject: 'Q4 planning kick-off', preview: "Let's schedule the kick-off for next week. I've sent calendar invites…", time: '2h ago', unread: true },
                      { from: 'Sarah Chen', subject: 'New onboarding checklist', preview: 'Updated the onboarding doc with the latest tooling requirements.', time: 'Yesterday', unread: false },
                      { from: 'Marcus Lee', subject: 'Retro action items', preview: 'Summary of action items from last sprint retro. Please review by Friday.', time: 'Mon', unread: false },
                    ].map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded border cursor-pointer hover:bg-[#F3F2F1] transition-colors',
                          msg.unread ? 'border-[#0078D4]/30 bg-[#EBF3FB]/30' : 'border-[#EDEBE9]'
                        )}
                      >
                        <span
                          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: selectedGroup.color }}
                        >
                          {msg.from[0]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className={cn('text-sm truncate', msg.unread ? 'font-semibold text-[#323130]' : 'text-[#323130]')}>
                              {msg.from}
                            </p>
                            <span className="text-xs text-[#605E5C] flex-shrink-0">{msg.time}</span>
                          </div>
                          <p className={cn('text-sm truncate', msg.unread ? 'font-medium text-[#323130]' : 'text-[#605E5C]')}>
                            {msg.subject}
                          </p>
                          <p className="text-xs text-[#A19F9D] truncate">{msg.preview}</p>
                        </div>
                        {msg.unread && <span className="w-2 h-2 rounded-full bg-[#0078D4] flex-shrink-0 mt-1.5" />}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <UsersRound size={40} className="mx-auto text-[#A19F9D] mb-3" />
                    <p className="text-sm font-medium text-[#323130] mb-1">Join to see conversations</p>
                    <p className="text-xs text-[#605E5C]">You must be a member to view group conversations.</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'calendar' ? (
              <div className="max-w-2xl">
                {selectedGroup.is_member ? (
                  <>
                    <p className="text-xs text-[#605E5C] mb-4">
                      Shared calendar for <strong>{selectedGroup.name}</strong>. Events added here are visible to all members.
                    </p>
                    <div className="space-y-2">
                      {[
                        { title: 'Sprint Planning', date: 'Mon 9:00 AM', duration: '1h', attendees: 8 },
                        { title: 'Weekly Sync', date: 'Wed 10:00 AM', duration: '30 min', attendees: 12 },
                        { title: 'Roadmap Review', date: 'Fri 2:00 PM', duration: '1h 30 min', attendees: 6 },
                      ].map((ev, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 border border-[#EDEBE9] rounded hover:bg-[#F3F2F1] transition-colors cursor-pointer">
                          <div
                            className="w-2 self-stretch rounded-full flex-shrink-0"
                            style={{ backgroundColor: selectedGroup.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#323130]">{ev.title}</p>
                            <p className="text-xs text-[#605E5C]">{ev.date} · {ev.duration} · {ev.attendees} attendees</p>
                          </div>
                          <Check size={14} className="text-[#107C10] flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Calendar size={40} className="mx-auto text-[#A19F9D] mb-3" />
                    <p className="text-sm font-medium text-[#323130] mb-1">Join to see the calendar</p>
                    <p className="text-xs text-[#605E5C]">You must be a member to view group events.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Files tab */
              <div className="max-w-3xl">
                {selectedGroup.is_member ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-[#605E5C]">
                        Files shared with <strong>{selectedGroup.name}</strong>.
                      </p>
                      <button
                        className="text-xs font-medium text-[#0078D4] hover:underline flex items-center gap-1"
                        aria-label="Upload file"
                      >
                        <Plus size={12} /> Upload
                      </button>
                    </div>
                    <div className="border border-[#EDEBE9] rounded overflow-hidden">
                      <div className="grid grid-cols-[auto_1fr_120px_100px_32px] gap-0 bg-[#FAF9F8] border-b border-[#EDEBE9] px-3 py-2 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">
                        <span className="w-6" />
                        <span>Name</span>
                        <span>Modified</span>
                        <span className="text-right">Size</span>
                        <span />
                      </div>
                      {[
                        { name: 'Q4 Roadmap.docx', type: 'doc', modified: 'Apr 30, 2026', size: '84 KB', sharedBy: 'Alex Johnson' },
                        { name: 'Design System v2.fig', type: 'img', modified: 'Apr 28, 2026', size: '3.2 MB', sharedBy: 'Sarah Chen' },
                        { name: 'Sprint 42 Notes.pdf', type: 'pdf', modified: 'Apr 25, 2026', size: '210 KB', sharedBy: 'Marcus Lee' },
                        { name: 'Architecture Diagrams.zip', type: 'zip', modified: 'Apr 20, 2026', size: '18.4 MB', sharedBy: 'Alex Johnson' },
                        { name: 'Budget 2026.xlsx', type: 'doc', modified: 'Apr 15, 2026', size: '52 KB', sharedBy: 'Sarah Chen' },
                      ].map((file, i) => {
                        const Icon = file.type === 'img' ? Image : file.type === 'zip' ? Archive : FileText
                        const iconColor = file.type === 'doc' ? '#0078D4' : file.type === 'img' ? '#8764B8' : file.type === 'zip' ? '#A19F9D' : '#D13438'
                        return (
                          <div
                            key={i}
                            className="group grid grid-cols-[auto_1fr_120px_100px_32px] gap-0 px-3 py-2.5 border-b border-[#EDEBE9] last:border-0 hover:bg-[#F3F2F1] transition-colors cursor-pointer items-center"
                          >
                            <span className="w-6 flex-shrink-0">
                              <Icon size={14} style={{ color: iconColor }} />
                            </span>
                            <div className="min-w-0 pr-4">
                              <p className="text-sm text-[#323130] truncate font-medium">{file.name}</p>
                              <p className="text-[10px] text-[#A19F9D]">Shared by {file.sharedBy}</p>
                            </div>
                            <span className="text-xs text-[#605E5C]">{file.modified}</span>
                            <span className="text-xs text-[#605E5C] text-right">{file.size}</span>
                            <button
                              aria-label={`More options for ${file.name}`}
                              className="w-6 h-6 flex items-center justify-center text-[#A19F9D] hover:text-[#323130] hover:bg-[#EDEBE9] rounded opacity-0 group-hover:opacity-100 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal size={13} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Folder size={40} className="mx-auto text-[#A19F9D] mb-3" />
                    <p className="text-sm font-medium text-[#323130] mb-1">Join to see files</p>
                    <p className="text-xs text-[#605E5C]">You must be a member to view and share group files.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <UsersRound size={48} className="mx-auto text-[#A19F9D] mb-3" />
            <p className="text-sm text-[#605E5C]">Select a group to view its content</p>
          </div>
        </div>
      )}
    </div>
  )
}
