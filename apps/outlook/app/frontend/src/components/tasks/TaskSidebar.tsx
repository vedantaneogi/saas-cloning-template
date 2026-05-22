
import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { taskLists } from '@/lib/api'
import { Sun, Star, Calendar, Flag, List, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui'

interface TaskSidebarProps {
  selectedListId: string | null
  onSelect: (id: string) => void
}

const SMART_LISTS = [
  { id: 'my-day', label: 'My Day', icon: <Sun size={16} /> },
  { id: 'important', label: 'Important', icon: <Star size={16} /> },
  { id: 'planned', label: 'Planned', icon: <Calendar size={16} /> },
  { id: 'flagged', label: 'Flagged email', icon: <Flag size={16} /> },
  { id: 'all', label: 'Tasks', icon: <List size={16} /> },
]

export function TaskSidebar({ selectedListId, onSelect }: TaskSidebarProps) {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const [newListMode, setNewListMode] = useState(false)
  const [newListName, setNewListName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: lists = [] } = useQuery({
    queryKey: ['task-lists'],
    queryFn: () => taskLists.list(),
  })

  const createListMutation = useMutation({
    mutationFn: (name: string) => taskLists.create({ name }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['task-lists'] })
      setNewListName('')
      setNewListMode(false)
      onSelect(created.id)
      showNotification(`List "${created.name}" created`)
    },
    onError: () => showNotification('Failed to create list'),
  })

  // Focus the input the moment we enter creation mode.
  useEffect(() => {
    if (newListMode) inputRef.current?.focus()
  }, [newListMode])

  const submitNewList = () => {
    const name = newListName.trim()
    if (!name) {
      setNewListMode(false)
      return
    }
    createListMutation.mutate(name)
  }

  return (
    <nav
      aria-label="Task lists"
      className="w-56 flex-shrink-0 bg-[#F3F2F1] border-r border-[#EDEBE9] flex flex-col h-full"
    >
      <div className="p-3">
        <h2 className="text-sm font-semibold text-[#323130] mb-2">To Do</h2>
      </div>

      {/* Smart lists */}
      <ul className="px-1 space-y-0.5">
        {SMART_LISTS.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item.id)}
              aria-label={item.label}
              aria-selected={selectedListId === item.id}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors',
                selectedListId === item.id
                  ? 'bg-[#EDEBE9] text-[#0078D4] font-medium'
                  : 'text-[#323130] hover:bg-[#EDEBE9]'
              )}
            >
              <span className={selectedListId === item.id ? 'text-[#0078D4]' : 'text-[#605E5C]'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      {lists.length > 0 && (
        <>
          <div className="h-px bg-[#EDEBE9] mx-3 my-2" />
          <ul className="px-1 space-y-0.5 flex-1 overflow-y-auto outlook-scrollbar">
            {lists.map((list) => (
              <li key={list.id}>
                <button
                  onClick={() => onSelect(list.id)}
                  aria-label={list.name}
                  aria-selected={selectedListId === list.id}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors',
                    selectedListId === list.id
                      ? 'bg-[#EDEBE9] text-[#0078D4] font-medium'
                      : 'text-[#323130] hover:bg-[#EDEBE9]'
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: list.color ?? '#0078D4' }}
                  />
                  <span className="flex-1 truncate text-left">{list.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="p-2 border-t border-[#EDEBE9]">
        {newListMode ? (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-white border border-[#0078D4] rounded">
            <List size={14} className="text-[#0078D4] flex-shrink-0" />
            <input
              ref={inputRef}
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNewList()
                if (e.key === 'Escape') { setNewListName(''); setNewListMode(false) }
              }}
              onBlur={submitNewList}
              placeholder="List name"
              aria-label="New list name"
              className="flex-1 text-sm text-[#323130] focus:outline-none bg-transparent"
            />
          </div>
        ) : (
          <button
            onClick={() => setNewListMode(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-[#605E5C] hover:bg-[#EDEBE9] transition-colors"
            aria-label="New list"
          >
            <Plus size={16} />
            New list
          </button>
        )}
      </div>
    </nav>
  )
}
