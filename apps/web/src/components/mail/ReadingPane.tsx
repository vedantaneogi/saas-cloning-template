'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMailStore } from '@/store/mail'
import { useUIStore, draftFromReply } from '@/store/ui'
import { messages, folders, categories, conversations } from '@/lib/api'
import type { Message } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { AttachmentBar } from './AttachmentBar'
import { EmailLink } from './EmailLink'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { formatFullDate, formatMessageDate, stripHtml, truncate } from '@/lib/utils'
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Flag,
  MoreHorizontal,
  Mail,
  MailOpen,
  FolderInput,
  Printer,
  ChevronRight,
  ChevronDown,
  Tag,
  Check,
  Clock,
  Send,
  Maximize2,
  X,
  MessagesSquare,
} from 'lucide-react'

function MessageHeader({ message }: { message: Message }) {
  const senderName = message.from_name || message.from_address.split('@')[0]

  return (
    <div className="flex items-start gap-3 mb-3">
      <Avatar name={senderName} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-sm text-[#323130]">
            <EmailLink email={message.from_address} name={message.from_name} />
          </h3>
          <span className="text-xs text-[#605E5C] flex-shrink-0">
            {formatFullDate(message.received_at ?? message.created_at)}
          </span>
        </div>
        <p className="text-xs text-[#605E5C] truncate">
          To:{' '}
          {message.to_addresses.map((a, i) => (
            <span key={a.email}>
              {i > 0 && ', '}
              <EmailLink email={a.email} name={a.name} />
            </span>
          ))}
        </p>
        {message.cc_addresses.length > 0 && (
          <p className="text-xs text-[#605E5C] truncate">
            Cc:{' '}
            {message.cc_addresses.map((a, i) => (
              <span key={a.email}>
                {i > 0 && ', '}
                <EmailLink email={a.email} name={a.name} />
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  )
}

export function ReadingPane() {
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const conversationGrouping = useMailStore((s) => s.conversationGrouping)
  const openComposer = useUIStore((s) => s.openComposer)
  const showNotification = useUIStore((s) => s.showNotification)
  const queryClient = useQueryClient()

  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [moveMenuOpen, setMoveMenuOpen] = useState(false)
  const [catMenuOpen, setCatMenuOpen] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [threadExpanded, setThreadExpanded] = useState(false)
  const [expandedThreadMsgId, setExpandedThreadMsgId] = useState<string | null>(null)

  // Inline reply state
  const [inlineReplyType, setInlineReplyType] = useState<'reply' | 'reply_all' | 'forward' | null>(null)
  const [inlineBodyHtml, setInlineBodyHtml] = useState('')
  const [inlineForwardTo, setInlineForwardTo] = useState('')

  const moreMenuRef = useRef<HTMLDivElement>(null)
  const catMenuRef = useRef<HTMLDivElement>(null)
  const snoozeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreMenuOpen) { setMoveMenuOpen(false); return }
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreMenuOpen])

  useEffect(() => {
    if (!catMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) {
        setCatMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [catMenuOpen])

  useEffect(() => {
    if (!snoozeOpen) return
    const handler = (e: MouseEvent) => {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) {
        setSnoozeOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [snoozeOpen])

  // Reset inline reply when message changes
  useEffect(() => {
    setInlineReplyType(null)
    setInlineBodyHtml('')
    setInlineForwardTo('')
    setThreadExpanded(false)
    setExpandedThreadMsgId(null)
  }, [selectedMessageId])

  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  const { data: folderList = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  const { data: message, isLoading } = useQuery({
    queryKey: ['message', selectedMessageId],
    queryFn: () => messages.get(selectedMessageId!),
    enabled: !!selectedMessageId,
  })

  const { data: convData } = useQuery({
    queryKey: ['conversation', message?.conversation_id],
    queryFn: () => conversations.get(message!.conversation_id!),
    enabled: conversationGrouping && !!message?.conversation_id,
  })

  const threadMessages = (convData?.messages ?? []).filter((m) => m.id !== selectedMessageId)

  const deleteMutation = useMutation({
    mutationFn: () => messages.delete(selectedMessageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const fl = queryClient.getQueryData<{ id: string; slug: string }[]>(['folders'])
      const archiveFolder = fl?.find((f) => f.slug === 'archive')
      if (archiveFolder) return messages.move(selectedMessageId!, archiveFolder.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  })

  const flagMutation = useMutation({
    mutationFn: () => messages.update(selectedMessageId!, { is_flagged: !message?.is_flagged }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (isRead: boolean) => messages.update(selectedMessageId!, { is_read: isRead }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  const moveMutation = useMutation({
    mutationFn: (folderId: string) => messages.move(selectedMessageId!, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setSelectedMessageId(null)
      setMoreMenuOpen(false)
    },
  })

  const categorizeMutation = useMutation({
    mutationFn: (categoryIds: string[]) =>
      messages.update(selectedMessageId!, { category_ids: categoryIds } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const snoozeMutation = useMutation({
    mutationFn: (snoozeUntil: string | null) =>
      messages.update(selectedMessageId!, { snooze_until: snoozeUntil } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      setSnoozeOpen(false)
    },
  })

  const inlineSendMutation = useMutation({
    mutationFn: async () => {
      if (!message || !inlineReplyType) return
      if (inlineReplyType === 'forward') {
        const toList = inlineForwardTo.split(',').map((t) => t.trim()).filter(Boolean)
        return messages.forward(message.id, {
          to_addresses: toList.map((t) => {
            const m = t.match(/^(.+)\s<(.+)>$/)
            return m ? { name: m[1].trim(), email: m[2] } : { email: t }
          }),
          body_html: inlineBodyHtml,
        } as never)
      }
      return messages.reply(message.id, {
        body_html: inlineBodyHtml,
        reply_all: inlineReplyType === 'reply_all',
      } as never)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['conversation', message?.conversation_id] })
      showNotification('Message sent')
      setInlineReplyType(null)
      setInlineBodyHtml('')
    },
  })

  const snoozeOptions = [
    { label: 'Later today (3 hours)', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 3); return d.toISOString() } },
    { label: 'Tomorrow morning', getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString() } },
    { label: 'This weekend', getTime: () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + (6 - day)); d.setHours(8, 0, 0, 0); return d.toISOString() } },
    { label: 'Next week', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (8 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
  ]

  const toggleCategory = (catId: string) => {
    const current = (message?.categories ?? []).map((c) => c.id)
    const next = current.includes(catId) ? current.filter((id) => id !== catId) : [...current, catId]
    categorizeMutation.mutate(next)
  }

  const openInlineReply = (type: 'reply' | 'reply_all' | 'forward') => {
    if (!message) return
    const draft = draftFromReply(message, type)
    setInlineBodyHtml(draft.bodyHtml ?? '')
    setInlineForwardTo('')
    setInlineReplyType(type)
  }

  if (!selectedMessageId) {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-[#FAF9F8]"
        data-automation-id="MailReadCompose"
        aria-label="Reading pane"
      >
        <EmptyState icon={Mail} title="Select a message to read" description="Nothing is selected." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#FAF9F8]" data-automation-id="MailReadCompose">
        <SpinnerOverlay />
      </div>
    )
  }

  if (!message) return null

  return (
    <div
      className="flex flex-col h-full bg-white"
      data-automation-id="MailReadCompose"
      aria-label="Reading pane"
    >
      {/* Action toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#EDEBE9] flex-shrink-0 bg-[#FAF9F8]">
        <Button variant="ghost" size="sm" onClick={() => openInlineReply('reply')} aria-label="Reply">
          <Reply size={14} /> Reply
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openInlineReply('reply_all')} aria-label="Reply all">
          <ReplyAll size={14} /> Reply all
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openComposer(draftFromReply(message, 'forward'))} aria-label="Forward">
          <Forward size={14} /> Forward
        </Button>

        <div className="w-px h-5 bg-[#EDEBE9] mx-1" />

        <Button variant="ghost" size="sm" onClick={() => archiveMutation.mutate()} aria-label="Archive">
          <Archive size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate()} aria-label="Delete">
          <Trash2 size={14} />
        </Button>

        {/* Snooze */}
        <div className="relative" ref={snoozeRef}>
          <Button
            variant="ghost" size="sm"
            onClick={() => setSnoozeOpen((v) => !v)}
            aria-label="Snooze" aria-expanded={snoozeOpen} aria-haspopup="menu"
            className={message.snooze_until ? 'text-[#0078D4]' : ''}
          >
            <Clock size={14} />
          </Button>
          {snoozeOpen && (
            <div role="menu" className="absolute left-0 top-8 z-50 w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in">
              <div className="px-3 py-1.5 text-xs font-semibold text-[#605E5C] border-b border-[#EDEBE9]">Snooze until</div>
              {snoozeOptions.map((opt) => (
                <button key={opt.label} role="menuitem" onClick={() => snoozeMutation.mutate(opt.getTime())}
                  className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                  {opt.label}
                </button>
              ))}
              {message.snooze_until && (
                <>
                  <div className="h-px bg-[#EDEBE9]" />
                  <button role="menuitem" onClick={() => snoozeMutation.mutate(null)}
                    className="w-full text-left text-sm text-[#D13438] px-3 py-2 hover:bg-[#FDE7E9] transition-colors">
                    Remove snooze
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={() => flagMutation.mutate()}
          aria-label={message.is_flagged ? 'Remove flag' : 'Flag'}
          className={message.is_flagged ? 'text-[#D13438]' : ''}>
          <Flag size={14} className={message.is_flagged ? 'fill-[#D13438]' : ''} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate(!message.is_read)}
          aria-label={message.is_read ? 'Mark as unread' : 'Mark as read'}>
          {message.is_read ? <Mail size={14} /> : <MailOpen size={14} />}
        </Button>

        {/* Categorize */}
        <div className="relative" ref={catMenuRef}>
          <Button variant="ghost" size="sm" onClick={() => setCatMenuOpen((v) => !v)}
            aria-label="Categorize" aria-expanded={catMenuOpen} aria-haspopup="menu"
            className={message.categories && message.categories.length > 0 ? 'text-[#0078D4]' : ''}>
            <Tag size={14} />
          </Button>
          {catMenuOpen && (
            <div role="menu" className="absolute right-0 top-8 z-50 w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in">
              {categoryList.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[#605E5C]">No categories</div>
              ) : categoryList.map((cat) => {
                const isActive = (message.categories ?? []).some((c) => c.id === cat.id)
                return (
                  <button key={cat.id} role="menuitem" onClick={() => toggleCategory(cat.id)}
                    className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-left truncate">{cat.name}</span>
                    {isActive && <Check size={12} className="text-[#0078D4] flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* More menu */}
        <div className="relative" ref={moreMenuRef}>
          <Button variant="ghost" size="sm" onClick={() => setMoreMenuOpen((v) => !v)}
            aria-label="More actions" aria-expanded={moreMenuOpen} aria-haspopup="menu">
            <MoreHorizontal size={14} />
          </Button>
          {moreMenuOpen && (
            <div role="menu" className="absolute right-0 top-8 z-50 w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in">
              <div className="relative" onMouseEnter={() => setMoveMenuOpen(true)} onMouseLeave={() => setMoveMenuOpen(false)}>
                <button role="menuitem" className="flex items-center justify-between w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                  <span className="flex items-center gap-2"><FolderInput size={14} /> Move to folder</span>
                  <ChevronRight size={12} className="text-[#605E5C]" />
                </button>
                {moveMenuOpen && (
                  <div className="absolute left-full top-0 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg">
                    {folderList.map((f) => (
                      <button key={f.id} role="menuitem" onClick={() => moveMutation.mutate(f.id)}
                        className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors truncate">
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="h-px bg-[#EDEBE9]" />
              <button role="menuitem" onClick={() => { markReadMutation.mutate(!message.is_read); setMoreMenuOpen(false) }}
                className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                {message.is_read ? <Mail size={14} /> : <MailOpen size={14} />}
                {message.is_read ? 'Mark as unread' : 'Mark as read'}
              </button>
              <button role="menuitem" onClick={() => { window.print(); setMoreMenuOpen(false) }}
                className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                <Printer size={14} /> Print
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar">
        <div className="px-6 py-4">
          {/* Subject */}
          <h1 className="text-lg font-semibold text-[#323130] mb-3">
            {message.subject || '(no subject)'}
          </h1>

          {/* Conversation thread accordion */}
          {conversationGrouping && threadMessages.length > 0 && (
            <div className="border border-[#EDEBE9] rounded mb-4 overflow-hidden">
              <button
                onClick={() => setThreadExpanded((v) => !v)}
                aria-expanded={threadExpanded}
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-[#F3F2F1] transition-colors bg-[#FAF9F8]"
              >
                <MessagesSquare size={13} className="text-[#605E5C] flex-shrink-0" />
                <span className="text-xs font-medium text-[#605E5C] flex-1">
                  {convData?.conversation.message_count ?? threadMessages.length + 1} messages in thread
                </span>
                {threadExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {threadExpanded && (
                <div className="divide-y divide-[#EDEBE9]">
                  {threadMessages.map((msg) => (
                    <div key={msg.id}>
                      <button
                        onClick={() => setExpandedThreadMsgId(expandedThreadMsgId === msg.id ? null : msg.id)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-[#F3F2F1] transition-colors"
                      >
                        <Avatar name={msg.from_name ?? msg.from_address} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-xs font-medium text-[#323130] truncate">
                              {msg.from_name ?? msg.from_address.split('@')[0]}
                            </span>
                            <span className="text-xs text-[#605E5C] flex-shrink-0">
                              {formatMessageDate(msg.received_at ?? msg.created_at)}
                            </span>
                          </div>
                          {expandedThreadMsgId !== msg.id && (
                            <p className="text-xs text-[#605E5C] truncate">
                              {truncate(msg.body_text ?? stripHtml(msg.body_html ?? ''), 80)}
                            </p>
                          )}
                        </div>
                        {expandedThreadMsgId === msg.id ? <ChevronDown size={11} className="text-[#605E5C] flex-shrink-0" /> : <ChevronRight size={11} className="text-[#605E5C] flex-shrink-0" />}
                      </button>
                      {expandedThreadMsgId === msg.id && (
                        <div
                          className="px-4 py-3 text-sm text-[#323130] prose prose-sm max-w-none bg-white border-t border-[#EDEBE9]"
                          dangerouslySetInnerHTML={{ __html: msg.body_html ?? msg.body_text?.replace(/\n/g, '<br/>') ?? '' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message header */}
          <MessageHeader message={message} />

          {/* Category badges */}
          {message.categories && message.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
              {message.categories.map((cat) => (
                <span key={cat.id}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: cat.color }}>
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          <div className="h-px bg-[#EDEBE9] my-3" />

          {/* Body */}
          <div
            className="text-sm text-[#323130] prose prose-sm max-w-none"
            aria-label="Message body"
            dangerouslySetInnerHTML={{
              __html: message.body_html ?? message.body_text?.replace(/\n/g, '<br/>') ?? '',
            }}
          />
        </div>
      </div>

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <AttachmentBar attachments={message.attachments} />
      )}

      {/* Inline reply / quick reply bar */}
      {inlineReplyType ? (
        <div className="border-t border-[#EDEBE9] bg-white flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-2 bg-[#FAF9F8] border-b border-[#EDEBE9]">
            <span className="text-sm font-medium text-[#323130]">
              {inlineReplyType === 'forward' ? 'Forward' : inlineReplyType === 'reply_all' ? 'Reply All' : 'Reply'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  openComposer(draftFromReply(message, inlineReplyType))
                  setInlineReplyType(null)
                }}
                aria-label="Pop out to full composer"
                title="Open in full composer"
                className="text-[#605E5C] hover:text-[#323130] p-1 rounded hover:bg-[#EDEBE9]"
              >
                <Maximize2 size={13} />
              </button>
              <button
                onClick={() => setInlineReplyType(null)}
                aria-label="Close inline reply"
                className="text-[#605E5C] hover:text-[#323130] p-1 rounded hover:bg-[#EDEBE9]"
              >
                <X size={13} />
              </button>
            </div>
          </div>
          {inlineReplyType === 'forward' && (
            <div className="px-4 py-1.5 border-b border-[#EDEBE9] flex items-center gap-2">
              <span className="text-xs text-[#605E5C] w-5 flex-shrink-0">To</span>
              <input
                type="text"
                value={inlineForwardTo}
                onChange={(e) => setInlineForwardTo(e.target.value)}
                placeholder="Recipients (comma-separated)"
                aria-label="Forward to"
                className="flex-1 text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none py-0.5"
              />
            </div>
          )}
          <RichTextEditor
            content={inlineBodyHtml}
            onChange={setInlineBodyHtml}
            placeholder="Write your reply..."
            minHeight="120px"
            className="border-0 rounded-none"
          />
          <div className="flex items-center gap-2 px-4 py-2 border-t border-[#EDEBE9] bg-[#FAF9F8]">
            <button
              onClick={() => inlineSendMutation.mutate()}
              disabled={inlineSendMutation.isPending || (inlineReplyType === 'forward' && !inlineForwardTo.trim())}
              aria-label="Send reply"
              className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
            >
              <Send size={13} /> Send
            </button>
            <button
              onClick={() => setInlineReplyType(null)}
              className="text-sm text-[#605E5C] hover:text-[#323130] px-3 py-1.5 hover:bg-[#EDEBE9] rounded transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-[#EDEBE9] px-4 py-2 flex items-center gap-2 bg-[#FAF9F8] flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => openInlineReply('reply')} aria-label="Reply to message">
            <Reply size={13} /> Reply
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openInlineReply('reply_all')} aria-label="Reply all">
            <ReplyAll size={13} /> Reply all
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openComposer(draftFromReply(message, 'forward'))} aria-label="Forward message">
            <Forward size={13} /> Forward
          </Button>
        </div>
      )}
    </div>
  )
}
