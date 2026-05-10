'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasks, messages } from '@/lib/api'
import type { Task, Message } from '@/lib/api'
import { TaskItem } from './TaskItem'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { CheckSquare, Plus, Flag, Mail, ClipboardList, Search, RefreshCw } from 'lucide-react'
import { formatMessageDate } from '@/lib/utils'

interface TaskListViewProps {
  listId: string | null
  onSelectTask?: (task: Task) => void
  selectedTaskId?: string | null
}

export function TaskListView({ listId, onSelectTask, selectedTaskId }: TaskListViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const queryClient = useQueryClient()

  const getQueryParams = () => {
    if (!listId || listId === 'all' || listId === 'my-day' || listId === 'planned') return {}
    if (listId === 'important') return { importance: 'high' }
    if (listId === 'flagged') return {}
    return { list_id: listId }
  }

  const isFlaggedView = listId === 'flagged'

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', listId],
    queryFn: () => tasks.list(getQueryParams()),
    enabled: !isFlaggedView,
  })

  const { data: flaggedData, isLoading: flaggedLoading } = useQuery({
    queryKey: ['messages-flagged'],
    queryFn: () => messages.list({ is_flagged: true, per_page: 100 }),
    enabled: isFlaggedView,
  })

  const taskList = data?.items ?? []
  const flaggedMessages = flaggedData?.items ?? []

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      tasks.create({
        title,
        list_id: listId && !['all', 'important', 'planned', 'flagged', 'my-day'].includes(listId)
          ? listId
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setNewTaskTitle('')
    },
  })

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTaskTitle.trim()) {
      createMutation.mutate(newTaskTitle.trim())
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Add task input — matching Outlook */}
      <div className="border-b border-[#EDEBE9] bg-white flex-shrink-0">
        <form
          onSubmit={handleAddTask}
          className="flex items-center gap-2 px-4 py-3"
        >
          <span className="w-5 h-5 rounded-full border-2 border-[#0078D4] flex-shrink-0" />
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task"
            aria-label="Add a task"
            className="flex-1 text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none"
          />
        </form>
        {/* Secondary action row */}
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Set due date" className="p-1 text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors">
              <ClipboardList size={14} />
            </button>
            <button type="button" aria-label="Search tasks" className="p-1 text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors">
              <Search size={14} />
            </button>
            <button type="button" aria-label="Sync" className="p-1 text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => { if (newTaskTitle.trim()) createMutation.mutate(newTaskTitle.trim()) }}
            disabled={!newTaskTitle.trim()}
            className="text-xs text-[#0078D4] font-medium px-3 py-1 rounded hover:bg-[#EBF3FB] disabled:text-[#A19F9D] disabled:hover:bg-transparent transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Table header */}
      {!isFlaggedView && taskList.length > 0 && (
        <div className="flex items-center px-4 py-2 border-b border-[#EDEBE9] bg-[#FAF9F8] text-xs font-medium text-[#605E5C] flex-shrink-0">
          <span className="w-8" />
          <span className="flex-1">Title</span>
          <span className="w-24 text-center">Due Date</span>
          <span className="w-20 text-center">Importance</span>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar" role="list" aria-label="Task list">
        {isFlaggedView ? (
          flaggedLoading ? (
            <SpinnerOverlay />
          ) : flaggedMessages.length === 0 ? (
            <EmptyState
              icon={Flag}
              title="No flagged messages"
              description="Flag a message to surface it here."
            />
          ) : (
            flaggedMessages.map((msg) => (
              <FlaggedMessageItem key={msg.id} message={msg} />
            ))
          )
        ) : isLoading ? (
          <SpinnerOverlay />
        ) : taskList.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="All done"
            description="Nothing to do here. Add a task above to get started."
          />
        ) : (
          (() => {
            // Group sublists under their parent so the list renders as a
            // nested tree. Top-level (parent_task_id == null) drives the
            // outer iteration; subtasks render indented underneath.
            const childrenOf = new Map<string, Task[]>()
            for (const t of taskList) {
              if (t.parent_task_id) {
                if (!childrenOf.has(t.parent_task_id)) childrenOf.set(t.parent_task_id, [])
                childrenOf.get(t.parent_task_id)!.push(t)
              }
            }
            const topLevel = taskList.filter((t) => !t.parent_task_id)
            const renderRow = (task: Task, depth: number): React.ReactNode => {
              const subs = childrenOf.get(task.id) ?? []
              return (
                <div key={task.id}>
                  <div style={{ paddingLeft: depth * 24 }}>
                    <TaskItem
                      task={task}
                      selected={selectedTaskId === task.id}
                      onClick={() => onSelectTask?.(task)}
                    />
                  </div>
                  {subs.map((sub) => renderRow(sub, depth + 1))}
                </div>
              )
            }
            return topLevel.map((t) => renderRow(t, 0))
          })()
        )}
      </div>
    </div>
  )
}

function FlaggedMessageItem({ message }: { message: Message }) {
  const senderName = message.from_name || message.from_address.split('@')[0]
  const dateStr = message.received_at ?? message.created_at
  return (
    <div
      role="listitem"
      className="flex items-start gap-3 px-4 py-3 border-b border-[#EDEBE9] hover:bg-[#F3F2F1] transition-colors cursor-pointer"
    >
      <Flag size={14} className="text-[#D13438] fill-[#D13438] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-[#323130] truncate">{message.subject || '(no subject)'}</span>
          <span className="text-xs text-[#605E5C] flex-shrink-0">{formatMessageDate(dateStr)}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Mail size={11} className="text-[#605E5C]" />
          <span className="text-xs text-[#605E5C] truncate">{senderName}</span>
        </div>
      </div>
    </div>
  )
}
