'use client'

import { useQuery } from '@tanstack/react-query'
import { taskLists } from '@/lib/api'
import { Sun, Star, Calendar, Flag, List, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const { data: lists = [] } = useQuery({
    queryKey: ['task-lists'],
    queryFn: () => taskLists.list(),
  })

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
        <button
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-[#605E5C] hover:bg-[#EDEBE9] transition-colors"
          aria-label="New list"
        >
          <Plus size={16} />
          New list
        </button>
      </div>
    </nav>
  )
}
