'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMailStore } from '@/store/mail'
import { useUIStore, draftFromReply } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import { messages, conversations } from '@/lib/api'
import type { Message } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { AttachmentBar } from './AttachmentBar'
import { ComposeModal } from './ComposeModal'

function ComposeInline() {
  const closeComposer = useUIStore((s) => s.closeComposer)
  return <ComposeModal open={true} onClose={closeComposer} inline />
}
import { EmailLink } from './EmailLink'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { formatOutlookDate, trimQuotedReply } from '@/lib/utils'
import {
  Reply,
  ReplyAll,
  Forward,
  MoreHorizontal,
  Mail,
  Send,
  Maximize2,
  X,
  CalendarDays,
  LayoutGrid,
} from 'lucide-react'

export function ReadingPane() {
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const openComposer = useUIStore((s) => s.openComposer)
  const showNotification = useUIStore((s) => s.showNotification)
  const currentUser = useAuthStore((s) => s.currentUser)
  const queryClient = useQueryClient()

  const [expandedThreadMsgId, setExpandedThreadMsgId] = useState<string | null>(null)

  // Inline reply state
  const [inlineReplyType, setInlineReplyType] = useState<'reply' | 'reply_all' | 'forward' | null>(null)
  const [inlineBodyHtml, setInlineBodyHtml] = useState('')
  const [inlineForwardTo, setInlineForwardTo] = useState('')

  // Reset inline reply when message changes
  useEffect(() => {
    setInlineReplyType(null)
    setInlineBodyHtml('')
    setInlineForwardTo('')
    setExpandedThreadMsgId(null)
  }, [selectedMessageId])

  const { data: message, isLoading } = useQuery({
    queryKey: ['message', selectedMessageId],
    queryFn: () => messages.get(selectedMessageId!),
    enabled: !!selectedMessageId,
  })

  const { data: convData } = useQuery({
    queryKey: ['conversation', message?.conversation_id],
    queryFn: () => conversations.get(message!.conversation_id!),
    enabled: !!message?.conversation_id,
  })

  const threadMessages = (convData?.messages ?? []).filter((m) => m.id !== selectedMessageId)

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

  const openInlineReply = (type: 'reply' | 'reply_all' | 'forward') => {
    if (!message) return
    const draft = draftFromReply(message, type)
    setInlineBodyHtml(draft.bodyHtml ?? '')
    setInlineForwardTo('')
    setInlineReplyType(type)
  }

  const composerOpen = useUIStore((s) => s.composerOpen)

  // Show inline compose when composer is open
  if (composerOpen) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white" data-automation-id="MailReadCompose">
        <ComposeInline />
      </div>
    )
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

  // Build chronological thread
  const allThreadMsgs = threadMessages.length > 0
    ? [...threadMessages, message].sort((a, b) =>
        new Date(a.received_at ?? a.created_at).getTime() - new Date(b.received_at ?? b.created_at).getTime()
      )
    : [message]

  // Current user's email for "You replied on..." detection
  const currentUserEmail = currentUser?.email ?? ''
  const isSentByCurrentUser = (msg: Message) => msg.from_address === currentUserEmail

  return (
    <div className="flex h-full">
    <div
      className="flex flex-col flex-1 min-w-0 bg-white"
      data-automation-id="MailReadCompose"
      aria-label="Reading pane"
    >
      {/* Message content — scrollable area */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar">
        <div className="px-6 py-4">
          {/* Subject bar */}
          <h1 className="text-xl font-semibold text-[#323130] mb-4 pb-2 border-b border-[#EDEBE9]">
            {message.subject || '(no subject)'}
          </h1>

          {/* Thread messages — Outlook-style cards */}
          {allThreadMsgs.map((msg, idx) => {
            const isLast = idx === allThreadMsgs.length - 1
            const senderName = msg.from_name || msg.from_address.split('@')[0]
            const isMine = isSentByCurrentUser(msg)
            const isCollapsed = !isLast && isMine && expandedThreadMsgId !== msg.id
            const toDisplay = msg.to_addresses?.map((a: { email: string; name?: string }) => {
              if (a.email === currentUserEmail) return 'You'
              return a.name || a.email
            }).join(', ')

            // Look ahead: if NEXT message is from current user, show "You replied on..." bar after this card
            const nextMsg = allThreadMsgs[idx + 1]
            const nextIsMine = nextMsg && isSentByCurrentUser(nextMsg)
            const showReplyBar = nextIsMine && expandedThreadMsgId !== nextMsg.id

            // Collapsed — just show the "You replied on..." bar (rendered by the PREVIOUS message's showReplyBar)
            if (isCollapsed) return null

            return (
              <div key={msg.id} className="mb-3">
                {/* Message card */}
                <div className="border border-[#EDEBE9] rounded-lg bg-white">
                  {/* Header row: Avatar + Sender + Action icons */}
                  <div className="flex items-start gap-3 px-4 pt-4 pb-1">
                    <Avatar name={senderName} size="md" />
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Sender name + action icons */}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm text-[#323130]">
                          <EmailLink email={msg.from_address} name={msg.from_name} />
                        </h3>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => openInlineReply('reply')} title="Reply" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><Reply size={15} /></button>
                          <button onClick={() => openInlineReply('reply_all')} title="Reply all" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><ReplyAll size={15} /></button>
                          <button onClick={() => openComposer(draftFromReply(msg, 'forward'))} title="Forward" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><Forward size={15} /></button>
                          <button title="Schedule meeting" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><CalendarDays size={15} /></button>
                          <button title="More apps" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><LayoutGrid size={15} /></button>
                          <button title="More actions" className="text-[#605E5C] hover:text-[#323130] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><MoreHorizontal size={15} /></button>
                        </div>
                      </div>
                      {/* Row 2: To: ... + date */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#605E5C]">
                          To: {toDisplay}
                        </p>
                        <span className="text-xs text-[#605E5C] flex-shrink-0">
                          {formatOutlookDate(msg.received_at ?? msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>


                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="px-4 pt-2 ml-[52px]">
                      <AttachmentBar attachments={msg.attachments} />
                    </div>
                  )}

                  {/* Body */}
                  <div
                    className="px-4 pb-3 pt-2 ml-[52px] text-sm text-[#323130] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: trimQuotedReply(msg.body_html ?? msg.body_text?.replace(/\n/g, '<br/>') ?? '')
                    }}
                  />

                  {/* Blue "..." dots — Outlook style */}
                  <div className="px-4 pb-3 ml-[52px]">
                    <button className="text-[#0078D4] text-lg font-bold leading-none tracking-widest hover:opacity-70 transition-opacity" title="Show quoted text">
                      &middot;&middot;&middot;
                    </button>
                  </div>

                  {/* Reply / Forward buttons — only on last message */}
                  {isLast && !inlineReplyType && (
                    <div className="px-4 pb-4 ml-[52px] flex items-center gap-2">
                      <button
                        onClick={() => openInlineReply('reply')}
                        className="flex items-center gap-1.5 text-sm text-[#323130] border border-[#8A8886] rounded px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors"
                      >
                        <Reply size={14} className="text-[#605E5C]" /> Reply
                      </button>
                      <button
                        onClick={() => openComposer(draftFromReply(msg, 'forward'))}
                        className="flex items-center gap-1.5 text-sm text-[#323130] border border-[#8A8886] rounded px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors"
                      >
                        <Forward size={14} className="text-[#605E5C]" /> Forward
                      </button>
                    </div>
                  )}
                </div>

                {/* "You replied on..." info bar — Outlook style thin bar */}
                {showReplyBar && (
                  <button
                    onClick={() => setExpandedThreadMsgId(nextMsg.id)}
                    className="flex items-center gap-2.5 w-full pl-4 py-2 mt-2 text-left hover:bg-[#F3F2F1] rounded transition-colors"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#0078D4] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[9px] font-bold">i</span>
                    </span>
                    <span className="text-xs text-[#605E5C]">
                      You replied on {formatOutlookDate(nextMsg.sent_at ?? nextMsg.received_at ?? nextMsg.created_at)}
                    </span>
                  </button>
                )}

                {/* Separator line between messages (not after last) */}
                {!isLast && !showReplyBar && <div className="h-px bg-[#EDEBE9] my-1" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Inline reply editor — pinned at bottom */}
      {inlineReplyType && (
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
      )}
    </div>

    </div>
  )
}
