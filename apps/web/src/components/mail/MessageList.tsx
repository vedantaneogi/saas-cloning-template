'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMailStore } from '@/store/mail'
import { messages, folders, conversations as conversationsApi } from '@/lib/api'
import type { Message } from '@/lib/api'
import { MessageListItem } from './MessageListItem'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Inbox, SortAsc, SortDesc, MailOpen, Trash2, Archive, Flag, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type DateGroup = 'Today' | 'Yesterday' | 'This week' | 'Last week' | 'Older'

function getDateGroup(dateStr: string | null | undefined): DateGroup {
  if (!dateStr) return 'Older'
  const now = new Date()
  const d = new Date(dateStr)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const thisWeekStart = new Date(todayStart.getTime() - (todayStart.getDay() * 86400000))
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000)
  if (d >= todayStart) return 'Today'
  if (d >= yesterdayStart) return 'Yesterday'
  if (d >= thisWeekStart) return 'This week'
  if (d >= lastWeekStart) return 'Last week'
  return 'Older'
}

function groupMessages(msgs: Message[]): Array<{ group: DateGroup; items: Message[] }> {
  const order: DateGroup[] = ['Today', 'Yesterday', 'This week', 'Last week', 'Older']
  const map = new Map<DateGroup, Message[]>()
  for (const msg of msgs) {
    const g = getDateGroup(msg.received_at ?? msg.created_at)
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(msg)
  }
  return order.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }))
}

function ThreadChildren({ conversationId, parentId }: { conversationId: string; parentId: string }) {
  const { data } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationsApi.get(conversationId),
  })

  const threadMsgs = (data?.messages ?? []).filter((m: Message) => m.id !== parentId)

  if (threadMsgs.length === 0) return null

  return (
    <>
      {threadMsgs.map((child: Message) => (
        <div key={child.id} className="ml-8 border-l-[3px] border-[#0078D4] bg-[#FAF9F8]">
          <MessageListItem message={child} />
        </div>
      ))}
    </>
  )
}

