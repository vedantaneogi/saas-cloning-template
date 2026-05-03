'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasks } from '@/lib/api'
import type { Task } from '@/lib/api'
import { Star, Calendar, Circle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface TaskItemProps {
  task: Task
  selected?: boolean
  onClick?: () => void
}

export function TaskItem({ task, selected, onClick }: TaskItemProps) {
  const queryClient = useQueryClient()

  const completeMutation = useMutation({
    mutationFn: () =>
      task.is_completed ? tasks.uncomplete(task.id) : tasks.complete(task.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const importanceMutation = useMutation({
    mutationFn: () =>
      tasks.update(task.id, {
        importance: task.importance === 'high' ? 'normal' : 'high',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  return (
    <div
      role="listitem"
      data-testid="task-item"
      aria-selected={selected}
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-[#EDEBE9] cursor-pointer transition-colors group',
        selected ? 'bg-[#EBF3FB]' : 'hover:bg-[#F3F2F1]',
        task.is_completed && 'opacity-60'
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          completeMutation.mutate()
        }}
        aria-label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
        className="flex-shrink-0 text-[#605E5C] hover:text-[#0078D4] transition-colors"
      >
        {task.is_completed ? (
          <CheckCircle2 size={18} className="text-[#0078D4]" />
        ) : (
          <Circle size={18} />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0" aria-label={task.title}>
        <p
          className={cn(
            'text-sm text-[#323130]',
            task.is_completed && 'line-through text-[#605E5C]'
          )}
        >
          {task.title}
        </p>
        {task.due_date && (
          <div className="flex items-center gap-1 mt-0.5">
            <Calendar size={11} className="text-[#605E5C]" />
            <span className="text-xs text-[#605E5C]">
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          </div>
        )}
      </div>

      {/* Star for importance */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          importanceMutation.mutate()
        }}
        aria-label={task.importance === 'high' ? 'Remove importance' : 'Mark as important'}
        className={cn(
          'flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100',
          task.importance === 'high' && 'opacity-100 text-[#FFB900]'
        )}
      >
        <Star
          size={15}
          className={task.importance === 'high' ? 'fill-[#FFB900]' : 'text-[#605E5C]'}
        />
      </button>
    </div>
  )
}
