'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMailStore } from '@/store/mail'
import { useUIStore, draftFromReply } from '@/store/ui'
import { messages, folders, quickSteps } from '@/lib/api'
import type { Message } from '@/lib/api'
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  MailOpen,
  Zap,
  ChevronDown,
  Flag,
  FolderInput,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

function RibbonBtn({
  onClick,
  disabled,
  label,
  children,
  active,
}: {
  onClick?: () => void
  disabled?: boolean
  label: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded text-xs transition-colors min-w-[44px] h-full',
        disabled
          ? 'text-[#A19F9D] cursor-not-allowed'
          : active
          ? 'bg-[#EBF3FB] text-[#0078D4]'
          : 'text-[#323130] hover:bg-[#F3F2F1]'
      )}
    >
      {children}
    </button>
  )
}

function RibbonSep() {
  return <div className="w-px h-8 bg-[#EDEBE9] mx-1 flex-shrink-0" />
}

export function MailRibbon() {
  const selectedMessageId = useMailStore((s) => s.selectedMessageId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const openComposer = useUIStore((s) => s.openComposer)
  const showNotification = useUIStore((s) => s.showNotification)
  const queryClient = useQueryClient()
  const [qsOpen, setQsOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const qsRef = useRef<HTMLDivElement>(null)
  const moveRef = useRef<HTMLDivElement>(null)

  const message = selectedMessageId
    ? queryClient.getQueryData<Message>(['message', selectedMessageId])
    : undefined

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
      const fl = queryClient.getQueryData<{ id: string; slug: string }[]>(['folders'])
      const archiveFolder = fl?.find((f) => f.slug === 'archive')
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
    <div
      className="flex items-center h-11 px-2 gap-0.5 border-b border-[#EDEBE9] bg-white flex-shrink-0 overflow-x-auto"
      role="toolbar"
      aria-label="Mail toolbar"
    >
      {/* New mail — matches Outlook ribbon position */}
      <button
        onClick={() => openComposer()}
        aria-label="New mail"
        className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-sm font-medium px-4 h-8 rounded transition-colors mr-1 flex-shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0.5" y="2.5" width="13" height="9" rx="1" stroke="white" strokeWidth="1.2"/><path d="M1 4L7 8L13 4" stroke="white" strokeWidth="1.1"/></svg>
        New mail
      </button>
      <button
        onClick={() => openComposer()}
        aria-label="New mail options"
        className="flex items-center bg-[#0078D4] hover:bg-[#106EBE] text-white h-8 px-1.5 rounded-r border-l border-[#106EBE] -ml-2 transition-colors mr-1 flex-shrink-0"
      >
        <ChevronDown size={11} />
      </button>

      <RibbonSep />

      {/* Delete / Archive — matches Outlook order */}
      <RibbonBtn disabled={!hasMsg || deleteMutation.isPending} label="Delete" onClick={() => deleteMutation.mutate()}>
        <Trash2 size={16} />
        <span>Delete</span>
      </RibbonBtn>
      <RibbonBtn disabled={!hasMsg || archiveMutation.isPending} label="Archive" onClick={() => archiveMutation.mutate()}>
        <Archive size={16} />
        <span>Archive</span>
      </RibbonBtn>

      {/* Move to */}
      <div className="relative" ref={moveRef}>
        <RibbonBtn disabled={!hasMsg} label="Move to" onClick={() => setMoveOpen((v) => !v)}>
          <FolderInput size={16} />
          <span className="flex items-center gap-0.5">Move to <ChevronDown size={10} /></span>
        </RibbonBtn>
        {moveOpen && (
          <div className="absolute left-0 top-full mt-0.5 z-50 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1">
            {folderList.map((f) => (
              <button key={f.id} onClick={() => moveMutation.mutate(f.id)}
                className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] truncate">
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <RibbonSep />

      {/* Reply / Reply all / Forward */}
      <RibbonBtn disabled={!hasMsg} label="Reply" onClick={() => message && openComposer(draftFromReply(message, 'reply'))}>
        <Reply size={16} />
        <span>Reply</span>
      </RibbonBtn>
      <RibbonBtn disabled={!hasMsg} label="Reply all" onClick={() => message && openComposer(draftFromReply(message, 'reply_all'))}>
        <ReplyAll size={16} />
        <span>Reply all</span>
      </RibbonBtn>
      <RibbonBtn disabled={!hasMsg} label="Forward" onClick={() => message && openComposer(draftFromReply(message, 'forward'))}>
        <Forward size={16} />
        <span>Forward</span>
      </RibbonBtn>

      <RibbonSep />

      {/* Read / Flag */}
      <RibbonBtn
        disabled={!hasMsg}
        label={message?.is_read ? 'Mark as unread' : 'Mark as read'}
        onClick={() => markReadMutation.mutate(!message?.is_read)}
      >
        <MailOpen size={16} />
        <span>Read / Unread</span>
      </RibbonBtn>
      <RibbonBtn
        disabled={!hasMsg}
        label={message?.is_flagged ? 'Unflag' : 'Flag'}
        active={!!message?.is_flagged}
        onClick={() => flagMutation.mutate()}
      >
        <Flag size={16} className={message?.is_flagged ? 'text-[#D13438]' : ''} />
        <span>Flag / Unflag</span>
      </RibbonBtn>

      <RibbonSep />

      {/* Quick steps */}
      {quickStepList.length > 0 && (
        <div className="relative" ref={qsRef}>
          <RibbonBtn disabled={!hasMsg} label="Quick steps" onClick={() => setQsOpen((v) => !v)}>
            <Zap size={16} />
            <span className="flex items-center gap-0.5">Quick steps <ChevronDown size={10} /></span>
          </RibbonBtn>
          {qsOpen && (
            <div className="absolute left-0 top-full mt-0.5 z-50 w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1">
              {quickStepList.map((qs) => (
                <button key={qs.id} onClick={() => runQsMutation.mutate(qs.id)}
                  className="w-full text-left text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1] truncate flex items-center gap-2">
                  <Zap size={12} className="text-[#0078D4] flex-shrink-0" />
                  {qs.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
