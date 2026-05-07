'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rules, folders } from '@/lib/api'
import type { Rule, RuleCondition, RuleAction } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, Edit2, Play, ToggleLeft, ToggleRight, CheckCircle2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'

export function RuleSettings() {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [creating, setCreating] = useState(false)
  const [runResult, setRunResult] = useState<{ ruleId: string; matched: number } | null>(null)
  const [runPickerRuleId, setRunPickerRuleId] = useState<string | null>(null)
  const [runFolderId, setRunFolderId] = useState<string>('')

  const { data: ruleList = [], isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: () => rules.list(),
  })

  const { data: folderList = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folders.list(),
  })

  const inboxFolder = folderList.find((f) => f.slug === 'inbox')

  const openRunPicker = (ruleId: string) => {
    setRunPickerRuleId(ruleId)
    setRunFolderId(inboxFolder?.id ?? folderList[0]?.id ?? '')
  }

  const toggleMutation = useMutation({
    mutationFn: (rule: Rule) => rules.update(rule.id, { is_enabled: !rule.is_enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rules.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
  })

  const reorderMutation = useMutation({
    mutationFn: (ordered_ids: string[]) => rules.reorder(ordered_ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rules'] }),
  })

  const moveRule = (index: number, direction: 'up' | 'down') => {
    const newList = [...ruleList]
    const swapIdx = direction === 'up' ? index - 1 : index + 1
    if (swapIdx < 0 || swapIdx >= newList.length) return
    ;[newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]]
    reorderMutation.mutate(newList.map((r) => r.id))
  }

  const runMutation = useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string }) =>
      rules.run(id, folderId),
    onSuccess: (data, { id }) => {
      const matched = ((data as unknown) as { matched: number })?.matched ?? 0
      setRunResult({ ruleId: id, matched })
      showNotification(`Rule applied: ${matched} message${matched !== 1 ? 's' : ''} matched`)
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setRunPickerRuleId(null)
      setTimeout(() => setRunResult(null), 3000)
    },
  })

  return (
    <div className="max-w-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#323130]">Rules</h2>
        <Button
          size="sm"
          onClick={() => { setCreating(true); setEditing(null) }}
          aria-label="New rule"
        >
          <Plus size={14} />
          New rule
        </Button>
      </div>

      {/* Rule list */}
      <div className="border border-[#EDEBE9] rounded overflow-hidden mb-6">
        <div className="grid grid-cols-[auto,auto,1fr,auto] gap-3 px-4 py-2 bg-[#F3F2F1] border-b border-[#EDEBE9] text-xs font-medium text-[#605E5C]">
          <span className="w-9">On</span>
          <span className="w-16">Priority</span>
          <span>Rule name</span>
          <span>Actions</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-4 text-sm text-[#605E5C]">Loading...</div>
        ) : ruleList.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-[#605E5C]">
            No rules yet. Create a rule to automate your email.
          </div>
        ) : (
          ruleList.map((rule, idx) => (
            <div
              key={rule.id}
              className="grid grid-cols-[auto,auto,1fr,auto] items-center gap-3 px-4 py-3 border-b border-[#EDEBE9] hover:bg-[#F3F2F1] transition-colors"
            >
              {/* On/Off — proper switch instead of just an icon, with label so the
                  state is unambiguous. */}
              <button
                onClick={() => toggleMutation.mutate(rule)}
                aria-label={rule.is_enabled ? `Disable ${rule.name}` : `Enable ${rule.name}`}
                aria-pressed={rule.is_enabled}
                role="switch"
                title={rule.is_enabled ? 'On' : 'Off'}
                className={cn(
                  'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-1',
                  rule.is_enabled ? 'bg-[#0078D4]' : 'bg-[#D2D0CE]'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform',
                    rule.is_enabled ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </button>

              {/* Order — numbered badge + small inline up/down arrows */}
              <div className="flex items-center gap-1.5 w-16">
                <span
                  aria-label={`Priority ${idx + 1}`}
                  className="inline-flex items-center justify-center min-w-[20px] h-5 rounded bg-[#F3F2F1] text-[11px] font-semibold text-[#605E5C] px-1"
                >
                  {idx + 1}
                </span>
                <div className="flex flex-col">
                  <button
                    onClick={() => moveRule(idx, 'up')}
                    disabled={idx === 0 || reorderMutation.isPending}
                    aria-label={`Move ${rule.name} up`}
                    className="text-[#605E5C] hover:text-[#0078D4] disabled:opacity-30 leading-none"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => moveRule(idx, 'down')}
                    disabled={idx === ruleList.length - 1 || reorderMutation.isPending}
                    aria-label={`Move ${rule.name} down`}
                    className="text-[#605E5C] hover:text-[#0078D4] disabled:opacity-30 leading-none"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>

              {/* Name + summary */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#323130] truncate">{rule.name}</p>
                <p className="text-xs text-[#605E5C]">
                  {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''},{' '}
                  {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
                  {' · '}
                  <span className={rule.is_enabled ? 'text-[#107C10]' : 'text-[#605E5C]'}>
                    {rule.is_enabled ? 'On' : 'Off'}
                  </span>
                </p>
              </div>

              {/* Actions — always visible, larger hit targets */}
              <div className="flex items-center gap-1 relative">
                <button
                  onClick={() => openRunPicker(rule.id)}
                  disabled={runMutation.isPending}
                  aria-label={`Run ${rule.name} on a folder`}
                  title="Run now on folder"
                  className="text-[#605E5C] hover:text-[#0078D4] hover:bg-[#EDEBE9] rounded p-1.5 flex items-center gap-0.5"
                >
                  {runResult?.ruleId === rule.id
                    ? <CheckCircle2 size={14} className="text-[#107C10]" />
                    : <Play size={14} />}
                </button>
                <button
                  onClick={() => { setEditing(rule); setCreating(false) }}
                  aria-label={`Edit ${rule.name}`}
                  className="text-[#605E5C] hover:text-[#323130] hover:bg-[#EDEBE9] rounded p-1.5"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(rule.id)}
                  aria-label={`Delete ${rule.name}`}
                  className="text-[#605E5C] hover:text-[#D13438] hover:bg-[#FDE7E9] rounded p-1.5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor — keyed on the rule id (or "new") so React remounts the form
          when the user picks a different rule, otherwise useState clings to
          the previous rule's conditions/actions and the save clobbers them. */}
      {(creating || editing) && (
        <RuleEditor
          key={editing?.id ?? 'new'}
          rule={editing ?? undefined}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['rules'] })
            setEditing(null)
            setCreating(false)
          }}
          onCancel={() => { setEditing(null); setCreating(false) }}
        />
      )}

      {/* Run-on-folder modal — centred overlay so it never gets clipped by
          the rules table column. */}
      {runPickerRuleId && (() => {
        const rule = ruleList.find((r) => r.id === runPickerRuleId)
        if (!rule) return null
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Run rule on folder`}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setRunPickerRuleId(null) }}
          >
            <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
            <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-sm flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9]">
                <h2 className="text-base font-semibold text-[#323130]">
                  Run &ldquo;{rule.name}&rdquo;
                </h2>
                <button
                  onClick={() => setRunPickerRuleId(null)}
                  aria-label="Close"
                  className="p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C]"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="px-4 py-4 space-y-2">
                <p className="text-sm text-[#605E5C]">
                  Choose a folder. The rule will run against every message in it.
                </p>
                <select
                  value={runFolderId}
                  onChange={(e) => setRunFolderId(e.target.value)}
                  aria-label="Select folder"
                  className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                >
                  {folderList.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#EDEBE9]">
                <button
                  onClick={() => setRunPickerRuleId(null)}
                  className="text-sm text-[#323130] border border-[#8A8886] px-4 py-1.5 rounded hover:bg-[#F3F2F1]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => runMutation.mutate({ id: rule.id, folderId: runFolderId })}
                  disabled={!runFolderId || runMutation.isPending}
                  className={cn(
                    'text-sm bg-[#0078D4] hover:bg-[#106EBE] text-white px-4 py-1.5 rounded',
                    (!runFolderId || runMutation.isPending) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {runMutation.isPending ? 'Running…' : 'Run now'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function RuleEditor({
  rule,
  onSave,
  onCancel,
}: {
  rule?: Rule
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(rule?.name ?? '')
  const [conditions, setConditions] = useState<RuleCondition[]>(
    rule?.conditions ?? [{ field: 'from', operator: 'contains', value: '' }]
  )
  const [actions, setActions] = useState<RuleAction[]>(
    rule?.actions ?? [{ type: 'mark_as_read', params: {} }]
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      if (rule) {
        // Include the existing scalar settings so the PATCH doesn't accidentally
        // clear them in clients that read the response back into form state.
        await rules.update(rule.id, {
          name,
          conditions,
          actions,
          is_enabled: rule.is_enabled,
          priority: rule.priority,
          stop_processing: rule.stop_processing,
          apply_to: rule.apply_to,
        })
      } else {
        await rules.create({ name, conditions, actions, is_enabled: true })
      }
      onSave()
    } finally {
      setSaving(false)
    }
  }

  const addCondition = () =>
    setConditions((c) => [...c, { field: 'from', operator: 'contains', value: '' }])

  const removeCondition = (i: number) =>
    setConditions((c) => c.filter((_, idx) => idx !== i))

  const updateCondition = (i: number, update: Partial<RuleCondition>) =>
    setConditions((c) => c.map((cond, idx) => (idx === i ? { ...cond, ...update } : cond)))

  const addAction = () =>
    setActions((a) => [...a, { type: 'mark_as_read', params: {} }])

  const removeAction = (i: number) =>
    setActions((a) => a.filter((_, idx) => idx !== i))

  const updateAction = (i: number, update: Partial<RuleAction>) =>
    setActions((a) => a.map((act, idx) => (idx === i ? { ...act, ...update } : act)))

  return (
    <div className="border border-[#EDEBE9] rounded p-4 space-y-4" aria-label="Rule editor">
      <h3 className="text-base font-semibold text-[#323130]">
        {rule ? 'Edit rule' : 'New rule'}
      </h3>

      <div>
        <label className="block text-sm font-medium text-[#605E5C] mb-1" htmlFor="rule-name">
          Rule name
        </label>
        <Input
          id="rule-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Move newsletters"
          aria-label="Rule name"
        />
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[#323130]">When a message matches</p>
          <button onClick={addCondition} className="text-xs text-[#0078D4] hover:underline">
            + Add condition
          </button>
        </div>
        {conditions.map((cond, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <select
              aria-label={`Condition ${i + 1} field`}
              value={cond.field}
              onChange={(e) => updateCondition(i, { field: e.target.value as RuleCondition['field'] })}
              className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
            >
              <option value="from">From</option>
              <option value="to">To</option>
              <option value="subject">Subject</option>
              <option value="body">Body</option>
              <option value="has_attachment">Has attachment</option>
              <option value="importance">Importance</option>
            </select>
            <select
              aria-label={`Condition ${i + 1} operator`}
              value={cond.operator}
              onChange={(e) => updateCondition(i, { operator: e.target.value as RuleCondition['operator'] })}
              className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
            >
              <option value="contains">contains</option>
              <option value="equals">equals</option>
              <option value="starts_with">starts with</option>
              <option value="ends_with">ends with</option>
            </select>
            <Input
              value={cond.value}
              onChange={(e) => updateCondition(i, { value: e.target.value })}
              placeholder="Value"
              aria-label={`Condition ${i + 1} value`}
              className="flex-1"
            />
            {conditions.length > 1 && (
              <button
                onClick={() => removeCondition(i)}
                aria-label={`Remove condition ${i + 1}`}
                className="text-[#605E5C] hover:text-[#D13438]"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[#323130]">Do the following</p>
          <button onClick={addAction} className="text-xs text-[#0078D4] hover:underline">
            + Add action
          </button>
        </div>
        {actions.map((action, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <select
              aria-label={`Action ${i + 1} type`}
              value={action.type}
              onChange={(e) => updateAction(i, { type: e.target.value as RuleAction['type'] })}
              className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4] flex-1"
            >
              <option value="mark_as_read">Mark as read</option>
              <option value="flag">Flag</option>
              <option value="delete">Delete</option>
              <option value="move_to_folder">Move to folder</option>
              <option value="forward_to">Forward to</option>
              <option value="set_importance">Set importance</option>
            </select>
            {(action.type === 'move_to_folder' || action.type === 'forward_to') && (
              <Input
                value={action.params?.folder_id ?? action.params?.email ?? ''}
                onChange={(e) =>
                  updateAction(i, {
                    params: action.type === 'forward_to'
                      ? { email: e.target.value }
                      : { folder_id: e.target.value },
                  })
                }
                placeholder={action.type === 'forward_to' ? 'Email address' : 'Folder ID'}
                aria-label={`Action ${i + 1} parameter`}
                className="flex-1"
              />
            )}
            {actions.length > 1 && (
              <button
                onClick={() => removeAction(i)}
                aria-label={`Remove action ${i + 1}`}
                className="text-[#605E5C] hover:text-[#D13438]"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={save} loading={saving} disabled={!name.trim()} aria-label="Save rule">
          Save rule
        </Button>
        <Button variant="secondary" onClick={onCancel} aria-label="Cancel">
          Cancel
        </Button>
      </div>
    </div>
  )
}
