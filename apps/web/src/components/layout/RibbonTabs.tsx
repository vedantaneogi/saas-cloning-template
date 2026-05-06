'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMailStore } from '@/store/mail'
import { useUIStore, draftFromReply } from '@/store/ui'
import { messages, folders, quickSteps, settings, categories } from '@/lib/api'
import {
  Menu, ReplyAll, Trash2, Archive, MailOpen, Zap,
  ChevronDown, ChevronRight, Flag, FolderInput, Printer, MoreHorizontal,
  PanelRight, PanelBottom, PanelLeftClose, MessageSquare,
  RotateCcw, HelpCircle, BookOpen, ExternalLink,
  CalendarPlus, CalendarDays, CalendarRange, Share2,
  UserPlus, Pencil, Star, Plus, CheckSquare, Users,
  Pin, Clock, Tag,
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
        disabled ? 'text-[#A19F9D] cursor-not-allowed opacity-60'
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
const COMPOSE_TABS = ['Message', 'Insert', 'Format text', 'Draw', 'Options'] as const
type Tab = string

export function RibbonTabs() {
  const pathname = usePathname()
  const composerOpen = useUIStore((s) => s.composerOpen)
  const isMail = pathname?.startsWith('/mail')
  const isCalendar = pathname?.startsWith('/calendar')
  const isContacts = pathname?.startsWith('/contacts')
  const isTasks = pathname?.startsWith('/tasks')
  const isComposing = isMail && composerOpen
  const [activeTab, setActiveTab] = useState<Tab>('Home')

  // Auto-switch to Message tab when composing starts, back to Home when it ends
  useEffect(() => {
    if (isComposing) setActiveTab('Message')
    else if (activeTab === 'Message' || activeTab === 'Insert' || activeTab === 'Format text' || activeTab === 'Draw' || activeTab === 'Options') {
      setActiveTab('Home')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComposing])
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
    <div className="flex flex-col flex-shrink-0 relative z-10">
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

        {isComposing ? (
          // Compose tabs: Message, Insert, Format text, Draw, Options
          COMPOSE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab as Tab); setFileMenuOpen(false) }}
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
          ))
        ) : (
          TABS.map((tab) => (
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
          ))
        )}
      </div>

      {/* Tab panel content — changes per section */}
      {isComposing ? (
        // Compose toolbar — formatting options shown in the ribbon area
        activeTab === 'Message' ? <ComposeMessageRibbon /> : null
      ) : (
        <>
          {isMail && activeTab === 'Home' && <HomeRibbon />}
          {isMail && activeTab === 'View' && <ViewRibbon />}
          {isCalendar && activeTab === 'Home' && <CalendarHomeRibbon />}
          {isContacts && activeTab === 'Home' && <ContactsHomeRibbon />}
          {isTasks && activeTab === 'Home' && <TasksHomeRibbon />}
          {activeTab === 'Help' && <HelpRibbon />}
        </>
      )}
    </div>
  )
}

