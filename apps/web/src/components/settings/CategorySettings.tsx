'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categories } from '@/lib/api'
import type { Category } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, Edit2, Check, Star, Tag } from 'lucide-react'

const PRESET_COLORS = [
  '#0078D4', '#106EBE', '#005A9E',
  '#107C10', '#005A00', '#498205',
  '#8764B8', '#5C2D91', '#881798',
  '#D13438', '#A4262C',
  '#FF8C00', '#CA5010',
  '#FFB900',
]

export function CategorySettings() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#0078D4')
  const [showNew, setShowNew] = useState(false)

  const { data: cats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  const createMutation = useMutation({
    mutationFn: () => categories.create({ name: newName, color: newColor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setNewName('')
      setNewColor('#0078D4')
      setShowNew(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color: string }) =>
      categories.update(id, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categories.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  return (
    <div className="max-w-2xl p-8">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-[#323130] mb-1">Categories</h2>
          <p className="text-sm text-[#605E5C]">
            Categorizing your email and calendar can help you organize and track messages and events related to a project, task, or person. You can create new categories and assign them names and colors.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-[#0078D4] border border-[#0078D4] px-3 py-1.5 rounded hover:bg-[#EBF3FB] transition-colors flex-shrink-0 ml-4"
        >
          <Plus size={14} /> Create new
        </button>
      </div>

      <div className="mt-6">
        {/* Header */}
        <div className="px-4 py-2 border-b border-[#EDEBE9]">
          <span className="text-xs font-medium text-[#605E5C]">Category name</span>
        </div>

        {/* New row */}
        {showNew && (
          <NewCategoryRow
            name={newName}
            color={newColor}
            onNameChange={setNewName}
            onColorChange={setNewColor}
            onSave={() => createMutation.mutate()}
            onCancel={() => setShowNew(false)}
            saving={createMutation.isPending}
          />
        )}

        {/* Existing categories */}
        {cats.map((cat) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            editing={editingId === cat.id}
            onEdit={() => setEditingId(cat.id)}
            onSave={(name, color) => updateMutation.mutate({ id: cat.id, name, color })}
            onCancel={() => setEditingId(null)}
            onDelete={() => deleteMutation.mutate(cat.id)}
          />
        ))}

        {cats.length === 0 && !showNew && (
          <div className="px-4 py-6 text-center text-sm text-[#605E5C]">
            No categories yet. Create one above.
          </div>
        )}
      </div>
    </div>
  )
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (c: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Select color ${c}`}
          aria-pressed={value === c}
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
          style={{
            backgroundColor: c,
            borderColor: value === c ? '#323130' : 'transparent',
          }}
        >
          {value === c && <Check size={10} className="text-white" />}
        </button>
      ))}
    </div>
  )
}

function NewCategoryRow({
  name,
  color,
  onNameChange,
  onColorChange,
  onSave,
  onCancel,
  saving,
}: {
  name: string
  color: string
  onNameChange: (n: string) => void
  onColorChange: (c: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="px-4 py-3 border-b border-[#EDEBE9] space-y-2">
      <div className="flex items-center gap-3">
        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Category name"
          aria-label="New category name"
          className="flex-1"
        />
        <Button size="sm" onClick={onSave} loading={saving} disabled={!name.trim()} aria-label="Save category">
          Save
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel} aria-label="Cancel">
          Cancel
        </Button>
      </div>
      <ColorPicker value={color} onChange={onColorChange} />
    </div>
  )
}

function CategoryRow({
  category,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  category: Category
  editing: boolean
  onEdit: () => void
  onSave: (name: string, color: string) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)

  if (editing) {
    return (
      <div className="px-4 py-3 border-b border-[#EDEBE9] space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={`Edit category name for ${category.name}`}
            className="flex-1"
          />
          <Button size="sm" onClick={() => onSave(name, color)} disabled={!name.trim()} aria-label="Save">
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={onCancel} aria-label="Cancel">
            Cancel
          </Button>
        </div>
        <ColorPicker value={color} onChange={setColor} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#EDEBE9] hover:bg-[#F3F2F1] transition-colors">
      <Tag
        size={16}
        className="flex-shrink-0"
        style={{ color: category.color, fill: category.color }}
        aria-label={`Color: ${category.color}`}
      />
      <span className="flex-1 text-sm text-[#323130]">{category.name}</span>
      <div className="flex items-center gap-0.5">
        <button aria-label={`Favorite ${category.name}`}
          className="p-1 text-[#605E5C] hover:text-[#FFB900] rounded transition-colors">
          <Star size={14} />
        </button>
        <button onClick={onEdit} aria-label={`Edit ${category.name}`}
          className="p-1 text-[#605E5C] hover:text-[#323130] rounded transition-colors">
          <Edit2 size={14} />
        </button>
        <button onClick={onDelete} aria-label={`Delete ${category.name}`}
          className="p-1 text-[#605E5C] hover:text-[#D13438] rounded transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
