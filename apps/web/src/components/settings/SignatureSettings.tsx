'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { signatures } from '@/lib/api'
import type { Signature } from '@/lib/api'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Plus, Trash2, Edit2, MoreHorizontal } from 'lucide-react'

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

  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, field }: { id: string; field: 'new' | 'reply' }) => {
      const sig = sigs.find((s) => s.id === id)
      if (!sig) return
      await signatures.update(id, {
        is_default_new: field === 'new' ? !sig.is_default_new : sig.is_default_new,
        is_default_reply: field === 'reply' ? !sig.is_default_reply : sig.is_default_reply,
      })
    },
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
  const defaultNewSig = sigs.find((s) => s.is_default_new)
  const defaultReplySig = sigs.find((s) => s.is_default_reply)

  return (
    <div className="max-w-2xl p-8">
      {/* Header with + Add signature button */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-[#323130] mb-1">Signatures</h2>
          <p className="text-sm text-[#605E5C]">
            You can add and modify signatures that can be added to your emails. You can also choose which signature to add by default to your new emails and replies.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-1.5 text-sm font-medium text-[#0078D4] border border-[#0078D4] px-3 py-1.5 rounded hover:bg-[#EBF3FB] transition-colors flex-shrink-0 ml-4"
        >
          <Plus size={14} /> Add signature
        </button>
      </div>

      {/* Default dropdowns */}
      <div className="space-y-3 my-6 border-t border-[#EDEBE9] pt-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#323130] w-56 flex-shrink-0">Default for new messages</span>
          <Select
            value={defaultNewSig?.id ?? ''}
            onChange={(v) => v && setDefaultMutation.mutate({ id: v, field: 'new' })}
            options={[
              { value: '', label: '(No signature)' },
              ...sigs.map((s) => ({ value: s.id, label: s.name })),
            ]}
            ariaLabel="Default signature for new messages"
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#323130] w-56 flex-shrink-0">Default for replies and forwards</span>
          <Select
            value={defaultReplySig?.id ?? ''}
            onChange={(v) => v && setDefaultMutation.mutate({ id: v, field: 'reply' })}
            options={[
              { value: '', label: '(No signature)' },
              ...sigs.map((s) => ({ value: s.id, label: s.name })),
            ]}
            ariaLabel="Default signature for replies"
            className="flex-1"
          />
        </div>
      </div>

      {/* Signature list */}
      <div className="border-t border-[#EDEBE9] pt-4">
        {sigs.map((sig) => (
          <div
            key={sig.id}
            className="flex items-center justify-between py-2.5 border-b border-[#EDEBE9] group"
          >
            <span className="text-sm text-[#323130]">{sig.name}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => startEdit(sig)} aria-label={`Edit ${sig.name}`}
                className="p-1 text-[#605E5C] hover:text-[#323130] hover:bg-[#F3F2F1] rounded transition-colors">
                <Edit2 size={14} />
              </button>
              <button onClick={() => deleteMutation.mutate(sig.id)} aria-label={`Delete ${sig.name}`}
                className="p-1 text-[#605E5C] hover:text-[#D13438] hover:bg-[#FDE7E9] rounded transition-colors">
                <Trash2 size={14} />
              </button>
              <button aria-label="More options"
                className="p-1 text-[#605E5C] hover:text-[#323130] hover:bg-[#F3F2F1] rounded transition-colors">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>
        ))}
        {sigs.length === 0 && !showForm && (
          <p className="text-sm text-[#A19F9D] py-6 text-center">No signatures yet.</p>
        )}
      </div>

      {/* Edit/Create form */}
      {showForm && (
        <div className="mt-6 border-t border-[#EDEBE9] pt-4 space-y-4">
          <h3 className="text-base font-semibold text-[#323130]">
            {editing ? 'Edit signature' : 'New signature'}
          </h3>
          <div>
            <label className="block text-sm font-medium text-[#605E5C] mb-1">Signature name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Work signature" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#605E5C] mb-1">Signature content</label>
            <RichTextEditor content={bodyHtml} onChange={setBodyHtml} placeholder="Create your signature..." minHeight="150px" />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!name.trim()}>
              Save
            </Button>
            <Button variant="secondary" onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}