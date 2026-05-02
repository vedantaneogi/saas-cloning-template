'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contacts } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, Shield, Mail, Calendar } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'

interface Delegate {
  id: string
  email: string
  name: string
  mailPermission: 'none' | 'read' | 'send_on_behalf' | 'send_as'
  calendarPermission: 'none' | 'read' | 'write' | 'full'
}

const MAIL_PERMISSIONS = [
  { value: 'none', label: 'None' },
  { value: 'read', label: 'Read only' },
  { value: 'send_on_behalf', label: 'Send on behalf' },
  { value: 'send_as', label: 'Send as' },
]

const CAL_PERMISSIONS = [
  { value: 'none', label: 'None' },
  { value: 'read', label: 'View details' },
  { value: 'write', label: 'Edit' },
  { value: 'full', label: 'Full access' },
]

// In-memory store for delegates (RL environment — no dedicated backend table)
let _delegates: Delegate[] = []

export function DelegateSettings() {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const [delegates, setDelegates] = useState<Delegate[]>(_delegates)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addPending, setAddPending] = useState(false)
  const [emailSuggestions, setEmailSuggestions] = useState<{ email: string; name: string }[]>([])

  const { data: contactListData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contacts.list(),
  })
  const contactList = contactListData?.items ?? []

  const handleEmailChange = (val: string) => {
    setAddEmail(val)
    if (val.length >= 2) {
      const matches = contactList
        .filter((c) => c.email?.toLowerCase().includes(val.toLowerCase()) || c.display_name?.toLowerCase().includes(val.toLowerCase()))
        .slice(0, 5)
        .map((c) => ({ email: c.email ?? '', name: c.display_name }))
      setEmailSuggestions(matches)
    } else {
      setEmailSuggestions([])
    }
  }

  const addDelegate = () => {
    if (!addEmail.trim()) return
    setAddPending(true)
    const newDelegate: Delegate = {
      id: crypto.randomUUID(),
      email: addEmail.trim(),
      name: addName.trim() || addEmail.split('@')[0],
      mailPermission: 'read',
      calendarPermission: 'read',
    }
    const updated = [...delegates, newDelegate]
    _delegates = updated
    setDelegates(updated)
    setAddEmail('')
    setAddName('')
    setEmailSuggestions([])
    setAddPending(false)
    showNotification(`${newDelegate.name} added as delegate`)
  }

  const removeDelegate = (id: string) => {
    const updated = delegates.filter((d) => d.id !== id)
    _delegates = updated
    setDelegates(updated)
    showNotification('Delegate removed')
  }

  const updatePermission = (
    id: string,
    field: 'mailPermission' | 'calendarPermission',
    value: string
  ) => {
    const updated = delegates.map((d) =>
      d.id === id ? { ...d, [field]: value } : d
    )
    _delegates = updated
    setDelegates(updated)
  }

  return (
    <div className="max-w-3xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Shield size={18} className="text-[#0078D4]" />
        <h2 className="text-lg font-semibold text-[#323130]">Delegates</h2>
      </div>
      <p className="text-sm text-[#605E5C] mb-6">
        Grant other people access to your mailbox and calendar. Delegates can act on your behalf according to the permissions you set.
      </p>

      {/* Add delegate */}
      <div className="border border-[#EDEBE9] rounded p-4 mb-6">
        <h3 className="text-sm font-semibold text-[#323130] mb-3">Add a delegate</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <label className="block text-xs text-[#605E5C] mb-1" htmlFor="delegate-email">
              Email address
            </label>
            <Input
              id="delegate-email"
              type="email"
              value={addEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="colleague@example.com"
              aria-label="Delegate email address"
              autoComplete="off"
            />
            {emailSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-[#EDEBE9] rounded shadow-outlook mt-0.5">
                {emailSuggestions.map((s) => (
                  <li key={s.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setAddEmail(s.email)
                        setAddName(s.name)
                        setEmailSuggestions([])
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#F3F2F1] transition-colors"
                    >
                      <span className="font-medium text-[#323130]">{s.name}</span>
                      <span className="text-[#605E5C] ml-2 text-xs">{s.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            onClick={addDelegate}
            disabled={!addEmail.trim() || addPending}
            aria-label="Add delegate"
            size="md"
          >
            <Plus size={14} />
            Add
          </Button>
        </div>
      </div>

      {/* Delegates list */}
      {delegates.length === 0 ? (
        <div className="border border-[#EDEBE9] rounded py-8 text-center text-sm text-[#605E5C]">
          No delegates yet. Add someone above to grant them access.
        </div>
      ) : (
        <div className="border border-[#EDEBE9] rounded overflow-hidden">
          <div className="grid grid-cols-[1fr,180px,180px,40px] px-4 py-2 bg-[#F3F2F1] border-b border-[#EDEBE9] text-xs font-medium text-[#605E5C]">
            <span>Delegate</span>
            <span className="flex items-center gap-1"><Mail size={11} /> Mail access</span>
            <span className="flex items-center gap-1"><Calendar size={11} /> Calendar access</span>
            <span />
          </div>
          {delegates.map((d) => (
            <div
              key={d.id}
              className="grid grid-cols-[1fr,180px,180px,40px] items-center px-4 py-3 border-b border-[#EDEBE9] last:border-b-0 hover:bg-[#F3F2F1] transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-[#323130]">{d.name}</p>
                <p className="text-xs text-[#605E5C]">{d.email}</p>
              </div>
              <select
                value={d.mailPermission}
                onChange={(e) => updatePermission(d.id, 'mailPermission', e.target.value)}
                aria-label={`Mail permission for ${d.name}`}
                className="text-xs border border-[#EDEBE9] rounded px-2 py-1.5 text-[#323130] focus:outline-none focus:border-[#0078D4] w-full"
              >
                {MAIL_PERMISSIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <select
                value={d.calendarPermission}
                onChange={(e) => updatePermission(d.id, 'calendarPermission', e.target.value)}
                aria-label={`Calendar permission for ${d.name}`}
                className="text-xs border border-[#EDEBE9] rounded px-2 py-1.5 text-[#323130] focus:outline-none focus:border-[#0078D4] w-full"
              >
                {CAL_PERMISSIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={() => removeDelegate(d.id)}
                aria-label={`Remove ${d.name} as delegate`}
                className="p-1 text-[#605E5C] hover:text-[#D13438] transition-colors justify-self-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#A19F9D] mt-4">
        Delegate changes take effect immediately for this session. In a production environment, these permissions are synced to the mail server.
      </p>
    </div>
  )
}
