'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quickSteps, folders } from '@/lib/api'
import type { QuickStep } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FolderPicker } from '@/components/ui/FolderPicker'
import { Plus, Trash2, Zap } from 'lucide-react'

const ACTION_TYPES = [
  { value: 'reply', label: 'Reply' },
  { value: 'reply_all', label: 'Reply all' },
  { value: 'forward', label: 'Forward' },
  { value: 'mark_read', label: 'Mark as read' },
  { value: 'mark_unread', label: 'Mark as unread' },
  { value: 'flag', label: 'Flag message' },
  { value: 'unflag', label: 'Remove flag' },
  { value: 'move_to_folder', label: 'Move to folder' },
  { value: 'delete', label: 'Delete' },
]

export function QuickStepSettings() {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newActions, setNewActions] = useState<{ type: string; params: Record<string, string> }[]>([])

  const { data: folderList = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  const { data: stepList = [], isLoading } = useQuery({
    queryKey: ['quick-steps'],
    queryFn: () => quickSteps.list(),
  })

  const createMutation = useMutation({
    mutationFn: () => quickSteps.create({ name: newName, actions: newActions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-steps'] })
      setCreating(false)
      setNewName('')
      setNewActions([])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quickSteps.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quick-steps'] }),
  })

  const addAction = () => setNewActions((a) => [...a, { type: 'mark_read', params: {} }])
  const removeAction = (i: number) => setNewActions((a) => a.filter((_, idx) => idx !== i))
  const updateActionType = (i: number, type: string) =>
    setNewActions((a) => a.map((act, idx) => (idx === i ? { ...act, type, params: {} } : act)))
  const updateActionParam = (i: number, key: string, value: string) =>
    setNewActions((a) =>
      a.map((act, idx) => (idx === i ? { ...act, params: { ...act.params, [key]: value } } : act))
    )

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-[#323130]">Quick Steps</h2>
          <p className="text-xs text-[#605E5C] mt-0.5">One-click multi-action macros for messages</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} aria-label="Create quick step">
          <Plus size={14} /> New quick step
        </Button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="border border-[#EDEBE9] rounded p-4 mb-4 bg-[#FAF9F8]">
          <div className="mb-3">
            <label className="block text-xs font-medium text-[#605E5C] mb-1">Name</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Archive and mark read"
              aria-label="Quick step name"
            />
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#605E5C]">Actions</label>
              <button
                type="button"
                onClick={addAction}
                className="text-xs text-[#0078D4] hover:underline"
              >
                + Add action
              </button>
            </div>
            {newActions.length === 0 && (
              <p className="text-xs text-[#A19F9D]">No actions yet. Click + Add action.</p>
            )}
            {newActions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Select
                  value={action.type}
                  onChange={(v) => updateActionType(i, v)}
                  options={ACTION_TYPES}
                  ariaLabel={`Action ${i + 1} type`}
                  className="flex-1"
                />
                {action.type === 'move_to_folder' && (
                  <FolderPicker
                    folderList={folderList}
                    value={action.params.folder ?? ''}
                    onChange={(v) => updateActionParam(i, 'folder', v)}
                    ariaLabel="Target folder"
                    className="w-48"
                  />
                )}
                <button type="button" onClick={() => removeAction(i)} className="text-[#D13438]">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || newActions.length === 0}
            >
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setCreating(false); setNewName(''); setNewActions([]) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-[#605E5C]">Loading...</p>
      ) : stepList.length === 0 && !creating ? (
        <p className="text-sm text-[#605E5C]">No quick steps yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {stepList.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between px-4 py-3 border border-[#EDEBE9] rounded bg-white hover:bg-[#FAF9F8] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Zap size={16} className="text-[#0078D4]" />
                <div>
                  <p className="text-sm font-medium text-[#323130]">{step.name}</p>
                  <p className="text-xs text-[#605E5C]">
                    {step.actions.map((a) => ACTION_TYPES.find((t) => t.value === a.type)?.label ?? a.type).join(' → ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(step.id)}
                aria-label={`Delete ${step.name}`}
                className="text-[#605E5C] hover:text-[#D13438] transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
