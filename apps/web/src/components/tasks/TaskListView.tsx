'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasks } from '@/lib/api'
import type { Task } from '@/lib/api'
import { TaskItem } from './TaskItem'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { CheckSquare, Plus } from 'lucide-react'

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

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', listId],
    queryFn: () => tasks.list(getQueryParams()),
  })

  const taskList = data?.items ?? []

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

      {/* Task list */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar" role="list" aria-label="Task list">
        {isLoading ? (
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
