'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasks } from '@/lib/api'
import type { Task } from '@/lib/api'
import { Star, Calendar, Circle, CheckCircle2, RotateCw } from 'lucide-react'
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
        'flex items-center px-4 py-2.5 border-b border-[#EDEBE9] cursor-pointer transition-colors group',
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
        className="flex-shrink-0 w-8 text-[#605E5C] hover:text-[#0078D4] transition-colors"
      >
        {task.is_completed ? (
          <CheckCircle2 size={18} className="text-[#0078D4]" />
        ) : (
          <Circle size={18} />
        )}
      </button>

      {/* Title — recurrence badge sits inline so the user can spot a repeating
          task without opening the detail panel. To Do shows the same icon. */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm text-[#323130] flex items-center gap-1.5',
            task.is_completed && 'line-through text-[#605E5C]'
          )}
        >
          <span className="truncate">{task.title}</span>
          {task.recurrence_rule?.frequency && (
            <span
              title={`Repeats ${task.recurrence_rule.frequency}`}
              aria-label={`Repeats ${task.recurrence_rule.frequency}`}
              className="inline-flex items-center gap-0.5 text-[10px] text-[#605E5C] bg-[#F3F2F1] border border-[#EDEBE9] rounded px-1 py-0.5 flex-shrink-0"
            >
              <RotateCw size={9} />
              {task.recurrence_rule.frequency.charAt(0).toUpperCase()
                + task.recurrence_rule.frequency.slice(1)}
            </span>
          )}
        </p>
      </div>

      {/* Due date column */}
      <div className="w-24 text-center flex-shrink-0">
        {task.due_date && (
          <div className="flex items-center justify-center gap-1">
            <Calendar size={11} className="text-[#605E5C]" />
            <span className="text-xs text-[#605E5C]">
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          </div>
        )}
      </div>

      {/* Importance star column */}
      <div className="w-20 flex justify-center flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            importanceMutation.mutate()
          }}
          aria-label={task.importance === 'high' ? 'Remove importance' : 'Mark as important'}
          className={cn(
            'transition-colors',
            task.importance === 'high'
              ? 'text-[#0078D4]'
              : 'text-[#D2D0CE] hover:text-[#0078D4]'
          )}
        >
          <Star
            size={16}
            className={task.importance === 'high' ? 'fill-[#0078D4]' : ''}
          />
        </button>
      </div>
    </div>
  )
}