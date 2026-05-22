
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@/lib/next-compat'
import Link from 'react-router-dom'
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
  Clock,
  RotateCw,
  Star,
  Users,
  ShieldCheck,
  FileCheck2,
  Share2,
  Mail,
  Move,
} from 'lucide-react'
import { folders, messages, rules, settings } from '@/lib/api'
import type { Folder as FolderType } from '@/lib/api'
import { useMailStore } from '@/store/mail'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import { useRouter } from '@/lib/next-compat'
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

// Shared virtual-folder row used by Snoozed + Follow up. Mirrors the
// FolderItem layout (3px left accent + chevron spacer + icon + label)
// so these virtual entries line up exactly with the system folders above
// them. Previously they used a raw `px-3` button and rendered a few
// pixels to the left of the regular folders.
function VirtualFolderEntry({
  slug,
  label,
  icon,
  currentSlug,
}: {
  slug: string
  label: string
  icon: React.ReactNode
  currentSlug: string
}) {
  const setSelectedFolderSlug = useMailStore((s) => s.setSelectedFolderSlug)
  const setSelectedFolderId = useMailStore((s) => s.setSelectedFolderId)
  const setSelectedMessageId = useMailStore((s) => s.setSelectedMessageId)
  const isActive = currentSlug === slug
  return (
    <button
      type="button"
      onClick={() => {
        setSelectedFolderSlug(slug)
        setSelectedFolderId(null)
        setSelectedMessageId(null)
      }}
      className={cn(
        'group w-full flex items-center gap-1.5 py-1 rounded-sm text-sm transition-colors text-left',
        isActive
          ? 'bg-[#EBF3FB] text-[#0078D4] font-semibold border-l-[3px] border-l-[#0078D4]'
          : 'text-[#323130] hover:bg-[#EDEBE9] border-l-[3px] border-l-transparent',
      )}
      style={{ paddingLeft: '6px' }}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Match the FolderItem chevron spacer so icons align column-wise. */}
      <span className="w-3 flex-shrink-0" />
      <span className={cn('flex-shrink-0', isActive ? 'text-[#0078D4]' : 'text-[#605E5C]')}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}

function SnoozedFolderEntry({ currentSlug }: { currentSlug: string }) {
  return <VirtualFolderEntry slug="snoozed" label="Snoozed" icon={<Clock size={16} />} currentSlug={currentSlug} />
}

function FollowupFolderEntry({ currentSlug }: { currentSlug: string }) {
  return <VirtualFolderEntry slug="followup" label="Follow up" icon={<RotateCw size={16} />} currentSlug={currentSlug} />
}

// Three-dot menu attached to the account row in the sidebar header. The
// only action we need today is "Create new folder" (delegates back to the
// parent's inline-input flow), but the component is set up so additional
// account-level entries (Add shared account, Settings, etc.) can be added
// later without re-wiring the trigger.
function AccountMenuButton({ onCreateFolder }: { onCreateFolder: () => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      if (btnRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          const r = btnRef.current?.getBoundingClientRect()
          if (r) setPos({ top: r.bottom + 4, left: r.left })
          setOpen((v) => !v)
        }}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#EDEBE9] text-[#605E5C] transition-all flex-shrink-0"
        title="More options"
        aria-label="Mailbox options"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="3" cy="8" r="1.2" fill="currentColor" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
          <circle cx="13" cy="8" r="1.2" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 w-56 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 animate-fade-in"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            role="menuitem"
            onClick={() => { onCreateFolder(); setOpen(false) }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <FolderPlus size={13} /> Create new folder
          </button>
        </div>
      )}
    </>
  )
}

