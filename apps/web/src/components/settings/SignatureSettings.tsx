'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { signatures } from '@/lib/api'
import type { Signature } from '@/lib/api'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, Edit2 } from 'lucide-react'

export function SignatureSettings() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Signature | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [isDefaultNew, setIsDefaultNew] = useState(false)
  const [isDefaultReply, setIsDefaultReply] = useState(false)

  const { data: sigs = [] } = useQuery({
    queryKey: ['signatures'],
    queryFn: () => signatures.list(),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing) {
        return signatures.update(editing.id, { name, body_html: bodyHtml, is_default_new: isDefaultNew, is_default_reply: isDefaultReply })
      }
      return signatures.create({ name, body_html: bodyHtml, is_default_new: isDefaultNew, is_default_reply: isDefaultReply })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] })
      setEditing(null)
      setCreating(false)
      setName('')
      setBodyHtml('')
      setIsDefaultNew(false)
      setIsDefaultReply(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => signatures.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['signatures'] }),
  })

  const startEdit = (sig: Signature) => {
    setEditing(sig)
    setCreating(false)
    setName(sig.name)
    setBodyHtml(sig.body_html)
    setIsDefaultNew(sig.is_default_new)
    setIsDefaultReply(sig.is_default_reply)
  }

  const startCreate = () => {
    setCreating(true)
    setEditing(null)
    setName('')
    setBodyHtml('')
    setIsDefaultNew(false)
    setIsDefaultReply(false)
  }

  const cancel = () => {
    setEditing(null)
    setCreating(false)
  }

  const showForm = creating || !!editing

  return (
    <div className="flex h-full">
      {/* Signature list */}
      <div className="w-64 border-r border-[#EDEBE9] flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-[#EDEBE9]">
          <h3 className="text-sm font-medium text-[#323130]">Signatures</h3>
          <Button size="sm" variant="ghost" onClick={startCreate} aria-label="New signature">
            <Plus size={14} />
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto outlook-scrollbar">
          {sigs.map((sig) => (
            <li
              key={sig.id}
              className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9] group hover:bg-[#F3F2F1] transition-colors"
            >
              <button
                onClick={() => startEdit(sig)}
                aria-label={`Edit ${sig.name} signature`}
                className="flex-1 text-left text-sm text-[#323130] truncate"
              >
                {sig.name}
                {sig.is_default_new && (
                  <span className="ml-1 text-[10px] text-[#0078D4]">(default)</span>
                )}
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => startEdit(sig)}
                  aria-label={`Edit ${sig.name}`}
                  className="text-[#605E5C] hover:text-[#323130] p-0.5"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(sig.id)}
                  aria-label={`Delete ${sig.name}`}
                  className="text-[#605E5C] hover:text-[#D13438] p-0.5"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar p-6">
        {showForm ? (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-base font-semibold text-[#323130]">
              {editing ? 'Edit signature' : 'New signature'}
            </h3>

            <div>
              <label className="block text-sm font-medium text-[#605E5C] mb-1" htmlFor="sig-name">
                Signature name
              </label>
              <Input
                id="sig-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Work signature"
                aria-label="Signature name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#605E5C] mb-1">
                Signature content
              </label>
              <RichTextEditor
                content={bodyHtml}
                onChange={setBodyHtml}
                placeholder="Create your signature..."
                minHeight="150px"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-[#323130] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefaultNew}
                  onChange={(e) => setIsDefaultNew(e.target.checked)}
                  aria-label="Use for new messages"
                  className="rounded border-[#D2D0CE]"
                />
                Use for new messages
              </label>
              <label className="flex items-center gap-2 text-sm text-[#323130] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefaultReply}
                  onChange={(e) => setIsDefaultReply(e.target.checked)}
                  aria-label="Use for replies and forwards"
                  className="rounded border-[#D2D0CE]"
                />
                Use for replies and forwards
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                disabled={!name.trim()}
                aria-label="Save signature"
              >
                Save
              </Button>
              <Button variant="secondary" onClick={cancel} aria-label="Cancel">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <p className="text-[#605E5C] text-sm">
              Select a signature to edit or create a new one.
            </p>
            <Button onClick={startCreate} aria-label="Create new signature">
              <Plus size={14} />
              New signature
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