// ─── Compose Message Ribbon (shown when composing inline) ────────────────────
function ComposeMessageRibbon() {
  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto" role="toolbar" aria-label="Formatting toolbar">
      {/* Font controls placeholder */}
      <span className="text-xs text-[#605E5C] px-2">Aptos</span>
      <select className="text-xs border border-[#EDEBE9] rounded px-1 py-0.5 text-[#323130] bg-white focus:outline-none w-12">
        <option>12</option><option>10</option><option>11</option><option>14</option><option>16</option><option>18</option><option>24</option>
      </select>
      <RibbonSep />
      <RibbonBtn label="Bold"><span className="font-bold text-sm">B</span></RibbonBtn>
      <RibbonBtn label="Italic"><span className="italic text-sm">I</span></RibbonBtn>
      <RibbonBtn label="Underline"><span className="underline text-sm">U</span></RibbonBtn>
      <RibbonBtn label="Strikethrough"><span className="line-through text-sm">S</span></RibbonBtn>
      <RibbonSep />
      <RibbonBtn label="Text color">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M4 12h8M6 2l-4 9h2l1-2.5h6L12 11h2L10 2H6z" stroke="currentColor" strokeWidth="1.1"/><rect x="2" y="13" width="12" height="2" fill="#D13438" rx="0.5"/></svg>
      </RibbonBtn>
      <RibbonBtn label="Highlight">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 12h10M5 3l6 8H5V3z" fill="#FFD700" stroke="currentColor" strokeWidth="0.8"/></svg>
      </RibbonBtn>
      <RibbonSep />
      <RibbonBtn label="Bullets">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="2" cy="3" r="1.2" fill="currentColor"/><circle cx="2" cy="7" r="1.2" fill="currentColor"/><circle cx="2" cy="11" r="1.2" fill="currentColor"/><path d="M5 3h7M5 7h7M5 11h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonBtn label="Numbering">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><text x="0" y="4.5" fontSize="5" fill="currentColor" fontFamily="Arial">1.</text><text x="0" y="8.5" fontSize="5" fill="currentColor" fontFamily="Arial">2.</text><text x="0" y="12.5" fontSize="5" fill="currentColor" fontFamily="Arial">3.</text><path d="M5 3h7M5 7h7M5 11h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonSep />
      <RibbonBtn label="Align left">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M1 6h8M1 9h12M1 12h8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonBtn label="Align center">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M3 6h8M1 9h12M3 12h8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonBtn label="Align right">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M5 6h8M1 9h12M5 12h8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonSep />
      <RibbonBtn label="Link">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M6 8l2-2M4.5 9.5a2.5 2.5 0 010-3.5l1-1a2.5 2.5 0 013.5 0M9.5 4.5a2.5 2.5 0 010 3.5l-1 1a2.5 2.5 0 01-3.5 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
      </RibbonBtn>
      <RibbonBtn label="Insert image">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.1"/><circle cx="4.5" cy="5.5" r="1.2" fill="currentColor"/><path d="M1 10l3-3 2 2 3-3 4 4" stroke="currentColor" strokeWidth="1"/></svg>
      </RibbonBtn>
      <RibbonSep />
      <RibbonBtn label="More formatting">
        <MoreHorizontal size={15} />
      </RibbonBtn>
    </div>
  )
}

// ─── Home Tab (mail toolbar) ─────────────────────────────────────────────────
// ─── Move To dropdown matching Outlook ────────────────────────────────────────
const FOLDER_ICONS: Record<string, React.ReactNode> = {
  inbox: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="9" rx="1" stroke="#605E5C" strokeWidth="1.2"/><path d="M1.5 8.5h4l1.5 2h2l1.5-2h4" stroke="#605E5C" strokeWidth="1.2"/></svg>,
  deleted: <Trash2 size={14} className="text-[#605E5C]" />,
  archive: <Archive size={14} className="text-[#605E5C]" />,
  junk: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="#605E5C" strokeWidth="1.1"/><path d="M8 6v3M8 11v.5" stroke="#605E5C" strokeWidth="1.2" strokeLinecap="round"/></svg>,
}

