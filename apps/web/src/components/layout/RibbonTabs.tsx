'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMailStore } from '@/store/mail'
import { useUIStore, draftFromReply } from '@/store/ui'
import { messages, folders, quickSteps, settings } from '@/lib/api'
import {
  Menu, Reply, ReplyAll, Forward, Trash2, Archive, MailOpen, Zap,
  ChevronDown, Flag, FolderInput, Printer, MoreHorizontal,
  PanelRight, PanelBottom, PanelLeftClose, MessageSquare,
  RotateCcw, HelpCircle, BookOpen, ExternalLink,
  CalendarPlus, CalendarDays, CalendarRange, Share2,
  UserPlus, Pencil, Star, Plus, CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Shared ribbon button ────────────────────────────────────────────────────
function RibbonBtn({
  onClick, disabled, label, children, active,
}: {
  onClick?: () => void; disabled?: boolean; label: string; children: React.ReactNode; active?: boolean
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      aria-label={label} title={label}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 px-2 py-0.5 rounded text-[11px] transition-colors min-w-[42px] h-full',
        disabled ? 'text-[#A19F9D] cursor-not-allowed'
          : active ? 'bg-[#EBF3FB] text-[#0078D4]'
          : 'text-[#323130] hover:bg-[#F3F2F1]',
      )}
    >
      {children}
    </button>
  )
}

