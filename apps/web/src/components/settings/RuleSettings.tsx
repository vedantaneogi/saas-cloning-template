'use client'

import { useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rules, folders, categories } from '@/lib/api'
import type { Rule, RuleCondition, RuleAction, Folder, Category } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Plus, Trash2, Edit2, Play, CheckCircle2, ChevronUp, ChevronDown,
  ChevronDown as CaretDown, FolderPlus, Search,
} from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'

// ─── Outlook condition catalog ────────────────────────────────────────────────
// Mirrors the dropdown groups in rule1.png / rule4.png.
const CONDITION_GROUPS: { label: string; items: { value: RuleCondition['field']; label: string }[] }[] = [
  {
    label: 'People',
    items: [
      { value: 'from', label: 'From' },
      { value: 'to', label: 'To' },
      { value: 'im_on_to', label: "I'm on the To line" },
      { value: 'im_on_to_or_cc', label: "I'm on the To or Cc line" },
      { value: 'im_not_on_to', label: "I'm not on the To line" },
      { value: 'im_only_recipient', label: "I'm the only recipient" },
    ],
  },
  {
    label: 'Subject',
    items: [
      { value: 'subject', label: 'Subject includes' },
      { value: 'subject_or_body', label: 'Subject or body includes' },
    ],
  },
  {
    label: 'Keywords',
    items: [
      { value: 'body', label: 'Message body includes' },
      { value: 'sender_address', label: 'Sender address includes' },
      { value: 'recipient_address', label: 'Recipient address includes' },
      { value: 'message_header', label: 'Message header includes' },
    ],
  },
  {
    label: 'Marked with',
    items: [
      { value: 'importance', label: 'Importance' },
      { value: 'sensitivity', label: 'Sensitivity' },
      { value: 'flag', label: 'Flag' },
      { value: 'has_attachment', label: 'Has attachment' },
    ],
  },
]

// Conditions with no operator/value — they're a self-contained predicate.
const STANDALONE_FIELDS: ReadonlySet<string> = new Set([
  'im_on_to', 'im_on_to_or_cc', 'im_not_on_to', 'im_only_recipient',
])

// Conditions with a fixed-choice value.
const VALUE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  importance: [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
  ],
  sensitivity: [
    { value: 'normal', label: 'Normal' },
    { value: 'personal', label: 'Personal' },
    { value: 'private', label: 'Private' },
    { value: 'confidential', label: 'Confidential' },
  ],
  flag: [
    { value: 'true', label: 'Flagged' },
    { value: 'false', label: 'Not flagged' },
  ],
  has_attachment: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ],
}

