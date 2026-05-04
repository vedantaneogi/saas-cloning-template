'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
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
  Pencil,
  Play,
} from 'lucide-react'
import { folders, messages, rules } from '@/lib/api'
import type { Folder as FolderType } from '@/lib/api'
import { useMailStore } from '@/store/mail'
import { useAuthStore } from '@/store/auth'
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
  const [creatingSubfolder, setCreatingSubfolder] = useState(false)
  const [subfolderName, setSubfolderName] = useState('')
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

  const { data: ruleList = [] } = useQuery({
    queryKey: ['rules'],
    queryFn: () => rules.list(),
  })

  const runAllRulesMutation = useMutation({
    mutationFn: async () => {
      const enabledRules = ruleList.filter((r) => r.is_enabled)
      await Promise.all(enabledRules.map((r) => rules.run(r.id, folder.id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      setContextMenu(null)
    },
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
    setCreatingSubfolder(true)
    setSubfolderName('')
    setExpanded(true)
    setContextMenu(null)
  }

  const handleSubfolderSubmit = () => {
    if (subfolderName.trim()) createSubMutation.mutate(subfolderName.trim())
    setCreatingSubfolder(false)
    setSubfolderName('')
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
            onClick={() => runAllRulesMutation.mutate()}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1]"
          >
            <Play size={13} /> Run rules on folder
          </button>
          <div className="h-px bg-[#EDEBE9]" />
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

      {/* Inline subfolder creation input */}
      {creatingSubfolder && (
        <div className="flex items-center gap-1.5 py-1" style={{ paddingLeft: `${12 + (level + 1) * 12}px` }}>
          <Folder size={14} className="text-[#605E5C] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={subfolderName}
            onChange={(e) => setSubfolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubfolderSubmit()
              if (e.key === 'Escape') { setCreatingSubfolder(false); setSubfolderName('') }
            }}
            onBlur={handleSubfolderSubmit}
            placeholder="Folder name"
            className="flex-1 text-sm text-[#323130] bg-white border border-[#0078D4] rounded px-1.5 py-0.5 focus:outline-none"
          />
        </div>
      )}
    </li>
  )
}

export function FolderTree() {
  const params = useParams()
  const currentSlug = (params?.folder as string) ?? 'inbox'
  const currentUser = useAuthStore((s) => s.currentUser)
  const queryClient = useQueryClient()
  const [newFolderInput, setNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderRef = useRef<HTMLInputElement>(null)
  const [favoritesExpanded, setFavoritesExpanded] = useState(true)
  const [accountExpanded, setAccountExpanded] = useState(true)

  const { data: folderList = [], isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => folders.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setNewFolderInput(false)
      setNewFolderName('')
    },
  })

  const handleNewFolder = () => {
    setNewFolderInput(true)
    setTimeout(() => newFolderRef.current?.focus(), 50)
  }

  const submitNewFolder = () => {
    if (newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim())
    else { setNewFolderInput(false); setNewFolderName('') }
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
      className="flex flex-col h-full bg-white select-none"
    >

      <div className="flex-1 overflow-y-auto outlook-scrollbar px-1 pb-4">
        {isLoading ? (
          <div className="px-3 py-2 text-xs text-[#605E5C]">Loading folders...</div>
        ) : (
          <>
            {/* ── Favorites section (collapsible) with 3-dot hover menu ── */}
            <div className="group flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-[#F3F2F1] rounded-sm"
              onClick={() => setFavoritesExpanded((v) => !v)}>
              <div className="flex items-center gap-1">
                {favoritesExpanded ? <ChevronDown size={12} className="text-[#605E5C]" /> : <ChevronRight size={12} className="text-[#605E5C]" />}
                <span className="text-xs font-semibold text-[#323130] uppercase tracking-wide">Favorites</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation() }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#EDEBE9] text-[#605E5C] transition-all"
                title="More options"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="13" cy="8" r="1.2" fill="currentColor"/></svg>
              </button>
            </div>

            {favoritesExpanded && (
              <ul role="tree" aria-label="Favorite folders">
                {systemFolders.slice(0, 3).map((folder) => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    currentSlug={currentSlug}
                  />
                ))}
              </ul>
            )}

            <div className="h-px bg-[#EDEBE9] my-1 mx-2" />

            {/* ── Account section (collapsible) with 3-dot hover menu ── */}
            <div className="group flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-[#F3F2F1] rounded-sm"
              onClick={() => setAccountExpanded((v) => !v)}>
              <div className="flex items-center gap-1 min-w-0">
                {accountExpanded ? <ChevronDown size={12} className="text-[#605E5C] flex-shrink-0" /> : <ChevronRight size={12} className="text-[#605E5C] flex-shrink-0" />}
                <span className="text-xs font-semibold text-[#323130] truncate">{currentUser?.email ?? 'Mail'}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleNewFolder() }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#EDEBE9] text-[#605E5C] transition-all flex-shrink-0"
                title="Create new folder"
              >
                <FolderPlus size={14} />
              </button>
            </div>

            {accountExpanded && (
              <ul role="tree" aria-label="All mail folders">
                {systemFolders.map((folder) => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    children={childFolders(folder.id)}
                    currentSlug={currentSlug}
                  />
                ))}
                {userFolders.map((folder) => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    children={childFolders(folder.id)}
                    currentSlug={currentSlug}
                  />
                ))}
              </ul>
            )}

            {newFolderInput ? (
              <div className="flex items-center gap-1.5 px-3 py-1 mt-1">
                <FolderPlus size={14} className="text-[#0078D4] flex-shrink-0" />
                <input
                  ref={newFolderRef}
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitNewFolder()
                    if (e.key === 'Escape') { setNewFolderInput(false); setNewFolderName('') }
                  }}
                  onBlur={submitNewFolder}
                  placeholder="Folder name"
                  className="flex-1 text-sm border border-[#0078D4] rounded px-1.5 py-0.5 focus:outline-none text-[#323130]"
                />
              </div>
            ) : (
              <button
                onClick={handleNewFolder}
                className="flex items-center gap-1.5 w-full px-3 py-2 text-sm text-[#605E5C] hover:text-[#323130] hover:bg-[#F3F2F1] transition-colors mt-1"
                aria-label="New folder"
              >
                <FolderPlus size={14} className="text-[#0078D4]" />
                New folder
              </button>
            )}
          </>
        )}
      </div>
    </nav>
  )
}
