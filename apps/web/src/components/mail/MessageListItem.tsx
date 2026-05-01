'use client'

import { useState, useEffect, useRef } from 'react'
import { Flag, Paperclip, Star, Trash2, FolderInput, Mail, MailOpen, ChevronRight, Reply, Forward, MessagesSquare } from 'lucide-react'
import type { Message } from '@/lib/api'
import { useMailStore } from '@/store/mail'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn, formatMessageDate, stripHtml, truncate } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messages, folders } from '@/lib/api'

interface MessageListItemProps {
  message: Message
}

export function MessageListItem({ message }: MessageListItemProps) {
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const queryClient = useQueryClient()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: folderList = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
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
              isUnread ? 'font-semibold text-[#323130]' : 'text-[#323130]'
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

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 w-52 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(!message.is_read); setContextMenu(null) }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
          >
            {message.is_read ? <Mail size={14} /> : <MailOpen size={14} />}
            {message.is_read ? 'Mark as unread' : 'Mark as read'}
          </button>
          <button
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); flagMutation.mutate(); setContextMenu(null) }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
          >
            <Flag size={14} className={message.is_flagged ? 'text-[#D13438]' : ''} />
            {message.is_flagged ? 'Remove flag' : 'Flag'}
          </button>
          <div className="h-px bg-[#EDEBE9]" />
          {/* Move to folder submenu */}
          <div
            className="relative"
            onMouseEnter={() => setMoveOpen(true)}
            onMouseLeave={() => setMoveOpen(false)}
          >
            <button
              role="menuitem"
              className="flex items-center justify-between w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
            >
              <span className="flex items-center gap-2"><FolderInput size={14} /> Move to folder</span>
              <ChevronRight size={12} className="text-[#605E5C]" />
            </button>
            {moveOpen && (
              <div className="absolute left-full top-0 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg">
                {folderList.map((f) => (
                  <button
                    key={f.id}
                    role="menuitem"
                    onClick={(e) => { e.stopPropagation(); moveMutation.mutate(f.id) }}
                    className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] truncate"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="h-px bg-[#EDEBE9]" />
          <button
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); setContextMenu(null) }}
            className="flex items-center gap-2 w-full text-sm text-[#D13438] px-3 py-2 hover:bg-[#FDE7E9]"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