function RibbonSep() {
  return <div className="w-px h-8 bg-[#EDEBE9] mx-0.5 flex-shrink-0" />
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = ['Home', 'View', 'Help'] as const
type Tab = (typeof TABS)[number]

export function RibbonTabs() {
  const pathname = usePathname()
  const isMail = pathname?.startsWith('/mail')
  const isCalendar = pathname?.startsWith('/calendar')
  const isContacts = pathname?.startsWith('/contacts')
  const isTasks = pathname?.startsWith('/tasks')
  const [activeTab, setActiveTab] = useState<Tab>('Home')
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const fileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fileMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) setFileMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [fileMenuOpen])

  return (
    <div className="flex flex-col flex-shrink-0">
      {/* Tab bar */}
      <div className="h-8 bg-white border-b border-[#EDEBE9] flex items-center gap-0 px-1">
        <button
          aria-label="Toggle navigation"
          className="w-7 h-7 flex items-center justify-center text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors mr-1"
        >
          <Menu size={16} />
        </button>

        {/* File — opens backstage dropdown, not a tab */}
        <div className="relative" ref={fileMenuRef}>
          <button
            onClick={() => setFileMenuOpen((v) => !v)}
            aria-expanded={fileMenuOpen}
            aria-haspopup="menu"
            className={cn(
              'px-2 h-7 text-xs transition-colors rounded-sm',
              fileMenuOpen ? 'bg-[#0078D4] text-white' : 'text-[#605E5C] hover:bg-[#F3F2F1]',
            )}
          >
            File
          </button>
          {fileMenuOpen && (
            <div role="menu" className="absolute left-0 top-full mt-0.5 z-50 w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in">
              <div className="px-3 py-2 border-b border-[#EDEBE9]">
                <p className="text-xs font-semibold text-[#323130]">Account Information</p>
                <p className="text-[11px] text-[#605E5C] mt-0.5">frank.miller@acmecorp.com</p>
              </div>
              <button role="menuitem" onClick={() => { useUIStore.getState().openSettings(); setFileMenuOpen(false) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                Options
              </button>
              <button role="menuitem" onClick={() => { useUIStore.getState().openSettings('oof'); setFileMenuOpen(false) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                Automatic Replies
              </button>
              <button role="menuitem" onClick={() => { useUIStore.getState().openSettings('rules'); setFileMenuOpen(false) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                Manage Rules
              </button>
              <div className="h-px bg-[#EDEBE9] my-1" />
              <button role="menuitem" onClick={() => { window.print(); setFileMenuOpen(false) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                Print
              </button>
            </div>
          )}
        </div>

        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setFileMenuOpen(false) }}
            aria-selected={activeTab === tab}
            role="tab"
            className={cn(
              'px-2.5 h-8 text-xs transition-colors relative',
              activeTab === tab
                ? 'text-[#0078D4] font-semibold after:absolute after:bottom-0 after:left-0.5 after:right-0.5 after:h-[2px] after:bg-[#0078D4] after:rounded-t'
                : 'text-[#323130] hover:bg-[#F3F2F1]',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab panel content — changes per section */}
      {isMail && activeTab === 'Home' && <HomeRibbon />}
      {isMail && activeTab === 'View' && <ViewRibbon />}
      {isCalendar && activeTab === 'Home' && <CalendarHomeRibbon />}
      {isContacts && activeTab === 'Home' && <ContactsHomeRibbon />}
      {isTasks && activeTab === 'Home' && <TasksHomeRibbon />}
      {activeTab === 'Help' && <HelpRibbon />}
    </div>
  )
}

// ─── Home Tab (mail toolbar) ─────────────────────────────────────────────────
function HomeRibbon() {
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const openComposer = useUIStore((s) => s.openComposer)
  const showNotification = useUIStore((s) => s.showNotification)
  const queryClient = useQueryClient()
  const [qsOpen, setQsOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const qsRef = useRef<HTMLDivElement>(null)
  const moveRef = useRef<HTMLDivElement>(null)

  const { data: message } = useQuery({
    queryKey: ['message', selectedMessageId],
    queryFn: () => messages.get(selectedMessageId!),
    enabled: !!selectedMessageId,
  })

  const { data: quickStepList = [] } = useQuery({
    queryKey: ['quick-steps'],
    queryFn: () => quickSteps.list(),
  })

  const { data: folderList = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  useEffect(() => {
    if (!qsOpen) return
    const handler = (e: MouseEvent) => {
      if (qsRef.current && !qsRef.current.contains(e.target as Node)) setQsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [qsOpen])

  useEffect(() => {
    if (!moveOpen) return
    const handler = (e: MouseEvent) => {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) setMoveOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moveOpen])

  const deleteMutation = useMutation({
    mutationFn: () => messages.delete(selectedMessageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setSelectedMessageId(null)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const archiveFolder = folderList.find((f) => f.slug === 'archive')
      if (archiveFolder) return messages.move(selectedMessageId!, archiveFolder.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setSelectedMessageId(null)
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

  const flagMutation = useMutation({
    mutationFn: () => messages.update(selectedMessageId!, { is_flagged: !message?.is_flagged }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const moveMutation = useMutation({
    mutationFn: (folderId: string) => messages.move(selectedMessageId!, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setSelectedMessageId(null)
      setMoveOpen(false)
    },
  })

  const runQsMutation = useMutation({
    mutationFn: (qsId: string) => quickSteps.run(qsId, selectedMessageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setQsOpen(false)
      showNotification('Quick step applied')
    },
  })

  const hasMsg = !!selectedMessageId

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto" role="toolbar" aria-label="Home toolbar">
      {/* New mail */}
      <div className="flex items-center mr-1 flex-shrink-0">
        <button onClick={() => openComposer()} aria-label="New mail"
          className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-xs font-medium pl-3 pr-2 h-7 rounded-l transition-colors">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="0.5" y="2.5" width="13" height="9" rx="1" stroke="white" strokeWidth="1.2"/><path d="M1 4L7 8L13 4" stroke="white" strokeWidth="1.1"/></svg>
          New mail
        </button>
        <button onClick={() => openComposer()} aria-label="New mail options"
          className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-7 px-1 rounded-r border-l border-white/30 transition-colors">
          <ChevronDown size={10} />
        </button>
      </div>

      <RibbonSep />

      {/* Move & delete group */}
      <RibbonBtn disabled={!hasMsg || deleteMutation.isPending} label="Delete" onClick={() => deleteMutation.mutate()}>
        <Trash2 size={15} /><span>Delete</span>
      </RibbonBtn>
      <RibbonBtn disabled={!hasMsg || archiveMutation.isPending} label="Archive" onClick={() => archiveMutation.mutate()}>
        <Archive size={15} /><span>Archive</span>
      </RibbonBtn>
      <div className="relative" ref={moveRef}>
        <RibbonBtn disabled={!hasMsg} label="Move to" onClick={() => setMoveOpen((v) => !v)}>
          <FolderInput size={15} />
          <span className="flex items-center gap-0.5">Move to <ChevronDown size={8} /></span>
        </RibbonBtn>
        {moveOpen && (
          <div className="absolute left-0 top-full mt-0.5 z-50 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1">
            {folderList.map((f) => (
              <button key={f.id} onClick={() => moveMutation.mutate(f.id)}
                className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] truncate">{f.name}</button>
            ))}
          </div>
        )}
      </div>

      <RibbonSep />

      {/* Respond group */}
      <RibbonBtn disabled={!hasMsg} label="Reply" onClick={() => message && openComposer(draftFromReply(message, 'reply'))}>
        <Reply size={15} /><span>Reply</span>
      </RibbonBtn>
      <RibbonBtn disabled={!hasMsg} label="Reply all" onClick={() => message && openComposer(draftFromReply(message, 'reply_all'))}>
        <ReplyAll size={15} /><span>Reply all</span>
      </RibbonBtn>
      <RibbonBtn disabled={!hasMsg} label="Forward" onClick={() => message && openComposer(draftFromReply(message, 'forward'))}>
        <Forward size={15} /><span>Forward</span>
      </RibbonBtn>

      <RibbonSep />

      {/* Tags group */}
      {quickStepList.length > 0 && (
        <div className="relative" ref={qsRef}>
          <RibbonBtn disabled={!hasMsg} label="Quick steps" onClick={() => setQsOpen((v) => !v)}>
            <Zap size={15} />
            <span className="flex items-center gap-0.5">Quick steps <ChevronDown size={8} /></span>
          </RibbonBtn>
          {qsOpen && (
            <div className="absolute left-0 top-full mt-0.5 z-50 w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1">
              {quickStepList.map((qs) => (
                <button key={qs.id} onClick={() => runQsMutation.mutate(qs.id)}
                  className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] truncate flex items-center gap-2">
                  <Zap size={12} className="text-[#0078D4] flex-shrink-0" />{qs.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <RibbonBtn disabled={!hasMsg} label="Read / Unread" onClick={() => markReadMutation.mutate(!message?.is_read)}>
        <MailOpen size={15} /><span>Read / Unread</span>
      </RibbonBtn>
      <RibbonBtn disabled={!hasMsg} label="Flag / Unflag" active={!!message?.is_flagged} onClick={() => flagMutation.mutate()}>
        <Flag size={15} className={message?.is_flagged ? 'text-[#D13438]' : ''} /><span>Flag / Unflag</span>
      </RibbonBtn>

      <RibbonSep />

      {/* Print */}
      <RibbonBtn disabled={!hasMsg} label="Print" onClick={() => window.print()}>
        <Printer size={15} /><span>Print</span>
      </RibbonBtn>

      <RibbonSep />

      {/* Undo */}
      <RibbonBtn disabled label="Undo">
        <RotateCcw size={15} /><span>Undo</span>
      </RibbonBtn>

      {/* Overflow */}
      <div className="ml-auto flex-shrink-0">
        <RibbonBtn label="More commands" disabled={false} onClick={() => {}}>
          <MoreHorizontal size={15} />
        </RibbonBtn>
      </div>
    </div>
  )
}

// ─── View Tab ────────────────────────────────────────────────────────────────
function ViewRibbon() {
  const queryClient = useQueryClient()
  const conversationGrouping = useMailStore((s) => s.conversationGrouping)
  const setConversationGrouping = useMailStore((s) => s.setConversationGrouping)
  const showNotification = useUIStore((s) => s.showNotification)

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => settings.update({ mail: data } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      showNotification('View settings updated')
    },
  })

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto" role="toolbar" aria-label="View toolbar">
      {/* Reading pane position */}
      <RibbonBtn label="Reading pane on right" onClick={() => updateSettingsMutation.mutate({ reading_pane: 'right' })}>
        <PanelRight size={15} /><span>Right</span>
      </RibbonBtn>
      <RibbonBtn label="Reading pane on bottom" onClick={() => updateSettingsMutation.mutate({ reading_pane: 'bottom' })}>
        <PanelBottom size={15} /><span>Bottom</span>
      </RibbonBtn>
      <RibbonBtn label="Reading pane off" onClick={() => updateSettingsMutation.mutate({ reading_pane: 'off' })}>
        <PanelLeftClose size={15} /><span>Off</span>
      </RibbonBtn>

      <RibbonSep />

      {/* Conversation view */}
      <RibbonBtn
        label={conversationGrouping ? 'Turn off conversation view' : 'Turn on conversation view'}
        active={conversationGrouping}
        onClick={() => setConversationGrouping(!conversationGrouping)}
      >
        <MessageSquare size={15} /><span>Conversations</span>
      </RibbonBtn>
    </div>
  )
}

// ─── Help Tab ────────────────────────────────────────────────────────────────
function HelpRibbon() {
  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0" role="toolbar" aria-label="Help toolbar">
      <RibbonBtn label="Help" onClick={() => {}}>
        <HelpCircle size={15} /><span>Help</span>
      </RibbonBtn>
      <RibbonBtn label="Training" onClick={() => {}}>
        <BookOpen size={15} /><span>Training</span>
      </RibbonBtn>
      <RibbonBtn label="What's new" onClick={() => {}}>
        <ExternalLink size={15} /><span>What&apos;s new</span>
      </RibbonBtn>
    </div>
  )
}

// ─── Calendar Home Tab ───────────────────────────────────────────────────────
function CalendarHomeRibbon() {
  const router = useRouter()
  const pathname = usePathname()
  const currentView = pathname?.split('/calendar/')?.[1] ?? 'month'

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto" role="toolbar" aria-label="Calendar toolbar">
      {/* New event */}
      <div className="flex items-center mr-1 flex-shrink-0">
        <button onClick={() => router.push('/calendar/month?new=1')} aria-label="New event"
          className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium pl-3 pr-2 h-7 rounded-l transition-colors">
          <CalendarPlus size={13} /> New event
        </button>
        <button aria-label="New event options"
          className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-7 px-1 rounded-r border-l border-white/30 transition-colors">
          <ChevronDown size={10} />
        </button>
      </div>

      <RibbonSep />

      {/* View buttons */}
      <RibbonBtn label="Day" active={currentView === 'day'} onClick={() => router.push('/calendar/day')}>
        <CalendarDays size={15} /><span>Day</span>
      </RibbonBtn>
      <RibbonBtn label="Work week" active={currentView === 'work-week'} onClick={() => router.push('/calendar/work-week')}>
        <CalendarRange size={15} /><span>Work week</span>
      </RibbonBtn>
      <RibbonBtn label="Week" active={currentView === 'week'} onClick={() => router.push('/calendar/week')}>
        <CalendarDays size={15} /><span>Week</span>
      </RibbonBtn>
      <RibbonBtn label="Month" active={currentView === 'month'} onClick={() => router.push('/calendar/month')}>
        <CalendarRange size={15} /><span>Month</span>
      </RibbonBtn>

      <RibbonSep />

      {/* Share & Print */}
      <RibbonBtn label="Share" onClick={() => {}}>
        <Share2 size={15} /><span>Share</span>
      </RibbonBtn>
      <RibbonBtn label="Print" onClick={() => window.print()}>
        <Printer size={15} /><span>Print</span>
      </RibbonBtn>
    </div>
  )
}

// ─── Contacts Home Tab ───────────────────────────────────────────────────────
function ContactsHomeRibbon() {
  const showNotification = useUIStore((s) => s.showNotification)

  const handleNewContact = () => {
    // Dispatch custom event that the contacts page listens for
    window.dispatchEvent(new CustomEvent('outlook:new-contact'))
  }

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto" role="toolbar" aria-label="Contacts toolbar">
      <div className="flex items-center mr-1 flex-shrink-0">
        <button onClick={handleNewContact} aria-label="New contact"
          className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium pl-3 pr-2 h-7 rounded-l transition-colors">
          <UserPlus size={13} /> New contact
        </button>
        <button aria-label="New contact options"
          className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-7 px-1 rounded-r border-l border-white/30 transition-colors">
          <ChevronDown size={10} />
        </button>
      </div>

      <RibbonSep />

      <RibbonBtn label="Edit" disabled onClick={() => showNotification('Select a contact first')}>
        <Pencil size={15} /><span>Edit</span>
      </RibbonBtn>
      <RibbonBtn label="Delete" disabled onClick={() => showNotification('Select a contact first')}>
        <Trash2 size={15} /><span>Delete</span>
      </RibbonBtn>

      <RibbonSep />

      <RibbonBtn label="Add to favorites" disabled onClick={() => showNotification('Select a contact first')}>
        <Star size={15} /><span>Favorites</span>
      </RibbonBtn>
    </div>
  )
}

// ─── Tasks Home Tab ──────────────────────────────────────────────────────────
function TasksHomeRibbon() {
  const handleNewTask = () => {
    window.dispatchEvent(new CustomEvent('outlook:new-task'))
  }

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto" role="toolbar" aria-label="Tasks toolbar">
      <div className="flex items-center mr-1 flex-shrink-0">
        <button onClick={handleNewTask} aria-label="New task"
          className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-medium pl-3 pr-2 h-7 rounded-l transition-colors">
          <Plus size={13} /> New task
        </button>
        <button aria-label="New task options"
          className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-7 px-1 rounded-r border-l border-white/30 transition-colors">
          <ChevronDown size={10} />
        </button>
      </div>

      <RibbonSep />

      <RibbonBtn label="Complete" disabled onClick={() => {}}>
        <CheckSquare size={15} /><span>Complete</span>
      </RibbonBtn>
      <RibbonBtn label="Delete" disabled onClick={() => {}}>
        <Trash2 size={15} /><span>Delete</span>
      </RibbonBtn>
      <RibbonBtn label="Flag" disabled onClick={() => {}}>
        <Flag size={15} /><span>Flag</span>
      </RibbonBtn>
    </div>
  )
}