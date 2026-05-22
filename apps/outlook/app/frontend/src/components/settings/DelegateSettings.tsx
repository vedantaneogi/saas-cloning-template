
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contacts, calendars } from '@/lib/api'
import type { CalendarDelegateOut } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Plus, Trash2, Shield, Calendar, Mail } from 'lucide-react'
import { useUIStore } from '@/store/ui'

const CAL_LEVELS: { value: 'free_busy' | 'reviewer' | 'editor'; label: string; hint: string }[] = [
  { value: 'free_busy', label: 'Free / busy', hint: 'See when I\'m available — no event detail' },
  { value: 'reviewer', label: 'Reviewer', hint: 'Read full event detail' },
  { value: 'editor', label: 'Editor', hint: 'Read and edit my events' },
]

const MAIL_LEVELS: { value: 'none' | 'read' | 'send_on_behalf' | 'send_as'; label: string }[] = [
  { value: 'none', label: 'No access' },
  { value: 'read', label: 'Read inbox' },
  { value: 'send_on_behalf', label: 'Send on behalf' },
  { value: 'send_as', label: 'Send as' },
]

export function DelegateSettings() {
  const queryClient = useQueryClient()
  const showNotification = useUIStore((s) => s.showNotification)
  const [addEmail, setAddEmail] = useState('')
  const [addLevel, setAddLevel] = useState<'free_busy' | 'reviewer' | 'editor'>('reviewer')
  const [emailSuggestions, setEmailSuggestions] = useState<{ email: string; name: string }[]>([])

  const { data: delegates = [] } = useQuery({
    queryKey: ['calendar-delegates'],
    queryFn: () => calendars.listDelegates(),
  })

  const { data: contactListData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contacts.list(),
  })
  const contactList = contactListData?.items ?? []

  const handleEmailChange = (val: string) => {
    setAddEmail(val)
    if (val.length >= 2) {
      const matches = contactList
        .filter((c) =>
          c.email?.toLowerCase().includes(val.toLowerCase())
          || c.display_name?.toLowerCase().includes(val.toLowerCase())
        )
        .slice(0, 5)
        .map((c) => ({ email: c.email ?? '', name: c.display_name }))
      setEmailSuggestions(matches)
    } else {
      setEmailSuggestions([])
    }
  }

  const addMutation = useMutation({
    mutationFn: ({
      email, level, mailLevel,
    }: {
      email: string
      level?: 'free_busy' | 'reviewer' | 'editor'
      mailLevel?: 'none' | 'read' | 'send_on_behalf' | 'send_as'
    }) => calendars.addDelegate(email, level, mailLevel),
    onSuccess: () => {
      // Events list keys overlay events off the delegate table — refetch
      // so a freshly-granted (or revoked) delegate flips visibility.
      queryClient.invalidateQueries({ queryKey: ['calendar-delegates'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setAddEmail('')
      setEmailSuggestions([])
      showNotification('Delegate updated')
    },
    onError: (e: Error) => showNotification(e.message || 'Could not update delegate'),
  })

  // Both updates go through the same upsert endpoint — different fields.
  const updateCalLevel = (email: string, level: 'free_busy' | 'reviewer' | 'editor') =>
    addMutation.mutate({ email, level })
  const updateMailLevel = (email: string, mailLevel: 'none' | 'read' | 'send_on_behalf' | 'send_as') =>
    addMutation.mutate({ email, mailLevel })

  const removeMutation = useMutation({
    mutationFn: (id: string) => calendars.removeDelegate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-delegates'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
      showNotification('Delegate removed')
    },
  })

  return (
    <div className="max-w-3xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Shield size={18} className="text-[#0078D4]" />
        <h2 className="text-lg font-semibold text-[#323130]">Calendar delegates</h2>
      </div>
      <p className="text-sm text-[#605E5C] mb-6">
        Grant other people access to your calendar. Delegates can view your free/busy info,
        read full event detail, or edit events on your behalf — depending on the level you pick.
      </p>

      {/* Add delegate */}
      <div className="border border-[#EDEBE9] rounded p-4 mb-6">
        <h3 className="text-sm font-semibold text-[#323130] mb-3">Add a delegate</h3>
        <div className="grid grid-cols-[1fr,180px,auto] gap-2 items-end">
          <div className="relative">
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
                      onClick={() => { setAddEmail(s.email); setEmailSuggestions([]) }}
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
          <div>
            <label className="block text-xs text-[#605E5C] mb-1" htmlFor="delegate-level">
              Permission
            </label>
            <Select
              value={addLevel}
              onChange={(v) => setAddLevel(v as 'free_busy' | 'reviewer' | 'editor')}
              options={CAL_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
              ariaLabel="Permission level"
              className="w-full"
            />
          </div>
          <Button
            onClick={() => addEmail.trim() && addMutation.mutate({ email: addEmail.trim(), level: addLevel })}
            disabled={!addEmail.trim() || addMutation.isPending}
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
          <div className="grid grid-cols-[1fr,160px,160px,40px] px-4 py-2 bg-[#F3F2F1] border-b border-[#EDEBE9] text-xs font-medium text-[#605E5C]">
            <span>Delegate</span>
            <span className="flex items-center gap-1"><Calendar size={11} /> Calendar</span>
            <span className="flex items-center gap-1"><Mail size={11} /> Mail</span>
            <span />
          </div>
          {delegates.map((d: CalendarDelegateOut) => (
            <div
              key={d.id}
              className="grid grid-cols-[1fr,160px,160px,40px] items-center px-4 py-3 border-b border-[#EDEBE9] last:border-b-0 hover:bg-[#F3F2F1] transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-[#323130]">
                  {d.delegate_name ?? d.delegate_email}
                </p>
                <p className="text-xs text-[#605E5C]">{d.delegate_email}</p>
              </div>
              <Select
                value={d.level}
                onChange={(v) =>
                  d.delegate_email &&
                  updateCalLevel(d.delegate_email, v as 'free_busy' | 'reviewer' | 'editor')
                }
                options={CAL_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
                ariaLabel={`Calendar permission for ${d.delegate_name ?? d.delegate_email}`}
                size="sm"
                className="w-full"
              />
              <Select
                value={d.mail_level ?? 'none'}
                onChange={(v) =>
                  d.delegate_email &&
                  updateMailLevel(
                    d.delegate_email,
                    v as 'none' | 'read' | 'send_on_behalf' | 'send_as',
                  )
                }
                options={MAIL_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
                ariaLabel={`Mail permission for ${d.delegate_name ?? d.delegate_email}`}
                size="sm"
                className="w-full"
              />
              <button
                onClick={() => removeMutation.mutate(d.id)}
                aria-label="Remove delegate"
                className="p-1 text-[#605E5C] hover:text-[#D13438] transition-colors justify-self-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#A19F9D] mt-4">
        Delegates show up in the &quot;People&apos;s calendars&quot; section of their sidebar
        and can subscribe to overlay your calendar onto theirs.
      </p>
    </div>
  )
}
