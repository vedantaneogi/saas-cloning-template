
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { folders } from '@/lib/api'
import type { Folder } from '@/lib/api'
import { Button } from './Button'
import { Input } from './Input'
import { ChevronDown, FolderPlus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FolderPickerProps {
  folderList: Folder[]
  /**
   * Either the selected folder id (returns id via onSelect) OR the slug
   * (returns slug via onSelect). Controlled by `mode`.
   */
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  /** Picker key — `id` returns folder.id, `slug` returns folder.slug. */
  mode?: 'id' | 'slug'
  className?: string
  placeholder?: string
}

/**
 * Outlook-style folder picker. Used by Rules, Quick Steps, and anywhere else
 * the user needs to choose a folder. Features:
 * - Search box at the top.
 * - System folders (Inbox/Drafts/etc) and user folders grouped separately.
 * - Inline "Create new folder" form that creates and immediately selects.
 * - Outside-click closes; portal-friendly via the wrap ref.
 */
export function FolderPicker({
  folderList,
  value,
  onChange,
  ariaLabel,
  mode = 'id',
  className,
  placeholder = 'Select a folder',
}: FolderPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [creatingErr, setCreatingErr] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setNewName('')
        setCreatingErr(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const createMutation = useMutation({
    mutationFn: (name: string) => folders.create({ name }),
    onSuccess: (folder) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      onChange(mode === 'slug' ? folder.slug : folder.id)
      setCreating(false)
      setNewName('')
      setCreatingErr(null)
      setOpen(false)
    },
    onError: () => setCreatingErr('Could not create folder'),
  })

  const selected = folderList.find(
    (f) => (mode === 'slug' ? f.slug : f.id) === value
  )
  const systemFolders = folderList.filter((f) => f.is_system)
  const userFolders = folderList.filter((f) => !f.is_system)
  const q = query.trim().toLowerCase()
  const matchesQuery = (f: Folder) => !q || f.name.toLowerCase().includes(q)

  const pick = (f: Folder) => {
    onChange(mode === 'slug' ? f.slug : f.id)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between gap-2 text-sm border border-[#8A8886] bg-white rounded px-2 py-1.5 text-left text-[#323130] hover:border-[#605E5C] focus:outline-none focus:border-[#0078D4]"
      >
        <span className={cn('truncate', !selected && 'text-[#A19F9D]')}>
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown size={12} className="text-[#605E5C] flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg max-h-80 overflow-y-auto min-w-[220px]">
          <div className="px-2 py-2 border-b border-[#EDEBE9] sticky top-0 bg-white">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A19F9D]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a folder"
                aria-label="Search folders"
                autoFocus
                className="w-full text-xs border border-[#EDEBE9] rounded pl-6 pr-2 py-1 focus:outline-none focus:border-[#0078D4]"
              />
            </div>
          </div>

          {systemFolders.filter(matchesQuery).length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase text-[#605E5C] tracking-wide">
                System
              </p>
              {systemFolders.filter(matchesQuery).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => pick(f)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm hover:bg-[#F3F2F1]',
                    selected?.id === f.id && 'bg-[#EFF6FC] text-[#0078D4]'
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}

          {userFolders.filter(matchesQuery).length > 0 && (
            <div className="py-1 border-t border-[#EDEBE9]">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase text-[#605E5C] tracking-wide">
                Your folders
              </p>
              {userFolders.filter(matchesQuery).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => pick(f)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm hover:bg-[#F3F2F1]',
                    selected?.id === f.id && 'bg-[#EFF6FC] text-[#0078D4]'
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-[#EDEBE9] py-1">
            {creating ? (
              <div className="px-3 py-2 space-y-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New folder name"
                  aria-label="New folder name"
                  autoFocus
                />
                {creatingErr && <p className="text-xs text-[#D13438]">{creatingErr}</p>}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
                    disabled={!newName.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Creating…' : 'Create'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setCreating(false); setNewName('') }}
                    className="text-xs text-[#605E5C] hover:text-[#323130]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full text-left px-3 py-1.5 text-sm text-[#0078D4] hover:bg-[#F3F2F1] flex items-center gap-2"
              >
                <FolderPlus size={14} />
                Create new folder
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