// ─── Outlook action catalog ───────────────────────────────────────────────────
const ACTION_GROUPS: { label: string; items: { value: RuleAction['type']; label: string }[] }[] = [
  {
    label: 'Organize',
    items: [
      { value: 'move_to_folder', label: 'Move to' },
      { value: 'copy_to_folder', label: 'Copy to' },
      { value: 'delete', label: 'Delete' },
    ],
  },
  {
    label: 'Mark message',
    items: [
      { value: 'mark_as_read', label: 'Mark as read' },
      { value: 'flag', label: 'Flag' },
      { value: 'set_importance', label: 'Mark with importance' },
      { value: 'set_sensitivity', label: 'Mark with sensitivity' },
      { value: 'set_category', label: 'Categorize' },
    ],
  },
  {
    label: 'Route',
    items: [
      { value: 'forward_to', label: 'Forward to' },
      { value: 'forward_as_attachment', label: 'Forward as attachment' },
      { value: 'redirect_to', label: 'Redirect to' },
    ],
  },
]

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

              <div className="min-w-0">
                <p className="text-sm font-medium text-[#323130] truncate">{rule.name}</p>
                <p className="text-xs text-[#605E5C]">
                  {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''},{' '}
                  {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
                  {rule.exceptions?.length ? `, ${rule.exceptions.length} exception${rule.exceptions.length !== 1 ? 's' : ''}` : ''}
                  {' · '}
                  <span className={rule.is_enabled ? 'text-[#107C10]' : 'text-[#605E5C]'}>
                    {rule.is_enabled ? 'On' : 'Off'}
                  </span>
                </p>
              </div>

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

      {(creating || editing) && (
        <RuleEditor
          key={editing?.id ?? 'new'}
          rule={editing ?? undefined}
          folderList={folderList}
          onSave={async () => {
            await queryClient.refetchQueries({ queryKey: ['rules'] })
            setEditing(null)
            setCreating(false)
          }}
          onCancel={() => { setEditing(null); setCreating(false) }}
        />
      )}

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
                  <optgroup label="System">
                    {folderList.filter((f) => f.is_system).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Your folders">
                    {folderList.filter((f) => !f.is_system).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </optgroup>
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

// ─── Folder picker (with inline create) ───────────────────────────────────────
// Renders a button styled like the rest of the form. Clicking opens a popover
// with a search box, system + user folder lists, and an inline "Create new
// folder" form. Matches Outlook's rule3.png picker.
function FolderPicker({
  folderList,
  selectedId,
  onSelect,
  ariaLabel,
}: {
  folderList: Folder[]
  selectedId: string
  onSelect: (folderId: string) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [creatingErr, setCreatingErr] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setNewName('')
        setCreatingErr(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const createMutation = useMutation({
    mutationFn: (name: string) => folders.create({ name }),
    onSuccess: (folder) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      onSelect(folder.id)
      setCreating(false)
      setNewName('')
      setCreatingErr(null)
      setOpen(false)
    },
    onError: () => setCreatingErr('Could not create folder'),
  })

  const selected = folderList.find((f) => f.id === selectedId)
  const systemFolders = folderList.filter((f) => f.is_system)
  const userFolders = folderList.filter((f) => !f.is_system)
  const q = query.trim().toLowerCase()
  const matchesQuery = (f: Folder) => !q || f.name.toLowerCase().includes(q)

  return (
    <div className="relative flex-1" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between gap-2 text-sm border border-[#EDEBE9] rounded px-2 py-1 text-left text-[#323130] hover:border-[#8A8886] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
      >
        <span className={cn('truncate', !selected && 'text-[#A19F9D]')}>
          {selected?.name ?? 'Select a folder'}
        </span>
        <CaretDown size={12} className="text-[#605E5C] flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg max-h-80 overflow-y-auto">
          <div className="px-2 py-2 border-b border-[#EDEBE9] sticky top-0 bg-white">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A19F9D]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a folder"
                aria-label="Search folders"
                autoFocus
                className="w-full text-xs border border-[#EDEBE9] rounded pl-6 pr-2 py-1 focus:outline-none focus:border-[#0078D4]"
              />
            </div>
          </div>

          {systemFolders.filter(matchesQuery).length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase text-[#605E5C] tracking-wide">System</p>
              {systemFolders.filter(matchesQuery).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { onSelect(f.id); setOpen(false) }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm hover:bg-[#F3F2F1]',
                    selectedId === f.id && 'bg-[#EFF6FC] text-[#0078D4]'
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}

          {userFolders.filter(matchesQuery).length > 0 && (
            <div className="py-1 border-t border-[#EDEBE9]">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase text-[#605E5C] tracking-wide">Your folders</p>
              {userFolders.filter(matchesQuery).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { onSelect(f.id); setOpen(false) }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm hover:bg-[#F3F2F1]',
                    selectedId === f.id && 'bg-[#EFF6FC] text-[#0078D4]'
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-[#EDEBE9] py-1">
            {creating ? (
              <div className="px-3 py-2 space-y-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New folder name"
                  aria-label="New folder name"
                  autoFocus
                />
                {creatingErr && <p className="text-xs text-[#D13438]">{creatingErr}</p>}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
                    disabled={!newName.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Creating…' : 'Create'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setCreating(false); setNewName('') }}
                    className="text-xs text-[#605E5C] hover:text-[#323130]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full text-left px-3 py-1.5 text-sm text-[#0078D4] hover:bg-[#F3F2F1] flex items-center gap-2"
              >
                <FolderPlus size={14} />
                Create new folder
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Condition row (shared between conditions and exceptions) ─────────────────
function ConditionRow({
  cond,
  index,
  onRemove,
  onChange,
  ariaPrefix,
}: {
  cond: RuleCondition
  index: number
  onRemove?: () => void
  onChange: (update: Partial<RuleCondition>) => void
  ariaPrefix: string
}) {
  const isStandalone = STANDALONE_FIELDS.has(cond.field)
  const valueOpts = VALUE_OPTIONS[cond.field]

  return (
    <div className="flex items-center gap-2 mb-2">
      <select
        aria-label={`${ariaPrefix} ${index + 1} field`}
        value={cond.field}
        onChange={(e) => {
          const newField = e.target.value as RuleCondition['field']
          // Reset operator/value sensibly when switching field shape.
          const isNewStandalone = STANDALONE_FIELDS.has(newField)
          const newOpts = VALUE_OPTIONS[newField]
          onChange({
            field: newField,
            value: isNewStandalone ? 'true' : (newOpts ? newOpts[0].value : ''),
            operator: isNewStandalone || newOpts ? 'equals' : 'contains',
          })
        }}
        className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4] min-w-[180px]"
      >
        {CONDITION_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map((it) => (
              <option key={it.value} value={it.value}>{it.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {!isStandalone && !valueOpts && (
        <>
          <select
            aria-label={`${ariaPrefix} ${index + 1} operator`}
            value={cond.operator}
            onChange={(e) => onChange({ operator: e.target.value as RuleCondition['operator'] })}
            className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
          >
            <option value="contains">contains</option>
            <option value="equals">equals</option>
            <option value="starts_with">starts with</option>
            <option value="ends_with">ends with</option>
          </select>
          <Input
            value={cond.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="Value"
            aria-label={`${ariaPrefix} ${index + 1} value`}
            className="flex-1"
          />
        </>
      )}

      {valueOpts && (
        <select
          aria-label={`${ariaPrefix} ${index + 1} value`}
          value={cond.value}
          onChange={(e) => onChange({ value: e.target.value })}
          className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4] flex-1"
        >
          {valueOpts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {isStandalone && (
        <span className="flex-1 text-xs text-[#605E5C] italic">No value needed</span>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${ariaPrefix.toLowerCase()} ${index + 1}`}
          className="text-[#605E5C] hover:text-[#D13438]"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

// ─── Action row ───────────────────────────────────────────────────────────────
function ActionRow({
  action,
  index,
  onRemove,
  onChange,
  folderList,
}: {
  action: RuleAction
  index: number
  onRemove?: () => void
  onChange: (update: Partial<RuleAction>) => void
  folderList: Folder[]
}) {
  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
    enabled: action.type === 'set_category',
  })

  const params = (action.params ?? {}) as Record<string, string | string[] | undefined>
  const stringParam = (k: string) => {
    const v = params[k]
    return Array.isArray(v) ? '' : (v ?? '')
  }

  const setParam = (patch: Record<string, string | string[] | undefined>) =>
    onChange({ params: { ...params, ...patch } })

  const isFolderAction = action.type === 'move_to_folder' || action.type === 'copy_to_folder'
  const isEmailAction = action.type === 'forward_to' || action.type === 'forward_as_attachment' || action.type === 'redirect_to'
  const isImportance = action.type === 'set_importance'
  const isSensitivity = action.type === 'set_sensitivity'
  const isCategorize = action.type === 'set_category'

  return (
    <div className="flex items-center gap-2 mb-2">
      <select
        aria-label={`Action ${index + 1} type`}
        value={action.type}
        onChange={(e) => onChange({ type: e.target.value as RuleAction['type'], params: {} })}
        className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4] min-w-[180px]"
      >
        {ACTION_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map((it) => (
              <option key={it.value} value={it.value}>{it.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {isFolderAction && (
        <FolderPicker
          folderList={folderList}
          selectedId={stringParam('folder_id')}
          onSelect={(id) => setParam({ folder_id: id })}
          ariaLabel={`Action ${index + 1} folder`}
        />
      )}

      {isEmailAction && (
        <Input
          type="email"
          value={stringParam('email')}
          onChange={(e) => setParam({ email: e.target.value })}
          placeholder="Email address"
          aria-label={`Action ${index + 1} email`}
          className="flex-1"
        />
      )}

      {isImportance && (
        <select
          aria-label={`Action ${index + 1} importance`}
          value={stringParam('level') || 'normal'}
          onChange={(e) => setParam({ level: e.target.value })}
          className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4] flex-1"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      )}

      {isSensitivity && (
        <select
          aria-label={`Action ${index + 1} sensitivity`}
          value={stringParam('level') || 'normal'}
          onChange={(e) => setParam({ level: e.target.value })}
          className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4] flex-1"
        >
          <option value="normal">Normal</option>
          <option value="personal">Personal</option>
          <option value="private">Private</option>
          <option value="confidential">Confidential</option>
        </select>
      )}

      {isCategorize && (
        <select
          aria-label={`Action ${index + 1} category`}
          value={stringParam('category_id')}
          onChange={(e) => setParam({ category_id: e.target.value, category_ids: undefined })}
          className="text-sm border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078D4] flex-1"
        >
          <option value="">Select a category</option>
          {categoryList.map((c: Category) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove action ${index + 1}`}
          className="text-[#605E5C] hover:text-[#D13438]"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

// ─── Editor ───────────────────────────────────────────────────────────────────
function RuleEditor({
  rule,
  folderList,
  onSave,
  onCancel,
}: {
  rule?: Rule
  folderList: Folder[]
  onSave: () => void | Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(rule?.name ?? '')
  const [conditions, setConditions] = useState<RuleCondition[]>(
    rule?.conditions ?? [{ field: 'from', operator: 'contains', value: '' }]
  )
  const [actions, setActions] = useState<RuleAction[]>(
    rule?.actions ?? [{ type: 'mark_as_read', params: {} }]
  )
  const [exceptions, setExceptions] = useState<RuleCondition[]>(rule?.exceptions ?? [])
  const [stopProcessing, setStopProcessing] = useState<boolean>(rule?.stop_processing ?? true)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      if (rule) {
        await rules.update(rule.id, {
          name,
          conditions,
          actions,
          exceptions,
          is_enabled: rule.is_enabled,
          priority: rule.priority,
          stop_processing: stopProcessing,
          apply_to: rule.apply_to,
        })
      } else {
        await rules.create({
          name,
          conditions,
          actions,
          exceptions,
          stop_processing: stopProcessing,
          is_enabled: true,
        })
      }
      await onSave()
    } finally {
      setSaving(false)
    }
  }

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
          <button
            type="button"
            onClick={() =>
              setConditions((c) => [...c, { field: 'from', operator: 'contains', value: '' }])
            }
            className="text-xs text-[#0078D4] hover:underline"
          >
            + Add condition
          </button>
        </div>
        {conditions.map((cond, i) => (
          <ConditionRow
            key={i}
            cond={cond}
            index={i}
            ariaPrefix="Condition"
            onChange={(update) =>
              setConditions((c) => c.map((x, idx) => (idx === i ? { ...x, ...update } : x)))
            }
            onRemove={
              conditions.length > 1
                ? () => setConditions((c) => c.filter((_, idx) => idx !== i))
                : undefined
            }
          />
        ))}
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[#323130]">Do the following</p>
          <button
            type="button"
            onClick={() => setActions((a) => [...a, { type: 'mark_as_read', params: {} }])}
            className="text-xs text-[#0078D4] hover:underline"
          >
            + Add action
          </button>
        </div>
        {actions.map((action, i) => (
          <ActionRow
            key={i}
            action={action}
            index={i}
            folderList={folderList}
            onChange={(update) =>
              setActions((a) => a.map((x, idx) => (idx === i ? { ...x, ...update } : x)))
            }
            onRemove={
              actions.length > 1
                ? () => setActions((a) => a.filter((_, idx) => idx !== i))
                : undefined
            }
          />
        ))}
      </div>

      {/* Exceptions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[#323130]">
            Add an exception <span className="text-xs text-[#605E5C] font-normal">(optional)</span>
          </p>
          <button
            type="button"
            onClick={() =>
              setExceptions((e) => [...e, { field: 'from', operator: 'contains', value: '' }])
            }
            className="text-xs text-[#0078D4] hover:underline"
          >
            + Add exception
          </button>
        </div>
        {exceptions.length === 0 ? (
          <p className="text-xs text-[#A19F9D] italic">No exceptions — the rule applies whenever the conditions match.</p>
        ) : (
          exceptions.map((cond, i) => (
            <ConditionRow
              key={i}
              cond={cond}
              index={i}
              ariaPrefix="Exception"
              onChange={(update) =>
                setExceptions((c) => c.map((x, idx) => (idx === i ? { ...x, ...update } : x)))
              }
              onRemove={() => setExceptions((c) => c.filter((_, idx) => idx !== i))}
            />
          ))
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-[#323130]">
        <input
          type="checkbox"
          checked={stopProcessing}
          onChange={(e) => setStopProcessing(e.target.checked)}
          className="accent-[#0078D4]"
        />
        Stop processing more rules
      </label>

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

