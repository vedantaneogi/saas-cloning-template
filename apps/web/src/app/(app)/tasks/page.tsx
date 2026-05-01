'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasks } from '@/lib/api'
import type { Task, TaskStep } from '@/lib/api'
import { TaskSidebar } from '@/components/tasks/TaskSidebar'
import { TaskListView } from '@/components/tasks/TaskListView'
import { CheckSquare, Sun, Calendar, Bell, Trash2, Circle, CheckCircle2, Star, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

function TaskDetailPanel({ task, onClose, onDeleted }: { task: Task; onClose: () => void; onDeleted: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(task.title)
  const [body, setBody] = useState(task.body ?? '')
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : '')
  const [reminderAt, setReminderAt] = useState(task.reminder_at ? task.reminder_at.slice(0, 16) : '')
  const [steps, setSteps] = useState<TaskStep[]>(task.steps ?? [])
  const [newStep, setNewStep] = useState('')
  const newStepRef = useRef<HTMLInputElement>(null)

  // Re-sync when a different task is selected
  useEffect(() => {
    setTitle(task.title)
    setBody(task.body ?? '')
    setDueDate(task.due_date ? task.due_date.slice(0, 10) : '')
    setReminderAt(task.reminder_at ? task.reminder_at.slice(0, 16) : '')
    setSteps(task.steps ?? [])
  }, [task.id, task.title, task.body, task.due_date, task.reminder_at, task.steps])

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Task>) => tasks.update(task.id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const completeMutation = useMutation({
    mutationFn: () => task.is_completed ? tasks.uncomplete(task.id) : tasks.complete(task.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => tasks.delete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onDeleted()
    },
  })

  const saveTitle = () => {
    if (title.trim() && title !== task.title) updateMutation.mutate({ title: title.trim() })
  }

  const saveBody = () => {
    if (body !== (task.body ?? '')) updateMutation.mutate({ body })
  }

  const saveDueDate = (val: string) => {
    setDueDate(val)
    updateMutation.mutate({ due_date: val ? `${val}T00:00:00` : null })
  }

  const saveReminder = (val: string) => {
    setReminderAt(val)
    updateMutation.mutate({ reminder_at: val ? new Date(val).toISOString() : null })
  }

  const toggleMyDay = () => {
    const today = new Date().toISOString().slice(0, 10)
    const isMyDay = task.due_date?.startsWith(today)
    saveDueDate(isMyDay ? '' : today)
  }

  const saveSteps = (nextSteps: TaskStep[]) => {
    setSteps(nextSteps)
    updateMutation.mutate({ steps: nextSteps } as never)
  }

  const addStep = () => {
    const trimmed = newStep.trim()
    if (!trimmed) return
    const next: TaskStep[] = [
      ...steps,
      { id: crypto.randomUUID(), title: trimmed, is_completed: false },
    ]
    saveSteps(next)
    setNewStep('')
  }

  const toggleStep = (id: string) => {
    const next = steps.map((s) =>
      s.id === id ? { ...s, is_completed: !s.is_completed } : s
    )
    saveSteps(next)
  }

  const deleteStep = (id: string) => {
    saveSteps(steps.filter((s) => s.id !== id))
  }

  const isMyDay = task.due_date?.startsWith(new Date().toISOString().slice(0, 10))
  const isImportant = task.importance === 'high'
  const completedSteps = steps.filter((s) => s.is_completed).length

  return (
    <div className="w-80 border-l border-[#EDEBE9] bg-white flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#EDEBE9]">
        <button
          onClick={() => completeMutation.mutate()}
          aria-label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
          className="flex-shrink-0 text-[#605E5C] hover:text-[#0078D4] transition-colors"
        >
          {task.is_completed
            ? <CheckCircle2 size={18} className="text-[#0078D4]" />
            : <Circle size={18} />}
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          aria-label="Task title"
          className={cn(
            'flex-1 text-sm font-semibold text-[#323130] focus:outline-none bg-transparent',
            task.is_completed && 'line-through text-[#605E5C]'
          )}
        />
        <button
          onClick={() => updateMutation.mutate({ importance: isImportant ? 'normal' : 'high' })}
          aria-label={isImportant ? 'Remove importance' : 'Mark important'}
          className={cn('flex-shrink-0', isImportant ? 'text-[#FFB900]' : 'text-[#605E5C] hover:text-[#FFB900]')}
        >
          <Star size={15} className={isImportant ? 'fill-[#FFB900]' : ''} />
        </button>
        <button
          onClick={onClose}
          aria-label="Close task detail"
          className="text-[#605E5C] hover:text-[#323130] text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto outlook-scrollbar">
        {/* My Day toggle */}
        <button
          onClick={toggleMyDay}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-3 border-b border-[#EDEBE9] text-sm transition-colors hover:bg-[#F3F2F1]',
            isMyDay ? 'text-[#0078D4]' : 'text-[#605E5C]'
          )}
        >
          <Sun size={16} />
          {isMyDay ? 'Added to My Day' : 'Add to My Day'}
        </button>

        {/* Steps / subtasks */}
        <div className="border-b border-[#EDEBE9]">
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-[#605E5C]">
              Steps{steps.length > 0 && ` (${completedSteps}/${steps.length})`}
            </p>
          </div>

          {/* Existing steps */}
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-2 px-4 py-1.5 group hover:bg-[#F3F2F1]"
            >
              <button
                onClick={() => toggleStep(step.id)}
                aria-label={step.is_completed ? 'Mark step incomplete' : 'Mark step complete'}
                className="flex-shrink-0 text-[#605E5C] hover:text-[#0078D4] transition-colors"
              >
                {step.is_completed
                  ? <CheckCircle2 size={14} className="text-[#0078D4]" />
                  : <Circle size={14} />}
              </button>
              <span className={cn(
                'flex-1 text-sm text-[#323130]',
                step.is_completed && 'line-through text-[#A19F9D]'
              )}>
                {step.title}
              </span>
              <button
                onClick={() => deleteStep(step.id)}
                aria-label={`Delete step: ${step.title}`}
                className="flex-shrink-0 text-[#605E5C] hover:text-[#D13438] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Add new step */}
          <div className="flex items-center gap-2 px-4 py-2">
            <Plus size={14} className="text-[#0078D4] flex-shrink-0" />
            <input
              ref={newStepRef}
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addStep()
                if (e.key === 'Escape') setNewStep('')
              }}
              onBlur={addStep}
              placeholder="Add step"
              aria-label="Add a step"
              className="flex-1 text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Due date */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDEBE9]">
          <Calendar size={16} className="text-[#605E5C] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-[#605E5C] mb-1">Due date</p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => saveDueDate(e.target.value)}
              aria-label="Due date"
              className="text-sm text-[#323130] border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] w-full"
            />
          </div>
        </div>

        {/* Reminder */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDEBE9]">
          <Bell size={16} className="text-[#605E5C] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-[#605E5C] mb-1">Remind me</p>
            <input
              type="datetime-local"
              value={reminderAt}
              onChange={(e) => saveReminder(e.target.value)}
              aria-label="Reminder"
              className="text-sm text-[#323130] border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] w-full"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="px-4 py-3 border-b border-[#EDEBE9]">
          <p className="text-xs text-[#605E5C] mb-2">Notes</p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={saveBody}
            placeholder="Add a note"
            aria-label="Task notes"
            rows={4}
            className="w-full text-sm text-[#323130] placeholder:text-[#A19F9D] border border-[#EDEBE9] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0078D4] resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#EDEBE9] flex items-center justify-between">
        <span className="text-xs text-[#605E5C]">
          Created {new Date(task.created_at).toLocaleDateString()}
        </span>
        <button
          onClick={() => deleteMutation.mutate()}
          aria-label="Delete task"
          className="text-[#605E5C] hover:text-[#D13438] transition-colors p-1 rounded hover:bg-[#FDE7E9]"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [selectedListId, setSelectedListId] = useState<string>('my-day')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const listName: Record<string, string> = {
    'my-day': 'My Day',
    important: 'Important',
    planned: 'Planned',
    flagged: 'Flagged email',
    all: 'Tasks',
  }

  return (
    <div className="h-full flex overflow-hidden">
      <TaskSidebar selectedListId={selectedListId} onSelect={setSelectedListId} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EDEBE9] bg-white flex-shrink-0">
          <h1 className="text-base font-semibold text-[#323130]">
            {listName[selectedListId] ?? selectedListId}
          </h1>
        </div>
        <TaskListView
          listId={selectedListId}
          selectedTaskId={selectedTask?.id ?? null}
          onSelectTask={setSelectedTask}
        />
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDeleted={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