function MoveToDropdown({ folders: foldersList, onMove, onClose, anchorRef }: {
  folders: { id: string; name: string; slug: string; is_system?: boolean }[]
  onMove: (folderId: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLDivElement | null>
}) {
  const [search, setSearch] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  // Calculate fixed position from anchor
  const rect = anchorRef.current?.getBoundingClientRect()
  const top = rect ? rect.bottom + 2 : 0
  const left = rect ? rect.left : 0

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => folders.create({ name }),
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      onMove(newFolder.id)
      onClose()
    },
  })

  const filtered = search.trim()
    ? foldersList.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : foldersList

  // Separate user folders from system ones for display order
  const userFolders = filtered.filter((f) => !f.is_system)
  const systemFolders = filtered.filter((f) => f.is_system)
  const displayFolders = [...userFolders, ...systemFolders]

  return (
    <div ref={dropdownRef} className="fixed z-[100] w-64 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in" style={{ top, left }}>
      {/* Search */}
      <div className="px-2 py-2 border-b border-[#EDEBE9]">
        <div className="flex items-center gap-2 border border-[#EDEBE9] rounded px-2 py-1.5">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#A19F9D" strokeWidth="1.3"/><path d="M11 11l3.5 3.5" stroke="#A19F9D" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for a folder"
            className="flex-1 text-xs text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Folder list */}
      <div className="max-h-40 overflow-y-auto outlook-scrollbar py-1">
        {displayFolders.map((f) => (
          <button key={f.id} onClick={() => { onMove(f.id); onClose() }}
            className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors truncate">
            {FOLDER_ICONS[f.slug] ?? <FolderInput size={14} className="text-[#605E5C] flex-shrink-0" />}
            {f.name}
          </button>
        ))}
        {displayFolders.length === 0 && (
          <p className="px-3 py-2 text-xs text-[#A19F9D]">No folders match</p>
        )}
      </div>

      {/* Create new folder */}
      <div className="px-3 py-1.5 border-t border-[#EDEBE9]">
        {creatingFolder ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim())
                if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') }
              }}
              placeholder="Folder name"
              className="flex-1 text-xs text-[#323130] border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
            />
            <button
              onClick={() => { if (newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim()) }}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              className="text-xs text-[#0078D4] font-medium px-2 py-1 hover:bg-[#EBF3FB] rounded disabled:opacity-40 transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <button onClick={() => setCreatingFolder(true)}
            className="w-full flex items-center gap-2 text-left text-sm text-[#323130] py-1 hover:text-[#0078D4] transition-colors">
            <Plus size={14} className="text-[#605E5C]" /> Create new folder
          </button>
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-[#EDEBE9] py-1">
        <button onClick={() => {
          showNotification('Moved to Other inbox')
          onClose()
        }}
          className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors">
          Move to Other inbox
        </button>
        <button onClick={() => {
          showNotification('Future messages will go to Other inbox')
          onClose()
        }}
          className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors">
          Always move to Other inbox
        </button>
        <button onClick={() => {
          // Just re-focus the search to let user pick a folder
          setSearch('')
        }}
          className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors">
          Move to a different folder...
        </button>
      </div>
    </div>
  )
}

