'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Inbox,
  Send,
  FileText,
  Archive,
  AlertTriangle,
  Trash2,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Calendar,
  Users,
  CheckSquare,
} from 'lucide-react'
import { folders, messages } from '@/lib/api'
import type { Folder as FolderType } from '@/lib/api'
import { useMailStore } from '@/store/mail'
import { useUIStore } from '@/store/ui'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

const SYSTEM_ICONS: Record<string, React.ReactNode> = {
  inbox: <Inbox size={16} />,
  sent: <Send size={16} />,
  drafts: <FileText size={16} />,
  archive: <Archive size={16} />,
  junk: <AlertTriangle size={16} />,
  deleted: <Trash2 size={16} />,
}

interface FolderItemProps {
  folder: FolderType
  children?: FolderType[]
  level?: number
  currentSlug: string
}

function FolderItem({ folder, children = [], level = 0, currentSlug }: FolderItemProps) {
  const setSelectedFolderSlug = useMailStore((s) => s.setSelectedFolderSlug)
  const setSelectedFolderId = useMailStore((s) => s.setSelectedFolderId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const [expanded, setExpanded] = useState(true)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(folder.name)
  const [isDragOver, setIsDragOver] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const dropMutation = useMutation({
    mutationFn: (messageId: string) => messages.move(messageId, folder.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })

  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  const renameMutation = useMutation({
    mutationFn: (name: string) => folders.update(folder.id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => folders.delete(folder.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  })

  const createSubMutation = useMutation({
    mutationFn: (name: string) => folders.create({ name, parent_id: folder.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  })

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== folder.name) renameMutation.mutate(renameValue.trim())
    setRenaming(false)
    setContextMenu(null)
  }

  const handleCreateSub = () => {
    const name = window.prompt('New folder name:')
    if (name?.trim()) createSubMutation.mutate(name.trim())
    setContextMenu(null)
  }

  const isActive = currentSlug === (folder.slug || folder.id)
  const hasChildren = children.length > 0
  const icon = SYSTEM_ICONS[folder.slug] ?? <Folder size={16} />

  const slug = folder.slug || folder.id

  return (
    <li>
      <Link
        href={`/mail/${slug}`}
        className={cn(
          'group flex items-center gap-1.5 py-1 rounded-sm cursor-pointer select-none text-sm transition-colors no-underline relative',
          isActive
            ? 'bg-[#EBF3FB] text-[#0078D4] font-semibold border-l-[3px] border-l-[#0078D4]'
            : 'text-[#323130] hover:bg-[#EDEBE9] border-l-[3px] border-l-transparent',
          isDragOver && 'bg-[#EBF3FB] ring-1 ring-[#0078D4]'
        )}
        style={{ paddingLeft: `${6 + level * 12}px` }}
        onClick={() => {
          setSelectedFolderSlug(slug)
          setSelectedFolderId(folder.id)
          setSelectedMessageId(null)
        }}
        onContextMenu={handleContextMenu}
        aria-label={folder.name}
        aria-current={isActive ? 'page' : undefined}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          const messageId = e.dataTransfer.getData('messageId')
          if (messageId) dropMutation.mutate(messageId)
          setIsDragOver(false)
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="flex-shrink-0 text-[#605E5C]"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        <span className={cn('flex-shrink-0', isActive ? 'text-[#0078D4]' : 'text-[#605E5C]')}>
          {icon}
        </span>

        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') { setRenaming(false); setRenameValue(folder.name) }
            }}
            onClick={(e) => e.preventDefault()}
            className="flex-1 text-sm text-[#323130] bg-white border border-[#0078D4] rounded px-1 focus:outline-none"
          />
        ) : (
          <span className="flex-1 truncate">{folder.name}</span>
        )}

        {folder.unread_count > 0 && !renaming && (
          <Badge variant="unread">{folder.unread_count}</Badge>
        )}
      </Link>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 w-48 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            role="menuitem"
            onClick={() => { setRenaming(true); setContextMenu(null) }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
          >
            <Pencil size={13} /> Rename
          </button>
          <button
            role="menuitem"
            onClick={handleCreateSub}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
          >
            <FolderPlus size={13} /> New subfolder
          </button>
          {!folder.is_system && (
            <>
              <div className="h-px bg-[#EDEBE9]" />
              <button
                role="menuitem"
                onClick={() => { deleteMutation.mutate(); setContextMenu(null) }}
                className="flex items-center gap-2 w-full text-sm text-[#D13438] px-3 py-2 hover:bg-[#FDE7E9]"
              >
                <Trash2 size={13} /> Delete folder
              </button>
            </>
          )}
        </div>
      )}

      {hasChildren && expanded && (
        <ul role="group">
          {children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              currentSlug={currentSlug}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function FolderTree() {
  const params = useParams()
  const router = useRouter()
  const currentSlug = (params?.folder as string) ?? 'inbox'
  const openComposer = useUIStore((s) => s.openComposer)
  const queryClient = useQueryClient()
  const [newMailDropOpen, setNewMailDropOpen] = useState(false)
  const newMailDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!newMailDropOpen) return
    const handler = (e: MouseEvent) => {
      if (newMailDropRef.current && !newMailDropRef.current.contains(e.target as Node)) {
        setNewMailDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [newMailDropOpen])

  const { data: folderList = [], isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => folders.create({ name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  })

  const handleNewFolder = () => {
    const name = window.prompt('New folder name:')
    if (name?.trim()) createFolderMutation.mutate(name.trim())
  }

  // Build tree: system folders first, then user folders
  const systemSlugs = ['inbox', 'drafts', 'sent', 'archive', 'junk', 'deleted']
  const systemFolders = systemSlugs
    .map((slug) => folderList.find((f) => f.slug === slug))
    .filter(Boolean) as FolderType[]

  const userFolders = folderList.filter(
    (f) => !f.is_system && !f.parent_id
  )
  const childFolders = (parentId: string) =>
    folderList.filter((f) => f.parent_id === parentId)

  return (
    <nav
      aria-label="Folder tree"
      className="flex flex-col h-full bg-[#F3F2F1] select-none"
    >
      {/* Compose split button */}
      <div className="px-2 pt-3 pb-2" ref={newMailDropRef}>
        <div className="flex rounded shadow-sm overflow-hidden">
          <button
            onClick={() => openComposer()}
            aria-label="New mail"
            data-automation-id="splitbuttonprimary"
            className="flex-1 flex items-center gap-2 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-sm font-semibold px-3 h-9 transition-colors"
          >
            <Plus size={16} />
            New mail
          </button>
          <div className="w-px bg-[#1565B0]" />
          <button
            onClick={() => setNewMailDropOpen((v) => !v)}
            aria-label="More new item options"
            aria-expanded={newMailDropOpen}
            aria-haspopup="menu"
            className="w-8 flex items-center justify-center bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white h-9 transition-colors"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {newMailDropOpen && (
          <div
            role="menu"
            className="absolute z-50 w-44 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg mt-1 animate-fade-in"
          >
            <button
              role="menuitem"
              onClick={() => { openComposer(); setNewMailDropOpen(false) }}
              className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
            >
              <Plus size={14} className="text-[#0078D4]" /> New mail
            </button>
            <button
              role="menuitem"
              onClick={() => { router.push('/calendar/month'); setNewMailDropOpen(false) }}
              className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
            >
              <Calendar size={14} className="text-[#0078D4]" /> New event
            </button>
            <button
              role="menuitem"
              onClick={() => { router.push('/contacts'); setNewMailDropOpen(false) }}
              className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
            >
              <Users size={14} className="text-[#0078D4]" /> New contact
            </button>
            <button
              role="menuitem"
              onClick={() => { router.push('/tasks'); setNewMailDropOpen(false) }}
              className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
            >
              <CheckSquare size={14} className="text-[#0078D4]" /> New task
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto outlook-scrollbar px-1 pb-4">
        {isLoading ? (
          <div className="px-3 py-2 text-xs text-[#605E5C]">Loading folders...</div>
        ) : (
          <>
            {/* Favorites / Pinned section */}
            <div className="px-2 py-1">
              <span className="text-xs font-semibold text-[#605E5C] uppercase tracking-wide">
                Favorites
              </span>
            </div>

            <ul role="tree" aria-label="Favorite folders">
              {systemFolders.slice(0, 3).map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  currentSlug={currentSlug}
                />
              ))}
            </ul>

            <div className="h-px bg-[#EDEBE9] my-2 mx-2" />

            {/* All folders */}
            <ul role="tree" aria-label="All mail folders">
              {systemFolders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  children={childFolders(folder.id)}
                  currentSlug={currentSlug}
                />
              ))}

              <li className="px-2 pt-3 pb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#605E5C] uppercase tracking-wide">
                  My folders
                </span>
              </li>
              {userFolders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  children={childFolders(folder.id)}
                  currentSlug={currentSlug}
                />
              ))}
            </ul>

            <button
              onClick={handleNewFolder}
              className="flex items-center gap-1.5 w-full px-3 py-2 text-sm text-[#605E5C] hover:text-[#323130] hover:bg-[#F3F2F1] transition-colors mt-1"
              aria-label="New folder"
            >
              <FolderPlus size={14} className="text-[#0078D4]" />
              New folder
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
