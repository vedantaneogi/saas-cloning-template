'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasks, messages } from '@/lib/api'
import type { Task, Message } from '@/lib/api'
import { TaskItem } from './TaskItem'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { CheckSquare, Plus, Flag, Mail } from 'lucide-react'
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
      {/* Add task input */}
      <form
        onSubmit={handleAddTask}
        className="flex items-center gap-2 px-4 py-3 border-b border-[#EDEBE9] bg-white flex-shrink-0"
      >
        <Plus size={16} className="text-[#0078D4] flex-shrink-0" />
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a task"
          aria-label="Add a task"
          className="flex-1 text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none"
        />
      </form>

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
          taskList.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              onClick={() => onSelectTask?.(task)}
            />
          ))
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