function HomeRibbon() {
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const openComposer = useUIStore((s) => s.openComposer)
  const showNotification = useUIStore((s) => s.showNotification)
  const queryClient = useQueryClient()
  const [qsOpen, setQsOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [snoozeToolbarOpen, setSnoozeToolbarOpen] = useState(false)
  const snoozeToolbarRef = useRef<HTMLDivElement>(null)
  const qsRef = useRef<HTMLDivElement>(null)
  const moveRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)

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
    if (!snoozeToolbarOpen) return
    const handler = (e: MouseEvent) => {
      if (snoozeToolbarRef.current && !snoozeToolbarRef.current.contains(e.target as Node)) setSnoozeToolbarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [snoozeToolbarOpen])

  useEffect(() => {
    if (!reportOpen) return
    const handler = (e: MouseEvent) => {
      if (reportRef.current && !reportRef.current.contains(e.target as Node)) setReportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [reportOpen])

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

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      // Fetch all unread messages in current folder and mark them read
      const data = await messages.list({ folder_id: useMailStore.getState().selectedFolderId ?? undefined, is_read: false, per_page: 200 })
      const ids = (data?.items ?? []).map((m: { id: string }) => m.id)
      if (ids.length > 0) return messages.bulk('mark_read', ids)
    },
    onSuccess: () => {
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

  const pinMutation = useMutation({
    mutationFn: () => messages.update(selectedMessageId!, { is_pinned: !message?.is_pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const reportMutation = useMutation({
    mutationFn: (type: 'junk' | 'phishing') => messages.report(selectedMessageId!, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setSelectedMessageId(null)
      setReportOpen(false)
      showNotification('Message reported')
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

  const snoozeMutation = useMutation({
    mutationFn: (snoozeUntil: string | null) => messages.update(selectedMessageId!, { snooze_until: snoozeUntil } as never),
    onSuccess: (_, snoozeUntil) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['message', selectedMessageId] })
      showNotification(snoozeUntil ? 'Message snoozed' : 'Snooze removed')
    },
  })

  const selectedFolderSlug = useMailStore((s) => s.selectedFolderSlug)
  const isSentFolder = selectedFolderSlug === 'sent'

  const selectedMessageIds = useMailStore((s) => s.selectedMessageIds)
  const hasMsg = !!selectedMessageId || selectedMessageIds.size > 0

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

      {/* Delete — with dropdown chevron when selected */}
      {hasMsg ? (
        <RibbonBtn disabled={deleteMutation.isPending} label="Delete" onClick={() => deleteMutation.mutate()}>
          <Trash2 size={15} /><span className="flex items-center gap-0.5">Delete <ChevronDown size={8} /></span>
        </RibbonBtn>
      ) : (
        <RibbonBtn disabled label="Delete">
          <Trash2 size={15} /><span>Delete</span>
        </RibbonBtn>
      )}

      {/* Archive */}
      <RibbonBtn disabled={!hasMsg || archiveMutation.isPending} label="Archive" onClick={() => archiveMutation.mutate()}>
        <Archive size={15} /><span>Archive</span>
      </RibbonBtn>

      {/* Report — with dropdown when selected */}
      <div className="relative" ref={reportRef}>
        <RibbonBtn disabled={!hasMsg} label="Report" onClick={() => hasMsg ? setReportOpen((v) => !v) : undefined}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l6.5 12H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M8 6v3M8 11v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <span>Report</span>
        </RibbonBtn>
        {reportOpen && (
          <div className="absolute left-0 top-full mt-0.5 z-50 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in">
            <button onClick={() => reportMutation.mutate('phishing')}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Report phishing</button>
            <button onClick={() => reportMutation.mutate('junk')}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Report junk</button>
            <button onClick={() => { showNotification('Marked as not junk'); setReportOpen(false) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Not junk</button>
          </div>
        )}
      </div>

      {/* Move to — with dropdown */}
      <div className="relative" ref={moveRef}>
        <RibbonBtn disabled={!hasMsg} label="Move to" onClick={() => setMoveOpen((v) => !v)}>
          <FolderInput size={15} />
          <span className="flex items-center gap-0.5">Move to <ChevronDown size={8} /></span>
        </RibbonBtn>
        {moveOpen && (
          <MoveToDropdown
            folders={folderList}
            onMove={(folderId) => moveMutation.mutate(folderId)}
            onClose={() => setMoveOpen(false)}
            anchorRef={moveRef}
          />
        )}
      </div>

      <RibbonSep />

      {/* Respond group — Reply all shown always */}
      <RibbonBtn disabled={!hasMsg} label="Reply all" onClick={() => message && openComposer(draftFromReply(message, 'reply_all'))}>
        <ReplyAll size={15} />
        {hasMsg ? (
          <span className="flex items-center gap-0.5">Reply all <ChevronDown size={8} /></span>
        ) : (
          <span>Reply all</span>
        )}
      </RibbonBtn>

      <RibbonSep />

      {/* State-dependent: Mark all as read (no selection) vs Read/Unread + Flag/Unflag (selected) */}
      {hasMsg ? (
        <>
          <RibbonBtn label="Read / Unread" onClick={() => markReadMutation.mutate(!message?.is_read)}>
            <MailOpen size={15} /><span>Read / Unread</span>
          </RibbonBtn>
          <RibbonBtn label="Flag / Unflag" active={!!message?.is_flagged} onClick={() => flagMutation.mutate()}>
            <Flag size={15} className={message?.is_flagged ? 'text-[#D13438]' : ''} />
            <span className="flex items-center gap-0.5">Flag / Unflag <ChevronDown size={8} /></span>
          </RibbonBtn>

          {/* Snooze — not shown for sent folder */}
          {!isSentFolder && (
            <div className="relative" ref={snoozeToolbarRef}>
              <RibbonBtn label="Snooze" active={!!message?.snooze_until} onClick={() => setSnoozeToolbarOpen((v) => !v)}>
                <Clock size={15} className={message?.snooze_until ? 'text-[#0078D4]' : ''} />
                <span className="flex items-center gap-0.5">Snooze <ChevronDown size={8} /></span>
              </RibbonBtn>
              {snoozeToolbarOpen && (
                <div className="absolute left-0 top-full mt-0.5 z-50 w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in">
                  <p className="px-3 py-1.5 text-xs font-semibold text-[#605E5C] border-b border-[#EDEBE9]">Snooze until</p>
                  {[
                    { label: 'Later today (3 hours)', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 3); return d.toISOString() } },
                    { label: 'Tomorrow morning', getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString() } },
                    { label: 'This weekend', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (6 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
                    { label: 'Next week', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (8 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
                  ].map((opt) => (
                    <button key={opt.label} onClick={() => { snoozeMutation.mutate(opt.getTime()); setSnoozeToolbarOpen(false) }}
                      className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">{opt.label}</button>
                  ))}
                  {message?.snooze_until && (
                    <>
                      <div className="h-px bg-[#EDEBE9] my-1" />
                      <button onClick={() => { snoozeMutation.mutate(null); setSnoozeToolbarOpen(false) }}
                        className="w-full text-left text-sm text-[#D13438] px-3 py-1.5 hover:bg-[#FDE7E9]">Remove snooze</button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <RibbonBtn label="Mark all as read" onClick={() => markAllReadMutation.mutate()}>
          <MailOpen size={15} /><span>Mark all as read</span>
        </RibbonBtn>
      )}

      {/* Quick steps */}
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

      <RibbonSep />

      {/* Undo */}
      <RibbonBtn disabled label="Undo">
        <RotateCcw size={15} /><span>Undo</span>
      </RibbonBtn>

      {/* Overflow — categorized dropdown matching Outlook */}
      <div className="ml-auto flex-shrink-0">
        <button
          ref={moreRef}
          type="button"
          onClick={() => setMoreOpen((v: boolean) => !v)}
          aria-label="More commands"
          title="More commands"
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-0.5 rounded text-[11px] transition-colors min-w-[42px] h-full text-[#323130] hover:bg-[#F3F2F1]"
        >
          <MoreHorizontal size={15} />
        </button>
        {moreOpen && (
          <MoreDropdown
            hasMsg={hasMsg}
            message={message}
            anchorRef={moreRef}
            onPin={() => { if (hasMsg) pinMutation.mutate(); setMoreOpen(false) }}
            onSnooze={(time: string | null) => { if (hasMsg) snoozeMutation.mutate(time); setMoreOpen(false) }}
            onBlock={() => {
              if (hasMsg) {
                messages.block(selectedMessageId!).then((res) => {
                  queryClient.invalidateQueries({ queryKey: ['messages'] })
                  queryClient.invalidateQueries({ queryKey: ['folders'] })
                  showNotification(`Blocked sender — ${res.moved} messages moved to Junk`)
                })
              }
              setMoreOpen(false)
            }}
            onPrint={() => { window.print(); setMoreOpen(false) }}
            onClose={() => setMoreOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

// ─── More (...) dropdown — categorized like real Outlook ────────────────────
interface MoreDropdownProps {
  hasMsg: boolean
  message?: { is_flagged?: boolean; is_pinned?: boolean; is_read?: boolean; from_address?: string; snooze_until?: string | null } | null
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onPin: () => void
  onSnooze: (time: string | null) => void
  onBlock: () => void
  onPrint: () => void
  onClose: () => void
}

function MoreDropdown(
  { hasMsg, message, anchorRef, onBlock, onPin, onSnooze, onPrint, onClose }: MoreDropdownProps
) {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [snoozeSubOpen, setSnoozeSubOpen] = useState(false)
  const [rulesSubOpen, setRulesSubOpen] = useState(false)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  // Calculate fixed position from anchor
  const rect = anchorRef.current?.getBoundingClientRect()
  const top = rect ? rect.bottom + 2 : 0
  const right = rect ? window.innerWidth - rect.right : 0

  const snoozeOptions = [
    { label: 'Later today', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 3); return d.toISOString() } },
    { label: 'Tomorrow', getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString() } },
    { label: 'This weekend', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (6 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
    { label: 'Next week', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (8 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
  ]

  return (
    <div ref={dropdownRef} className="fixed z-[100] w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in" style={{ top, right }}>
      {/* Move & delete */}
      <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Move & delete</p>
      <button onClick={onBlock} disabled={!hasMsg}
        className="w-full flex items-center justify-between text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#605E5C" strokeWidth="1.2"/><path d="M4 12L12 4" stroke="#605E5C" strokeWidth="1.2"/></svg>
          Block
        </span>
        {hasMsg && <ChevronRight size={12} className="text-[#605E5C]" />}
      </button>
      <button onClick={() => { useUIStore.getState().showNotification('Sweep applied'); onClose() }} disabled
        className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 12L7 4M7 4L11 12M7 4v8" stroke="#605E5C" strokeWidth="1.2" strokeLinecap="round"/></svg>
        Sweep
      </button>
      {/* Rules submenu */}
      <div className="relative" onMouseEnter={() => setRulesSubOpen(true)} onMouseLeave={() => setRulesSubOpen(false)}>
        <button className="w-full flex items-center justify-between text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
          <span className="flex items-center gap-2">
            <Zap size={14} className="text-[#605E5C]" /> Rules
          </span>
          <ChevronRight size={12} className="text-[#605E5C]" />
        </button>
        {rulesSubOpen && (
          <div className="absolute right-full top-0 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 z-50">
            <button onClick={() => { router.push('/settings/rules'); onClose() }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Create rule</button>
            <button onClick={() => { router.push('/settings/rules'); onClose() }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Manage rules</button>
          </div>
        )}
      </div>

      <div className="h-px bg-[#EDEBE9] my-1" />

      {/* Tags */}
      <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Tags</p>
      <button onClick={() => { useUIStore.getState().showNotification('Categorize'); onClose() }} disabled={!hasMsg}
        className="w-full flex items-center justify-between text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <span className="flex items-center gap-2">
          <Tag size={14} className="text-[#605E5C]" /> Categorize
        </span>
        {hasMsg && <ChevronRight size={12} className="text-[#605E5C]" />}
      </button>

      {hasMsg && (
        <button onClick={onPin}
          className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
          <Pin size={14} className={message?.is_pinned ? 'text-[#FFB900]' : 'text-[#605E5C]'} />
          {message?.is_pinned ? 'Unpin' : 'Pin / Unpin'}
        </button>
      )}

      {/* Snooze submenu */}
      <div className="relative" onMouseEnter={() => setSnoozeSubOpen(true)} onMouseLeave={() => setSnoozeSubOpen(false)}>
        <button disabled={!hasMsg}
          className="w-full flex items-center justify-between text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
          <span className="flex items-center gap-2">
            <Clock size={14} className="text-[#605E5C]" /> Snooze
          </span>
          {hasMsg && <ChevronRight size={12} className="text-[#605E5C]" />}
        </button>
        {snoozeSubOpen && (
          <div className="absolute right-full top-0 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 z-50">
            {snoozeOptions.map((opt) => (
              <button key={opt.label} onClick={() => onSnooze(opt.getTime())} disabled={!hasMsg}
                className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
                {opt.label}
              </button>
            ))}
            {message?.snooze_until && (
              <>
                <div className="h-px bg-[#EDEBE9] my-1" />
                <button onClick={() => onSnooze(null)}
                  className="w-full text-left text-sm text-[#D13438] px-3 py-1.5 hover:bg-[#FDE7E9]">Remove snooze</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-[#EDEBE9] my-1" />

      {/* Print */}
      <p className="px-3 py-1 text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide">Print</p>
      <button onClick={onPrint} disabled={!hasMsg}
        className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-40">
        <Printer size={14} className="text-[#605E5C]" /> Print
      </button>

      <div className="h-px bg-[#EDEBE9] my-1" />

      {/* Customize */}
      <button onClick={() => { useUIStore.getState().openSettings(); onClose() }}
        className="w-full flex items-center gap-2 text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="#605E5C" strokeWidth="1.2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" stroke="#605E5C" strokeWidth="1.2" strokeLinecap="round"/></svg>
        Customize
      </button>
    </div>
  )
}

// ─── View Tab ────────────────────────────────────────────────────────────────
function ViewRibbon() {
  const queryClient = useQueryClient()
  const conversationGrouping = useMailStore((s) => s.conversationGrouping)
  const setConversationGrouping = useMailStore((s) => s.setConversationGrouping)
  const showNotification = useUIStore((s) => s.showNotification)
  const [catFilterOpen, setCatFilterOpen] = useState(false)
  const catFilterRef = useRef<HTMLDivElement>(null)

  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  useEffect(() => {
    if (!catFilterOpen) return
    const handler = (e: MouseEvent) => {
      if (catFilterRef.current && !catFilterRef.current.contains(e.target as Node)) setCatFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [catFilterOpen])

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

      <RibbonSep />

      {/* Category filter */}
      {categoryList.length > 0 && (
        <div className="relative" ref={catFilterRef}>
          <RibbonBtn label="Filter by category" onClick={() => setCatFilterOpen((v) => !v)}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <span>Categories</span>
          </RibbonBtn>
          {catFilterOpen && (
            <div className="absolute left-0 top-full mt-0.5 z-50 w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in">
              {categoryList.map((cat: { id: string; name: string; color: string }) => (
                <button key={cat.id}
                  onClick={() => {
                    // Navigate to search filtered by category
                    showNotification(`Showing ${cat.name} messages`)
                    setCatFilterOpen(false)
                  }}
                  className="w-full flex items-center gap-2 text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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
  const splitView = useUIStore((s) => s.calendarSplitView)
  const setSplitView = useUIStore((s) => s.setCalendarSplitView)
  const calendarFilter = useUIStore((s) => s.calendarFilter)
  const setCalendarFilter = useUIStore((s) => s.setCalendarFilter)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  return (
    <div className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto" role="toolbar" aria-label="Calendar toolbar">
      {/* New event */}
      <div className="flex items-center mr-1 flex-shrink-0">
        <button onClick={() => window.dispatchEvent(new CustomEvent('outlook:new-event'))} aria-label="New event"
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

      {/* Split view */}
      <RibbonBtn label="Split view" active={splitView} onClick={() => setSplitView(!splitView)}>
        <PanelRight size={15} /><span>Split view</span>
      </RibbonBtn>

      {/* Filter */}
      <div className="relative" ref={filterRef}>
        <RibbonBtn label="Filter" active={calendarFilter !== 'all'} onClick={() => setFilterOpen((v) => !v)}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span>{calendarFilter === 'all' ? 'Filter' : 'Filter applied'}</span>
        </RibbonBtn>
        {filterOpen && (
          <div className="absolute left-0 top-full mt-0.5 z-50 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1">
            {([
              ['all', 'Show all events'],
              ['mine', 'Only my events'],
              ['invites', 'Only invites'],
              ['no-allday', 'Hide all-day events'],
            ] as const).map(([val, label]) => (
              <button key={val} onClick={() => { setCalendarFilter(val); setFilterOpen(false) }}
                className={cn(
                  'w-full text-left text-sm px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors flex items-center justify-between',
                  calendarFilter === val ? 'text-[#0078D4]' : 'text-[#323130]'
                )}>
                <span>{label}</span>
                {calendarFilter === val && <span className="text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <RibbonSep />

      {/* Share & Print */}
      <RibbonBtn label="Share" onClick={() => window.dispatchEvent(new CustomEvent('outlook:share-calendar'))}>
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
      <RibbonBtn label="Restore" disabled onClick={() => showNotification('Restore contact')}>
        <RotateCcw size={15} /><span>Restore</span>
      </RibbonBtn>

      <RibbonSep />

      <RibbonBtn label="Add to contacts" disabled onClick={() => showNotification('Add to contacts')}>
        <UserPlus size={15} /><span>Add to contacts</span>
      </RibbonBtn>
      <RibbonBtn label="Add to favorites" disabled onClick={() => showNotification('Select a contact first')}>
        <Star size={15} /><span>Add to favorites</span>
      </RibbonBtn>
      <RibbonBtn label="Add to list" disabled onClick={() => showNotification('Select a contact first')}>
        <Users size={15} /><span>Add to list</span>
      </RibbonBtn>

      <RibbonSep />

      <RibbonBtn label="Edit members" disabled onClick={() => showNotification('Edit members')}>
        <Users size={15} /><span>Edit members</span>
      </RibbonBtn>
      <RibbonBtn label="Invite others" disabled onClick={() => showNotification('Invite others')}>
        <UserPlus size={15} /><span>Invite others</span>
      </RibbonBtn>

      <RibbonSep />

      <RibbonBtn label="Manage contacts" onClick={() => showNotification('Manage contacts')}>
        <Users size={15} /><span>Manage contacts</span>
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