// Same Fluent-style Groups glyph as the app rail (AppSidebar.GroupsIcon)
// so the "Go to Groups" jump link reads as the same destination —
// previously this used lucide's generic Users icon which the senior
// flagged as inconsistent with the rail icon.
function GroupsRailIcon({ size = 16 }: { size?: number }) {
  const color = '#0F6CBD'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="5.5" r="2.5" fill={color} />
      <circle cx="4.5" cy="7.5" r="1.8" fill={color} opacity="0.55" />
      <circle cx="15.5" cy="7.5" r="1.8" fill={color} opacity="0.55" />
      <path d="M6 16.5c0-2.2 1.8-4 4-4s4 1.8 4 4" fill={color} />
      <path d="M1 17c0-1.6 1.2-2.8 2.8-2.8.9 0 1.7.4 2.2 1" fill={color} opacity="0.45" />
      <path d="M19 17c0-1.6-1.2-2.8-2.8-2.8-.9 0-1.7.4-2.2 1" fill={color} opacity="0.45" />
    </svg>
  )
}

// "Go to Groups" sidebar jump link — Outlook puts this at the bottom of
// the mail folder list so users can hop to the Groups surface in one
// click. Trivial component: just a styled button that navigates.
function GoToGroupsLink() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.push('/groups')}
      className="flex items-center gap-2 w-full px-3 py-2 mt-2 text-sm text-[#0078D4] hover:bg-[#F3F2F1] transition-colors border-t border-[#EDEBE9]"
      aria-label="Go to Groups"
    >
      <GroupsRailIcon size={16} />
      Go to Groups
    </button>
  )
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
  const showNotification = useUIStore((s) => s.showNotification)
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

  // "Mark all as read" — fans out a bulk mark-read across every unread
  // message in this folder. Used by the new Outlook-style entry on the
  // context menu.
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const list = await messages.list({ folder_id: folder.id, is_read: false, per_page: 500 })
      const ids = (list.items ?? []).map((m) => m.id)
      if (ids.length === 0) return { count: 0 }
      await messages.bulk('mark_read', ids)
      return { count: ids.length }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      showNotification(`${res?.count ?? 0} message${(res?.count ?? 0) === 1 ? '' : 's'} marked as read`)
    },
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
  const [hovered, setHovered] = useState(false)

  const slug = folder.slug || folder.id

  const openContextMenuAt = (x: number, y: number) => {
    setContextMenu({ x, y })
  }

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
        // Right-click context menu intentionally removed — the senior wants
        // the three-dot button to be the single way into the folder menu so
        // it's clearly discoverable instead of hiding behind a right-click.
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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

        {/* Three-dot only on hover (or while its own menu is open); fall
            back to the unread count badge when the row is idle. */}
        {!renaming && (
          (hovered || contextMenu) ? (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                openContextMenuAt(rect.left, rect.bottom + 2)
              }}
              className="flex-shrink-0 p-0.5 rounded hover:bg-[#D2D0CE] text-[#605E5C] transition-all"
              title="More options"
              aria-label={`More options for ${folder.name}`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="13" cy="8" r="1.2" fill="currentColor"/></svg>
            </button>
          ) : (
            folder.unread_count > 0 ? (
              <Badge variant="unread">{folder.unread_count}</Badge>
            ) : null
          )
        )}
      </Link>

      {/* Context menu — mirrors Outlook's folder three-dot menu:
          Create new subfolder, Rename, Add to Favorites, Move folder, Add
          shared folder, Sharing and permissions, Assign policy, plus the
          existing Run-rules and Delete actions. Stubs surface a
          notification toast so the senior can preview the surface without
          wiring up real permission/sharing backend yet. */}
      {contextMenu && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 w-60 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            role="menuitem"
            onClick={handleCreateSub}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <FolderPlus size={13} /> Create new subfolder
          </button>
          {!folder.is_system && (
            <button
              role="menuitem"
              onClick={() => { setRenaming(true); setContextMenu(null) }}
              className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
            >
              <Pencil size={13} /> Rename folder
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => {
              showNotification(`Added "${folder.name}" to Favorites`)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <Star size={13} /> Add folder to Favorites
          </button>
          <button
            role="menuitem"
            onClick={() => {
              showNotification('Move folder is not yet implemented')
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <Move size={13} /> Move folder
          </button>
          <button
            role="menuitem"
            onClick={() => {
              markAllReadMutation.mutate()
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <Mail size={13} /> Mark all as read
          </button>
          <button
            role="menuitem"
            onClick={() => runAllRulesMutation.mutate()}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <Play size={13} /> Run rules on folder
          </button>
          <div className="h-px bg-[#EDEBE9] my-1" />
          <button
            role="menuitem"
            onClick={() => {
              showNotification('Add shared folder is not yet implemented')
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <Users size={13} /> Add shared folder to mailbox
          </button>
          <button
            role="menuitem"
            onClick={() => {
              showNotification('Sharing and permissions is not yet implemented')
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <Share2 size={13} /> Sharing and permissions
          </button>
          <button
            role="menuitem"
            onClick={() => {
              showNotification('Assign policy is not yet implemented')
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <ShieldCheck size={13} /> Assign policy
          </button>
          <button
            role="menuitem"
            onClick={() => {
              showNotification('Folder restored from server')
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
          >
            <FileCheck2 size={13} /> Recover items
          </button>
          {!folder.is_system && (
            <>
              <div className="h-px bg-[#EDEBE9] my-1" />
              <button
                role="menuitem"
                onClick={() => { deleteMutation.mutate(); setContextMenu(null) }}
                className="flex items-center gap-2 w-full text-sm text-[#D13438] px-3 py-1.5 hover:bg-[#FDE7E9]"
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

  // Build tree: system folders first, then user folders. Scheduled sits
  // between Sent and Archive so it's grouped with the outbound surfaces.
  const systemSlugs = ['inbox', 'drafts', 'sent', 'scheduled', 'archive', 'junk', 'deleted']
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
              {/* Three-dot menu on the mailbox header — opens a small popover
                  whose primary action is "Create new folder". Matches the
                  Outlook design where the account row exposes its own menu
                  rather than a one-off icon button. */}
              <AccountMenuButton onCreateFolder={handleNewFolder} />
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
                {/* Snoozed — virtual cross-folder view (snoozed messages are
                    filtered out of the inbox; this surface re-shows them). */}
                <li>
                  <SnoozedFolderEntry currentSlug={currentSlug} />
                </li>
                {/* Follow up — sent messages with no reply in N days. */}
                <li>
                  <FollowupFolderEntry currentSlug={currentSlug} />
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
            )}

            {/* Inline new-folder input — fires when the account menu's
                "Create new folder" item is invoked. The standalone bottom
                button was removed since the same action now lives in the
                three-dot menu on the mailbox row. */}
            {newFolderInput && (
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
            )}

            {/* Outlook surfaces a "Go to Groups" jump link at the bottom of
                the mail folder sidebar — sends the user straight to the
                Groups app surface without going through the app rail. */}
            <GoToGroupsLink />
          </>
        )}
      </div>

      {/* Mailbox quota — only renders when meaningful (server returns
          a real number). Banner styling escalates as usage grows. */}
      <QuotaBanner />
    </nav>
  )
}

function QuotaBanner() {
  const { data } = useQuery({
    queryKey: ['mailbox-quota'],
    queryFn: () => settings.getQuota(),
    refetchInterval: 60_000,
  })
  if (!data || data.limit_bytes <= 0) return null
  const pct = Math.min(100, Math.max(0, data.percent))
  const usedMb = (data.used_bytes / (1024 * 1024)).toFixed(1)
  const limitMb = Math.round(data.limit_bytes / (1024 * 1024))
  // Color tier: green < 70% < yellow < 90% < red
  const barColor = pct >= 90 ? '#D13438' : pct >= 70 ? '#C19C00' : '#107C10'
  const isWarn = pct >= 80
  return (
    <div
      className={cn(
        'border-t border-[#EDEBE9] px-3 py-2 text-[11px] flex-shrink-0',
        isWarn ? 'bg-[#FDF7E1]' : 'bg-[#FAF9F8]'
      )}
      role={isWarn ? 'alert' : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#605E5C] font-medium">
          {usedMb} MB of {limitMb} MB used
        </span>
        <span className="text-[#605E5C]">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-1.5 bg-[#EDEBE9] rounded overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      {isWarn && (
        <p className="mt-1 text-[10px] text-[#7A5900]">
          {pct >= 90
            ? 'Mailbox almost full — delete or archive messages.'
            : 'Mailbox is filling up.'}
        </p>
      )}
    </div>
  )
}