export function MessageList() {
  const [focusedTab, setFocusedTab] = useState<'focused' | 'other'>('focused')
  const selectedFolderSlug = useMailStore((s) => s.selectedFolderSlug)
  const selectedFolderId = useMailStore((s) => s.selectedFolderId)
  const conversationGrouping = useMailStore((s) => s.conversationGrouping)
  const sortBy = useMailStore((s) => s.sortBy)
  const sortOrder = useMailStore((s) => s.sortOrder)
  const setSortOrder = useMailStore((s) => s.setSortOrder)
  const isInbox = selectedFolderSlug === 'inbox'
  const queryClient = useQueryClient()
  const selectedMessageIds = useMailStore((s) => s.selectedMessageIds)
  const selectAllMessages = useMailStore((s) => s.selectAllMessages)
  const clearSelection = useMailStore((s) => s.clearSelection)
  const hasSelection = selectedMessageIds.size > 0

  const markAllReadMutation = useMutation({
    mutationFn: (ids: string[]) => messages.bulk('mark_read', ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: ({ action, params }: { action: string; params?: Record<string, string> }) =>
      messages.bulk(action, Array.from(selectedMessageIds), params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      clearSelection()
    },
  })

  // Get folder ID from slug if we don't have it
  const { data: folderList } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  const folderId = selectedFolderId ?? folderList?.find(
    (f) => f.slug === selectedFolderSlug
  )?.id

  const isFollowupView = selectedFolderSlug === 'followup'

  const { data: followupData, isLoading: followupLoading } = useQuery({
    queryKey: ['messages-followup'],
    queryFn: () => messages.needsFollowup(3),
    enabled: isFollowupView,
  })

  const focusedParam = isInbox ? (focusedTab === 'focused' ? true : false) : undefined

  const { data, isLoading, isError } = useQuery({
    queryKey: ['messages', selectedFolderSlug, folderId, conversationGrouping, sortBy, sortOrder, focusedParam],
    queryFn: () =>
      messages.list({
        folder_slug: selectedFolderSlug,
        folder_id: folderId,
        conversation_grouping: conversationGrouping,
        sort: sortBy,
        order: sortOrder,
        per_page: 50,
        focused: focusedParam,
      }),
    enabled: !isFollowupView,
  })

  const rawMessages = isFollowupView ? (followupData?.items ?? []) : (data?.items ?? [])

  // Fetch conversation list to get accurate message_count per conversation
  const convIds = [...new Set(rawMessages.filter((m) => m.conversation_id).map((m) => m.conversation_id!))]
  const { data: convListData } = useQuery({
    queryKey: ['conversations-list'],
    queryFn: () => conversationsApi.list(),
    enabled: convIds.length > 0,
  })
  const convCountMap = new Map<string, number>()
  if (convListData?.items) {
    for (const c of convListData.items) {
      convCountMap.set(c.id, c.message_count)
    }
  }

  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())

  const toggleThread = useCallback((threadKey: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      if (next.has(threadKey)) next.delete(threadKey)
      else next.add(threadKey)
      return next
    })
  }, [])

  // Conversation grouping: group by conversation_id, or by normalized subject as fallback
  type ThreadGroup = { latest: Message; children: Message[]; count: number; key: string }
  const threadGroups: ThreadGroup[] = (() => {
    if (!conversationGrouping) return rawMessages.map((m) => ({ latest: m, children: [], count: 1, key: m.id }))
    const grouped = new Map<string, { latest: Message; children: Message[] }>()
    // Map from normalized subject to conversation key for fallback grouping
    const subjectMap = new Map<string, string>()
    const normalizeSubject = (s: string) => s.replace(/^(re|fw|fwd):\s*/gi, '').trim().toLowerCase()
    for (const msg of rawMessages) {
      let key = msg.conversation_id ?? null
      // Fallback: group by normalized subject when no conversation_id
      if (!key) {
        const normSubj = normalizeSubject(msg.subject || '')
        if (normSubj && subjectMap.has(normSubj)) {
          key = subjectMap.get(normSubj)!
        } else {
          key = msg.id
          if (normSubj) subjectMap.set(normSubj, key)
        }
      } else {
        // Register this conversation_id for subject fallback matching
        const normSubj = normalizeSubject(msg.subject || '')
        if (normSubj && !subjectMap.has(normSubj)) subjectMap.set(normSubj, key)
      }
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, { latest: msg, children: [] })
      } else {
        const existingDate = new Date(existing.latest.received_at ?? existing.latest.created_at).getTime()
        const msgDate = new Date(msg.received_at ?? msg.created_at).getTime()
        if (msgDate > existingDate) {
          existing.children.push(existing.latest)
          existing.latest = msg
        } else {
          existing.children.push(msg)
        }
      }
    }
    return Array.from(grouped.entries()).map(([key, { latest, children }]) => {
      // Use conversation API count if available, otherwise local count
      const apiCount = latest.conversation_id ? convCountMap.get(latest.conversation_id) : undefined
      const localCount = 1 + children.length
      const count = apiCount && apiCount > localCount ? apiCount : localCount
      return {
        latest: { ...latest, _conversationCount: count } as Message & { _conversationCount: number },
        children: children.sort((a, b) => new Date(b.received_at ?? b.created_at).getTime() - new Date(a.received_at ?? a.created_at).getTime()),
        count,
        key,
      }
    })
  })()

  const messageList = threadGroups.map((g) => g.latest)

  const folderName = isFollowupView
    ? 'Follow-up'
    : (folderList?.find((f) => f.slug === selectedFolderSlug || f.id === selectedFolderSlug)?.name ?? selectedFolderSlug)

  return (
    <div
      className="flex flex-col h-full border-r border-[#EDEBE9]"
      aria-label="Message list"
      data-automation-id="MessageList"
    >
      {/* Focused / Other tabs + toolbar icons — matches Outlook layout */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#EDEBE9] bg-white flex-shrink-0">
        {/* Left: Focused/Other tabs (inbox) or folder name */}
        {isInbox ? (
          <div className="flex items-center" role="tablist" aria-label="Inbox tabs">
            <button
              role="tab"
              aria-selected={focusedTab === 'focused'}
              onClick={() => setFocusedTab('focused')}
              className={cn(
                'px-3 py-1 text-sm font-medium transition-colors relative',
                focusedTab === 'focused'
                  ? 'text-[#0078D4] font-semibold after:absolute after:bottom-[-6px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0078D4]'
                  : 'text-[#605E5C] hover:text-[#323130]'
              )}
            >
              Focused
            </button>
            <button
              role="tab"
              aria-selected={focusedTab === 'other'}
              onClick={() => setFocusedTab('other')}
              className={cn(
                'px-3 py-1 text-sm font-medium transition-colors relative',
                focusedTab === 'other'
                  ? 'text-[#0078D4] font-semibold after:absolute after:bottom-[-6px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0078D4]'
                  : 'text-[#605E5C] hover:text-[#323130]'
              )}
            >
              Other
            </button>
          </div>
        ) : (
          <h2 className="text-sm font-semibold text-[#323130] truncate">
            {folderName.charAt(0).toUpperCase() + folderName.slice(1)}
          </h2>
        )}

        {/* Right: Select, Jump, Filter, Sort + By Date */}
        <div className="flex items-center gap-0.5">
          {/* Select all */}
          <button
            onClick={() => {
              if (selectedMessageIds.size === messageList.length) clearSelection()
              else selectAllMessages(messageList.map((m) => m.id))
            }}
            aria-label="Select all"
            title="Select all"
            className={cn(
              'p-1.5 rounded transition-colors',
              hasSelection ? 'text-[#0078D4] bg-[#EBF3FB]' : 'text-[#605E5C] hover:bg-[#F3F2F1]'
            )}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
              <rect x="9.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
              <rect x="1.5" y="9.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
              <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>

          {/* Jump to */}
          <button
            aria-label="Jump to"
            title="Jump to"
            className="p-1.5 text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M5 10l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {/* Filter */}
          <button
            aria-label="Filter"
            title="Filter"
            className="p-1.5 text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>

          {/* Sort */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            aria-label={`Sort ${sortOrder === 'desc' ? 'oldest first' : 'newest first'}`}
            title={`Sorted: By Date ${sortOrder === 'desc' ? '(Newest)' : '(Oldest)'}`}
            className="p-1.5 text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors"
          >
            {sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />}
          </button>

          {/* By Date label */}
          <span className="text-xs text-[#605E5C] ml-0.5 whitespace-nowrap">By Date</span>
        </div>
      </div>

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#EDEBE9] bg-[#EBF3FB] flex-shrink-0 animate-fade-in">
          <span className="text-xs font-medium text-[#0078D4] mr-2">
            {selectedMessageIds.size} selected
          </span>
          <button
            onClick={() => bulkMutation.mutate({ action: 'mark_read' })}
            disabled={bulkMutation.isPending}
            aria-label="Mark selected as read"
            title="Mark as read"
            className="p-1.5 text-[#323130] hover:bg-[#C7E0F4] rounded transition-colors"
          >
            <MailOpen size={13} />
          </button>
          <button
            onClick={() => bulkMutation.mutate({ action: 'flag' })}
            disabled={bulkMutation.isPending}
            aria-label="Flag selected"
            title="Flag"
            className="p-1.5 text-[#323130] hover:bg-[#C7E0F4] rounded transition-colors"
          >
            <Flag size={13} />
          </button>
          <button
            onClick={() => {
              const archiveFolder = folderList?.find((f) => f.slug === 'archive')
              if (archiveFolder) bulkMutation.mutate({ action: 'move', params: { folder_id: archiveFolder.id } })
            }}
            disabled={bulkMutation.isPending}
            aria-label="Archive selected"
            title="Archive"
            className="p-1.5 text-[#323130] hover:bg-[#C7E0F4] rounded transition-colors"
          >
            <Archive size={13} />
          </button>
          <button
            onClick={() => bulkMutation.mutate({ action: 'delete' })}
            disabled={bulkMutation.isPending}
            aria-label="Delete selected"
            title="Delete"
            className="p-1.5 text-[#323130] hover:bg-[#FDE7E9] rounded transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <div className="ml-auto">
            <button
              onClick={clearSelection}
              aria-label="Clear selection"
              className="p-1 text-[#605E5C] hover:bg-[#C7E0F4] rounded transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Message list */}
      <div
        className="flex-1 overflow-y-auto outlook-scrollbar"
        data-automation-id="virtuoso-scroller"
        role="list"
        aria-label={`Messages in ${folderName}`}
      >
        <div data-automation-id="virtuoso-item-list">
          {(isLoading || followupLoading) ? (
            <SpinnerOverlay />
          ) : isError ? (
            <EmptyState
              title="Failed to load messages"
              description="Check your connection and try again."
            />
          ) : messageList.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={isFollowupView ? 'All caught up' : 'Nothing here'}
              description={isFollowupView ? 'No sent messages are awaiting a reply.' : 'This folder is empty.'}
            />
          ) : (
            groupMessages(messageList).map(({ group, items }) => (
              <div key={group}>
                <div className="px-3 py-1 mt-1">
                  <span className="text-xs font-semibold text-[#605E5C] uppercase tracking-wide">{group}</span>
                </div>
                {items.map((msg) => {
                  const thread = threadGroups.find((g) => g.latest.id === msg.id)
                  const threadKey = thread?.key ?? msg.id
                  const isExpanded = expandedThreads.has(threadKey)
                  const hasChildren = (thread?.count ?? 1) > 1

                  return (
                    <div key={msg.id}>
                      <MessageListItem
                        message={msg}
                        conversationCount={(msg as Message & { _conversationCount?: number })._conversationCount}
                        onToggleThread={hasChildren ? () => toggleThread(threadKey) : undefined}
                        threadExpanded={isExpanded}
                      />
                      {/* Expanded thread — fetch ALL conversation messages */}
                      {isExpanded && msg.conversation_id && (
                        <ThreadChildren conversationId={msg.conversation_id} parentId={msg.id} />
                      )}
                      {isExpanded && !msg.conversation_id && thread && thread.children.map((child) => (
                        <div key={child.id} className="ml-8 border-l-[3px] border-[#0078D4] bg-[#FAF9F8]">
                          <MessageListItem message={child} />
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer count */}
      {!isLoading && !followupLoading && messageList.length > 0 && (
        <div className="px-3 py-1.5 border-t border-[#EDEBE9] bg-[#FAF9F8]">
          <span className="text-xs text-[#605E5C]">
            {(isFollowupView ? followupData?.total : data?.total) ?? messageList.length} messages
          </span>
        </div>
      )}
    </div>
  )
}
