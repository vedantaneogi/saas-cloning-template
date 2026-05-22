
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMailStore } from '@/store/mail'
import { useUIStore, draftFromReply } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import { messages, conversations, events, categories as categoriesApi } from '@/lib/api'
import type { Message } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { AttachmentBar } from './AttachmentBar'
import { ComposeModal } from './ComposeModal'

function ComposeInline() {
  const closeComposer = useUIStore((s) => s.closeComposer)
  return <ComposeModal open={true} onClose={closeComposer} inline />
}

function InviteActions({ message }: { message: Message }) {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const currentUserEmail = useAuthStore((s) => s.currentUser?.email?.toLowerCase())
  const [proposeOpen, setProposeOpen] = useState(false)
  const [proposeStart, setProposeStart] = useState('')
  const [proposeEnd, setProposeEnd] = useState('')

  // Pull the event detail so we can show the persisted RSVP state and the full attendee
  // list (Outlook shows this on every invite — invitees see who else is invited).
  const { data: detail } = useQuery({
    queryKey: ['event-detail', message.event_id],
    queryFn: () => events.get(message.event_id!),
    enabled: !!message.event_id,
  })

  const currentUserId = useAuthStore((s) => s.currentUser?.id)
  const isOrganizer = !!detail?.event && detail.event.user_id === currentUserId
  const myAttendee = detail?.attendees?.find(
    (a) => a.email.toLowerCase() === (currentUserEmail ?? '')
  )
  const responded = (myAttendee?.response_status && myAttendee.response_status !== 'none')
    ? myAttendee.response_status
    : null
  const otherInvitees = (detail?.attendees ?? []).filter(
    (a) => a.email.toLowerCase() !== (currentUserEmail ?? '')
  )

  const respondMutation = useMutation({
    mutationFn: (response: 'accepted' | 'tentative' | 'declined') =>
      events.respond(message.event_id!, response),
    onSuccess: (_d, response) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event-detail', message.event_id] })
      showNotification(
        response === 'accepted' ? 'Accepted invitation'
        : response === 'tentative' ? 'Marked tentative'
        : 'Declined invitation'
      )
    },
  })

  const proposeMutation = useMutation({
    mutationFn: () =>
      events.proposeTime(
        message.event_id!,
        new Date(proposeStart).toISOString(),
        new Date(proposeEnd).toISOString(),
      ),
    onSuccess: () => {
      setProposeOpen(false)
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event-detail', message.event_id] })
      showNotification('New time proposed')
    },
  })

  return (
    <div className="mb-3 border border-[#0078D4] bg-[#EBF3FB] rounded p-3 space-y-2">
      <p className="text-xs font-semibold text-[#0078D4] flex items-center gap-1">
        <CalendarDays size={12} /> Calendar invitation
        {isOrganizer ? (
          <span className="ml-2 text-[#605E5C] font-normal">· You're the organizer</span>
        ) : responded ? (
          <span className="ml-2 text-[#605E5C] font-normal">
            · You responded: <strong className="text-[#323130]">{responded}</strong>
          </span>
        ) : null}
      </p>
      {!isOrganizer && myAttendee?.proposed_new_time && (
        <div className="bg-[#FFF4CE] border border-[#F4D58A] rounded p-2 -mt-1">
          <p className="text-xs text-[#8A6116] flex items-center gap-1">
            <Clock size={11} />
            <span>
              You proposed{' '}
              <strong>
                {new Date(myAttendee.proposed_new_time.start_time).toLocaleString(undefined, {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </strong>. Awaiting organizer.
            </span>
          </p>
        </div>
      )}
      {!isOrganizer && (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => respondMutation.mutate('accepted')}
          disabled={respondMutation.isPending}
          className={cn(
            'flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors',
            responded === 'accepted'
              ? 'bg-[#107C10] text-white border-[#107C10]'
              : 'bg-white border-[#107C10] text-[#107C10] hover:bg-[#DFF6DD]'
          )}
        >
          <Check size={11} /> Accept
        </button>
        <button
          type="button"
          onClick={() => respondMutation.mutate('tentative')}
          disabled={respondMutation.isPending}
          className={cn(
            'flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors',
            responded === 'tentative'
              ? 'bg-[#FFB900] text-white border-[#FFB900]'
              : 'bg-white border-[#FFB900] text-[#8A6116] hover:bg-[#FFF4CE]'
          )}
        >
          <HelpCircle size={11} /> Tentative
        </button>
        <button
          type="button"
          onClick={() => respondMutation.mutate('declined')}
          disabled={respondMutation.isPending}
          className={cn(
            'flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors',
            responded === 'declined'
              ? 'bg-[#D13438] text-white border-[#D13438]'
              : 'bg-white border-[#D13438] text-[#D13438] hover:bg-[#FDE7E9]'
          )}
        >
          <X size={11} /> Decline
        </button>
        <button
          type="button"
          onClick={() => setProposeOpen((v) => !v)}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border bg-white border-[#D2D0CE] text-[#323130] hover:bg-[#F3F2F1] transition-colors"
        >
          <Clock size={11} /> Propose new time
        </button>
      </div>
      )}
      {!isOrganizer && proposeOpen && (
        <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-[#C7E0F4]">
          <label className="text-xs text-[#605E5C] flex flex-col">
            Start
            <input
              type="datetime-local"
              aria-label="Proposed start time"
              value={proposeStart}
              onChange={(e) => setProposeStart(e.target.value)}
              className="text-xs border border-[#8A8886] rounded px-2 py-1 mt-0.5"
            />
          </label>
          <label className="text-xs text-[#605E5C] flex flex-col">
            End
            <input
              type="datetime-local"
              aria-label="Proposed end time"
              value={proposeEnd}
              onChange={(e) => setProposeEnd(e.target.value)}
              className="text-xs border border-[#8A8886] rounded px-2 py-1 mt-0.5"
            />
          </label>
          <button
            type="button"
            onClick={() => proposeMutation.mutate()}
            disabled={!proposeStart || !proposeEnd || proposeMutation.isPending}
            className="text-xs bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white px-2.5 py-1 rounded"
          >
            Send proposal
          </button>
        </div>
      )}
      {otherInvitees.length > 0 && (
        <div className="pt-1 border-t border-[#C7E0F4]">
          <p className="text-xs text-[#605E5C] mb-1">
            {isOrganizer ? 'Invitees:' : 'Other attendees:'}
          </p>
          <div className="flex flex-wrap gap-1">
            {otherInvitees.map((a) => {
              const tone =
                a.response_status === 'accepted' ? 'bg-[#107C10] text-white border-[#107C10]'
                : a.response_status === 'tentative' ? 'bg-[#FFB900] text-white border-[#FFB900]'
                : a.response_status === 'declined' ? 'bg-[#D13438] text-white border-[#D13438]'
                : 'bg-white text-[#605E5C] border-[#D2D0CE]'
              return (
                <span
                  key={a.id}
                  className={cn('text-xs px-2 py-0.5 rounded border', tone)}
                  title={`${a.email}${a.is_organizer ? ' (organizer)' : ''}: ${a.response_status}`}
                >
                  {a.display_name || a.email}
                  {a.is_organizer ? (
                    <span className="ml-1 opacity-80">· organizer</span>
                  ) : (
                    <span className="ml-1 opacity-80">
                      · {a.response_status === 'accepted' ? 'accepted'
                          : a.response_status === 'tentative' ? 'tentative'
                          : a.response_status === 'declined' ? 'declined'
                          : 'pending'}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
import { EmailLink } from './EmailLink'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, formatOutlookDate, trimQuotedReply } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'
import {
  Reply,
  ReplyAll,
  Forward,
  MoreHorizontal,
  Mail,
  MailOpen,
  X,
  CalendarDays,
  LayoutGrid,
  Check,
  HelpCircle,
  Clock,
  Tag,
  Flag,
  Pin,
  Printer,
  Lock,
} from 'lucide-react'

export function ReadingPane() {
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const openComposer = useUIStore((s) => s.openComposer)
  const currentUser = useAuthStore((s) => s.currentUser)
  const queryClient = useQueryClient()

  const [expandedThreadMsgId, setExpandedThreadMsgId] = useState<string | null>(null)

  // More-actions menu state (the ••• button at the right of each msg header).
  const [moreMenuMsgId, setMoreMenuMsgId] = useState<string | null>(null)
  const [moreMenuPos, setMoreMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [catSubOpen, setCatSubOpen] = useState(false)

  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const categorizeMutation = useMutation({
    mutationFn: ({ msgId, categoryIds }: { msgId: string; categoryIds: string[] }) =>
      messages.update(msgId, { category_ids: categoryIds } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['conversation', message?.conversation_id] })
    },
  })

  const toggleMsgCategory = (msg: Message, catId: string) => {
    const current = (msg.categories ?? []).map((c) => c.id)
    const next = current.includes(catId) ? current.filter((id) => id !== catId) : [...current, catId]
    categorizeMutation.mutate({ msgId: msg.id, categoryIds: next })
  }

  const moreActionMutation = useMutation({
    mutationFn: ({ msgId, patch }: { msgId: string; patch: Partial<Message> }) =>
      messages.update(msgId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
    },
  })

  // Close menu on outside click
  useEffect(() => {
    if (!moreMenuMsgId) return
    const handler = (e: MouseEvent) => {
      const tgt = e.target as Element
      if (!tgt.closest?.('[data-more-menu]')) {
        setMoreMenuMsgId(null)
        setCatSubOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreMenuMsgId])

  useEffect(() => {
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

  // Build thread newest-first to match Outlook (selected message floats to the top,
  // older messages render below it so users can scroll into the history.)
  const allThreadMsgs = threadMessages.length > 0
    ? [...threadMessages, message].sort((a, b) =>
        new Date(b.received_at ?? b.created_at).getTime() - new Date(a.received_at ?? a.created_at).getTime()
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
          {/* Encryption banner — top of reading pane, mirrors Outlook's
              "This message is encrypted" pill. Shown for any encrypt_mode
              other than 'none'. The label name comes from the encrypt mode
              the sender picked. */}
          {message.encrypt_mode && message.encrypt_mode !== 'none' && (() => {
            const ENCRYPT_LABELS: Record<Exclude<typeof message.encrypt_mode, 'none'>, string> = {
              company_confidential: 'Acme Corp - Confidential',
              company_confidential_view_only: 'Acme Corp - Confidential View Only',
              do_not_forward: 'Do Not Forward',
              encrypt_only: 'Encrypt',
            }
            return (
              <div
                role="status"
                className="mb-3 rounded border border-[#0078D4] bg-[#EBF3FB] text-[#323130] flex items-center gap-2 px-3 py-2 text-xs"
              >
                <Lock size={14} className="flex-shrink-0 text-[#0078D4]" />
                <span className="flex-1 min-w-0">
                  <span className="font-semibold">{ENCRYPT_LABELS[message.encrypt_mode]}:</span>{' '}
                  This message is encrypted. Recipients can&apos;t remove encryption.
                </span>
              </div>
            )
          })()}

          {/* Subject bar — sensitivity badge mirrors Outlook's classification chip */}
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#EDEBE9]">
            <h1 className="text-xl font-semibold text-[#323130] flex-1 min-w-0">
              {message.subject || '(no subject)'}
            </h1>
            {message.sensitivity && message.sensitivity !== 'normal' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide flex-shrink-0',
                  message.sensitivity === 'personal' && 'bg-[#E1F5E1] text-[#107C10]',
                  message.sensitivity === 'private' && 'bg-[#FFF4CE] text-[#8A6116]',
                  message.sensitivity === 'confidential' && 'bg-[#FDE7E9] text-[#A4262C]',
                )}
                title={`Sensitivity: ${message.sensitivity}`}
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M5 7V5a3 3 0 116 0v2M4 7h8v6H4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {message.sensitivity}
              </span>
            )}
          </div>

          {/* Calendar invitation actions — Accept / Tentative / Decline / Propose */}
          {message.event_id && <InviteActions message={message} />}

          {/* Thread messages — Outlook-style cards (newest first). The currently
              selected message is always expanded; older messages from the current
              user collapse to a "You replied on..." bar that the next-older message
              renders above itself. */}
          {allThreadMsgs.map((msg, idx) => {
            const isSelected = msg.id === selectedMessageId
            const senderName = msg.from_name || msg.from_address.split('@')[0]
            const isMine = isSentByCurrentUser(msg)
            const isCollapsed = !isSelected && isMine && expandedThreadMsgId !== msg.id
            const toDisplay = msg.to_addresses?.map((a: { email: string; name?: string }) => {
              if (a.email === currentUserEmail) return 'You'
              return a.name || a.email
            }).join(', ')
            const ccDisplay = msg.cc_addresses?.map((a: { email: string; name?: string }) => {
              if (a.email === currentUserEmail) return 'You'
              return a.name || a.email
            }).join(', ')
            const bccDisplay = msg.bcc_addresses?.map((a: { email: string; name?: string }) => {
              if (a.email === currentUserEmail) return 'You'
              return a.name || a.email
            }).join(', ')

            // Look at the NEXT-OLDER message (idx + 1 in DESC order). If it's from the
            // current user and collapsed, render the "You replied on..." bar above it.
            const nextMsg = allThreadMsgs[idx + 1]
            const nextIsMine = nextMsg && isSentByCurrentUser(nextMsg)
            const showReplyBar = nextIsMine && expandedThreadMsgId !== nextMsg.id && nextMsg.id !== selectedMessageId

            // Collapsed — its "You replied on..." bar is rendered by its NEWER neighbour's showReplyBar.
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
                          <button onClick={() => openComposer(draftFromReply(message, 'reply'))} title="Reply" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><Reply size={15} /></button>
                          <button onClick={() => openComposer(draftFromReply(message, 'reply_all'))} title="Reply all" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><ReplyAll size={15} /></button>
                          <button onClick={() => openComposer(draftFromReply(msg, 'forward'))} title="Forward" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><Forward size={15} /></button>
                          <button title="Schedule meeting" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><CalendarDays size={15} /></button>
                          <button title="More apps" className="text-[#605E5C] hover:text-[#0078D4] p-1 rounded hover:bg-[#F3F2F1] transition-colors"><LayoutGrid size={15} /></button>
                          <button
                            title="More actions"
                            data-more-menu
                            onClick={(e) => {
                              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              setMoreMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 220) })
                              setMoreMenuMsgId((cur) => (cur === msg.id ? null : msg.id))
                              setCatSubOpen(false)
                            }}
                            className="text-[#605E5C] hover:text-[#323130] p-1 rounded hover:bg-[#F3F2F1] transition-colors"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                        </div>
                      </div>
                      {/* Row 2: To: ... + date. Cc rendered on its own line below
                          when present, mirroring Outlook's reading-pane header. */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#605E5C]">
                          <span className="font-medium text-[#323130]">To:</span> {toDisplay}
                        </p>
                        <span className="text-xs text-[#605E5C] flex-shrink-0">
                          {formatOutlookDate(msg.received_at ?? msg.created_at)}
                        </span>
                      </div>
                      {ccDisplay && (
                        <p className="text-xs text-[#605E5C] mt-0.5">
                          <span className="font-medium text-[#323130]">Cc:</span> {ccDisplay}
                        </p>
                      )}
                      {/* Bcc only ever populates on the sender's copy (the delivery
                          path strips it for everyone else), so this line surfaces who
                          you BCC'd when reviewing your sent items. */}
                      {bccDisplay && (
                        <p className="text-xs text-[#605E5C] mt-0.5">
                          <span className="font-medium text-[#323130]">Bcc:</span> {bccDisplay}
                        </p>
                      )}
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
                      __html: sanitizeHtml(trimQuotedReply(msg.body_html ?? msg.body_text?.replace(/\n/g, '<br/>') ?? ''))
                    }}
                  />

                  {/* Blue "..." dots — Outlook style */}
                  <div className="px-4 pb-3 ml-[52px]">
                    <button className="text-[#0078D4] text-lg font-bold leading-none tracking-widest hover:opacity-70 transition-opacity" title="Show quoted text">
                      &middot;&middot;&middot;
                    </button>
                  </div>

                  {/* Reply / Forward buttons — only on the selected (top, newest) message */}
                  {isSelected && (
                    <div className="px-4 pb-4 ml-[52px] flex items-center gap-2">
                      <button
                        onClick={() => openComposer(draftFromReply(msg, 'reply'))}
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

                {/* Separator line between messages (skip after the oldest) */}
                {idx < allThreadMsgs.length - 1 && !showReplyBar && <div className="h-px bg-[#EDEBE9] my-1" />}
              </div>
            )
          })}
        </div>
      </div>

    </div>

    {/* More-actions popover — portal so it floats above any overflow clipping. */}
    {moreMenuMsgId && typeof window !== 'undefined' && (() => {
      const targetMsg = allThreadMsgs.find((m) => m.id === moreMenuMsgId) ?? message
      if (!targetMsg) return null
      const msgCatIds = new Set((targetMsg.categories ?? []).map((c) => c.id))
      return createPortal(
        <div
          data-more-menu
          style={{ top: moreMenuPos.top, left: moreMenuPos.left }}
          className="fixed z-[9999] w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1"
        >
          <button
            onClick={() => {
              moreActionMutation.mutate({ msgId: targetMsg.id, patch: { is_read: !targetMsg.is_read } })
              setMoreMenuMsgId(null)
            }}
            className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130]"
          >
            <MailOpen size={13} className="text-[#605E5C]" />
            {targetMsg.is_read ? 'Mark as unread' : 'Mark as read'}
          </button>
          <button
            onClick={() => {
              moreActionMutation.mutate({ msgId: targetMsg.id, patch: { is_flagged: !targetMsg.is_flagged } })
              setMoreMenuMsgId(null)
            }}
            className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130]"
          >
            <Flag size={13} className="text-[#605E5C]" />
            {targetMsg.is_flagged ? 'Unflag' : 'Flag'}
          </button>
          <button
            onClick={() => {
              moreActionMutation.mutate({ msgId: targetMsg.id, patch: { is_pinned: !targetMsg.is_pinned } as never })
              setMoreMenuMsgId(null)
            }}
            className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130]"
          >
            <Pin size={13} className="text-[#605E5C]" />
            {targetMsg.is_pinned ? 'Unpin' : 'Pin to top'}
          </button>

          <div className="h-px bg-[#EDEBE9] my-1" />

          {/* Categorize submenu */}
          <div
            className="relative"
            onMouseEnter={() => setCatSubOpen(true)}
          >
            <button
              onClick={() => setCatSubOpen((v) => !v)}
              className="w-full flex items-center justify-between text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130]"
            >
              <span className="flex items-center gap-2">
                <Tag size={13} className="text-[#605E5C]" />
                Categorize
              </span>
              <span className="text-[#605E5C]">›</span>
            </button>
            {catSubOpen && (
              <div className="absolute right-full top-0 mr-1 w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 max-h-64 overflow-y-auto">
                {categoryList.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[#A19F9D] italic">No categories yet</p>
                ) : (
                  categoryList.map((c) => {
                    const checked = msgCatIds.has(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleMsgCategory(targetMsg, c.id)}
                        className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130]"
                      >
                        <Tag size={12} style={{ color: c.color }} />
                        <span className="flex-1 truncate">{c.name}</span>
                        {checked && <span className="text-[#0078D4] text-xs">✓</span>}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-[#EDEBE9] my-1" />

          <button
            onClick={() => { window.print(); setMoreMenuMsgId(null) }}
            className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] text-[#323130]"
          >
            <Printer size={13} className="text-[#605E5C]" />
            Print
          </button>
        </div>,
        document.body,
      )
    })()}
    </div>
  )
}
