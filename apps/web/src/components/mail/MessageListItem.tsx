'use client'

import { useState, useEffect, useRef } from 'react'
import { Flag, Paperclip, Star, Trash2, FolderInput, Mail, MailOpen, ChevronRight, Reply, Forward, MessagesSquare, Archive, Pin, Tag, Clock, ReplyAll, Copy, ShieldAlert, VolumeX, Download, Search, CheckSquare, Zap, MoreHorizontal, Filter, Eye, Volume2, X } from 'lucide-react'
import type { Message } from '@/lib/api'
import { useMailStore } from '@/store/mail'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn, formatMessageDate, stripHtml, truncate } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messages, folders, categories, tasks } from '@/lib/api'
import { useUIStore, draftFromReply } from '@/store/ui'
import { useRouter } from 'next/navigation'

interface MessageListItemProps {
  message: Message
}

function MenuSep() {
  return <div className="h-px bg-[#EDEBE9] my-1" />
}

function MenuItem({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      disabled={disabled}
      className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-[#605E5C] flex-shrink-0">{icon}</span>
      {label}
    </button>
  )
}

function SubMenu({ icon, label, open, onOpenChange, children, alignRight }: {
  icon: React.ReactNode
  label: string
  open: boolean
  onOpenChange: (v: boolean) => void
  children: React.ReactNode
  alignRight?: boolean
}) {
  return (
    <div className="relative" onMouseEnter={() => onOpenChange(true)} onMouseLeave={() => onOpenChange(false)}>
      <button
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center justify-between w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
      >
        <span className="flex items-center gap-2"><span className="text-[#605E5C]">{icon}</span>{label}</span>
        <ChevronRight size={12} className="text-[#605E5C]" />
      </button>
      {open && (
        <div className={cn(
          "absolute top-0 min-w-[180px] max-w-[240px] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 z-50",
          alignRight ? "right-full" : "left-full"
        )}>
          {children}
        </div>
      )}
    </div>
  )
}

export function MessageListItem({ message }: MessageListItemProps) {
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const openComposer = useUIStore((s) => s.openComposer)
  const showNotification = useUIStore((s) => s.showNotification)
  const queryClient = useQueryClient()
  const router = useRouter()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [copySearch, setCopySearch] = useState('')
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: folderList = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  const isSelected = selectedMessageId === message.id
  const isUnread = !message.is_read
  const dateStr = message.received_at ?? message.created_at

  const markReadMutation = useMutation({
    mutationFn: (isRead: boolean) => messages.update(message.id, { is_read: isRead }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  const flagMutation = useMutation({
    mutationFn: () => messages.update(message.id, { is_flagged: !message.is_flagged }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => messages.delete(message.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  const moveMutation = useMutation({
    mutationFn: (folderId: string) => messages.move(message.id, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setContextMenu(null)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const fl = queryClient.getQueryData<{ id: string; slug: string }[]>(['folders'])
      const archiveFolder = fl?.find((f) => f.slug === 'archive')
      if (archiveFolder) return messages.move(message.id, archiveFolder.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setContextMenu(null)
    },
  })

  const pinMutation = useMutation({
    mutationFn: () => messages.update(message.id, { is_pinned: !message.is_pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      setContextMenu(null)
    },
  })

  const snoozeMutation = useMutation({
    mutationFn: (snoozeUntil: string) => messages.update(message.id, { snooze_until: snoozeUntil } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      setContextMenu(null)
    },
  })

  const categorizeMutation = useMutation({
    mutationFn: (categoryIds: string[]) => messages.update(message.id, { category_ids: categoryIds } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: () => tasks.create({
      title: message.subject || '(no subject)',
      body: message.body_text ? message.body_text.slice(0, 500) : undefined,
      source_message_id: message.id,
      importance: message.importance === 'high' ? 'high' : 'normal',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setContextMenu(null)
      showNotification('Task created')
      router.push('/tasks')
    },
  })

  const snoozeOptions = [
    { label: 'Later today (3 hours)', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 3); return d.toISOString() } },
    { label: 'Tomorrow morning', getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString() } },
    { label: 'This weekend', getTime: () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + (6 - day)); d.setHours(8, 0, 0, 0); return d.toISOString() } },
    { label: 'Next week', getTime: () => { const d = new Date(); d.setDate(d.getDate() + (8 - d.getDay())); d.setHours(8, 0, 0, 0); return d.toISOString() } },
  ]

  const toggleCategory = (catId: string) => {
    const current = (message.categories ?? []).map((c) => c.id)
    const next = current.includes(catId) ? current.filter((id) => id !== catId) : [...current, catId]
    categorizeMutation.mutate(next)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleClick = () => {
    setSelectedMessageId(message.id)
    if (isUnread) {
      markReadMutation.mutate(true)
    }
  }

  const senderName = message.from_name || message.from_address.split('@')[0]
  const preview = message.body_text
    ? truncate(message.body_text, 120)
    : message.body_html
    ? truncate(stripHtml(message.body_html), 120)
    : ''

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('messageId', message.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      role="listitem"
      aria-selected={isSelected}
      aria-label={`${senderName}: ${message.subject}`}
      draggable
      className={cn(
        'relative flex gap-2 px-3 py-2 cursor-pointer border-b border-[#EDEBE9] transition-colors group',
        isSelected
          ? 'bg-[#EBF3FB] border-l-[3px] border-l-[#0078D4]'
          : 'hover:bg-[#F3F2F1] border-l-[3px] border-l-transparent',
        isUnread && !isSelected && 'bg-white'
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    >
      {/* Unread indicator */}
      {isUnread && (
        <span
          className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0078D4]"
          aria-label="Unread"
        />
      )}

      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        <Avatar name={senderName} size="sm" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1 mb-0.5">
          <span
            className={cn(
              'text-sm truncate',
              isUnread ? 'font-semibold text-[#323130]' : 'font-normal text-[#323130]'
            )}
          >
            {senderName}
          </span>
          <span className="text-xs text-[#605E5C] flex-shrink-0 whitespace-nowrap">
            {formatMessageDate(dateStr)}
          </span>
        </div>

        <div className="flex items-center gap-1 mb-0.5">
          {message.importance === 'high' && (
            <Badge variant="importance">!</Badge>
          )}
          {message.reply_type === 'reply' && (
            <Reply size={11} className="text-[#605E5C] flex-shrink-0" aria-label="Reply" />
          )}
          {message.reply_type === 'reply_all' && (
            <MessagesSquare size={11} className="text-[#605E5C] flex-shrink-0" aria-label="Reply all" />
          )}
          {message.reply_type === 'forward' && (
            <Forward size={11} className="text-[#605E5C] flex-shrink-0" aria-label="Forwarded" />
          )}
          <span
            className={cn(
              'text-sm truncate',
              isUnread ? 'font-semibold text-[#0078D4]' : 'text-[#323130]'
            )}
          >
            {message.subject || '(no subject)'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-[#605E5C] truncate flex-1">{preview}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {message.categories && message.categories.length > 0 && (
              <span className="flex items-center gap-0.5" aria-label="Categories">
                {message.categories.slice(0, 3).map((cat) => (
                  <span
                    key={cat.id}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                    title={cat.name}
                  />
                ))}
              </span>
            )}
            {message.has_attachments && (
              <Paperclip size={12} className="text-[#605E5C]" aria-label="Has attachments" />
            )}
            {message.is_pinned && (
              <Star size={12} className="text-[#FFB900] fill-[#FFB900]" aria-label="Pinned" />
            )}
          </div>
        </div>
      </div>

      {/* Flag button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          flagMutation.mutate()
        }}
        aria-label={message.is_flagged ? 'Remove flag' : 'Flag message'}
        className={cn(
          'flex-shrink-0 self-center p-1 rounded transition-colors opacity-0 group-hover:opacity-100',
          message.is_flagged ? 'opacity-100 text-[#D13438]' : 'text-[#605E5C] hover:text-[#D13438]'
        )}
      >
        <Flag size={14} className={message.is_flagged ? 'fill-[#D13438]' : ''} />
      </button>

      {/* Right-click context menu — matches real Outlook order exactly */}
      {contextMenu && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in py-1 overflow-visible"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 240),
            top: Math.min(contextMenu.y, window.innerHeight - 580),
          }}
        >
          {/* 1. Reply / Reply all / Forward */}
          <MenuItem icon={<Reply size={14} />} label="Reply" onClick={() => { openComposer(draftFromReply(message, 'reply')); setContextMenu(null) }} />
          <MenuItem icon={<ReplyAll size={14} />} label="Reply all" onClick={() => { openComposer(draftFromReply(message, 'reply_all')); setContextMenu(null) }} />
          <MenuItem icon={<Forward size={14} />} label="Forward" onClick={() => { openComposer(draftFromReply(message, 'forward')); setContextMenu(null) }} />

          <MenuSep />

          {/* 2. Delete / Archive / Move / Copy */}
          <MenuItem icon={<Trash2 size={14} />} label="Delete" onClick={() => { deleteMutation.mutate(); setContextMenu(null) }} />
          <MenuItem icon={<Archive size={14} />} label="Archive" onClick={() => { archiveMutation.mutate() }} />

          <SubMenu icon={<FolderInput size={14} />} label="Move" open={moveOpen} onOpenChange={setMoveOpen}>
            {folderList.map((f) => (
              <button key={f.id} role="menuitem" onClick={(e) => { e.stopPropagation(); moveMutation.mutate(f.id) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] truncate flex items-center gap-2">
                <FolderInput size={12} className="text-[#605E5C]" />{f.name}
              </button>
            ))}
          </SubMenu>

          {/* Copy submenu — with search box matching real Outlook */}
          <SubMenu icon={<Copy size={14} />} label="Copy" open={copyOpen} onOpenChange={(v) => { setCopyOpen(v); if (!v) setCopySearch('') }}>
            {/* Search box */}
            <div className="px-2 py-1.5 border-b border-[#EDEBE9]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1 border border-[#EDEBE9] rounded px-2 py-1">
                <Search size={12} className="text-[#605E5C] flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={copySearch}
                  onChange={(e) => setCopySearch(e.target.value)}
                  placeholder="Search"
                  className="flex-1 text-xs text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent min-w-0"
                />
                {copySearch && (
                  <button onClick={() => setCopySearch('')} className="text-[#605E5C] hover:text-[#323130]">
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
            {/* Filtered folder list */}
            {folderList
              .filter((f) => !copySearch || f.name.toLowerCase().includes(copySearch.toLowerCase()))
              .map((f) => (
                <button key={f.id} role="menuitem" onClick={(e) => {
                  e.stopPropagation()
                  showNotification(`Copied to ${f.name}`)
                  setCopyOpen(false); setCopySearch(''); setContextMenu(null)
                }} className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] truncate flex items-center gap-2">
                  <FolderInput size={12} className="text-[#605E5C]" />{f.name}
                </button>
              ))
            }
            <MenuSep />
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); showNotification('Copy to new folder: coming soon'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
              Copy to new folder
            </button>
            <button role="menuitem" onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(`${message.subject ?? ''}\n\n${message.body_text ?? ''}`)
              showNotification('Copied to clipboard')
              setContextMenu(null)
            }} className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
              Copy to clipboard
            </button>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); showNotification('Select destination folder'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
              Copy to a different folder...
            </button>
          </SubMenu>

          <MenuSep />

          {/* 3. Mark / Pin / Categorize / Flag / Snooze */}
          <MenuItem
            icon={message.is_read ? <Mail size={14} /> : <MailOpen size={14} />}
            label={message.is_read ? 'Mark as unread' : 'Mark as read'}
            onClick={() => { markReadMutation.mutate(!message.is_read); setContextMenu(null) }}
          />
          <MenuItem icon={<Pin size={14} />} label={message.is_pinned ? 'Unpin' : 'Pin'} onClick={() => { pinMutation.mutate() }} />

          <SubMenu icon={<Tag size={14} />} label="Categorize" open={catOpen} onOpenChange={setCatOpen}>
            {categoryList.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[#605E5C]">No categories</div>
            ) : categoryList.map((cat) => {
              const isActive = (message.categories ?? []).some((c) => c.id === cat.id)
              return (
                <button key={cat.id} role="menuitem" onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id) }}
                  className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-left truncate">{cat.name}</span>
                  {isActive && <span className="text-[#0078D4] text-xs font-bold">✓</span>}
                </button>
              )
            })}
          </SubMenu>

          <MenuItem
            icon={<Flag size={14} className={message.is_flagged ? 'text-[#D13438]' : ''} />}
            label={message.is_flagged ? 'Remove flag' : 'Flag'}
            onClick={() => { flagMutation.mutate(); setContextMenu(null) }}
          />

          <SubMenu icon={<Clock size={14} />} label="Snooze" open={snoozeOpen} onOpenChange={setSnoozeOpen}>
            {snoozeOptions.map((opt) => (
              <button key={opt.label} role="menuitem" onClick={(e) => { e.stopPropagation(); snoozeMutation.mutate(opt.getTime()) }}
                className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">
                {opt.label}
              </button>
            ))}
          </SubMenu>

          <MenuSep />

          {/* 4. Rules / Report / Block / Ignore — exact Outlook order */}
          <SubMenu icon={<Zap size={14} />} label="Rules" open={rulesOpen} onOpenChange={setRulesOpen}>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); router.push('/settings/rules'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Zap size={12} className="text-[#605E5C]" />Create rule
            </button>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); router.push('/settings/rules'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Zap size={12} className="text-[#605E5C]" />Manage rules
            </button>
          </SubMenu>

          <SubMenu icon={<ShieldAlert size={14} />} label="Report" open={reportOpen} onOpenChange={setReportOpen}>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); showNotification('Reported as phishing'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Report phishing</button>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); showNotification('Reported as junk'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Report junk</button>
          </SubMenu>

          <SubMenu icon={<VolumeX size={14} />} label="Block" open={blockOpen} onOpenChange={setBlockOpen}>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); showNotification(`Blocked ${message.from_address}`); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Block sender</button>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); showNotification('Domain blocked'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Block sender domain</button>
          </SubMenu>

          <MenuItem
            icon={<Volume2 size={14} />}
            label="Ignore"
            onClick={() => { showNotification('Conversation ignored'); setContextMenu(null) }}
          />

          <MenuSep />

          {/* 5. Download / Find related / View / Advanced actions */}
          <SubMenu icon={<Download size={14} />} label="Download" open={downloadOpen} onOpenChange={setDownloadOpen}>
            <button role="menuitem" onClick={(e) => {
              e.stopPropagation()
              const blob = new Blob([`From: ${message.from_address}\nSubject: ${message.subject ?? ''}\n\n${message.body_text ?? ''}`], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `${(message.subject ?? 'email').replace(/[^a-z0-9]/gi, '_')}.eml`
              a.click(); URL.revokeObjectURL(url)
              setContextMenu(null)
            }} className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Download size={12} className="text-[#605E5C]" />Download email (.eml)
            </button>
            <button role="menuitem" onClick={(e) => {
              e.stopPropagation()
              const blob = new Blob([`${message.subject ?? ''}\n${message.body_text ?? ''}`], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `${(message.subject ?? 'email').replace(/[^a-z0-9]/gi, '_')}.txt`
              a.click(); URL.revokeObjectURL(url)
              setContextMenu(null)
            }} className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Download size={12} className="text-[#605E5C]" />Download as text
            </button>
          </SubMenu>

          <SubMenu icon={<Search size={14} />} label="Find related" open={findOpen} onOpenChange={setFindOpen}>
            <button role="menuitem" onClick={(e) => {
              e.stopPropagation()
              useMailStore.getState().setSearchQuery(`from:${message.from_address}`)
              router.push('/mail/search'); setContextMenu(null)
            }} className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Mail size={12} className="text-[#605E5C]" />Messages from sender
            </button>
            <button role="menuitem" onClick={(e) => {
              e.stopPropagation()
              useMailStore.getState().setSearchQuery(message.subject ?? '')
              router.push('/mail/search'); setContextMenu(null)
            }} className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Filter size={12} className="text-[#605E5C]" />Messages with same subject
            </button>
          </SubMenu>

          <SubMenu icon={<Eye size={14} />} label="View" open={viewOpen} onOpenChange={setViewOpen}>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); showNotification('Message source copied'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">View message source</button>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); showNotification('Opening in new window'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]">Open in new window</button>
          </SubMenu>

          <SubMenu icon={<MoreHorizontal size={14} />} label="Advanced actions" open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); createTaskMutation.mutate() }}
              disabled={createTaskMutation.isPending}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2 disabled:opacity-50">
              <CheckSquare size={13} className="text-[#0078D4]" />
              {createTaskMutation.isPending ? 'Creating…' : 'Create task'}
            </button>
            <button role="menuitem" onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(message.from_address)
              showNotification('Email address copied'); setContextMenu(null)
            }} className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Copy size={13} className="text-[#605E5C]" />Copy email address
            </button>
            <button role="menuitem" onClick={(e) => { e.stopPropagation(); showNotification('Quick step applied'); setContextMenu(null) }}
              className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] flex items-center gap-2">
              <Zap size={13} className="text-[#605E5C]" />Set quick step
            </button>
          </SubMenu>
        </div>
      )}
    </div>
  )
}
