
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, isSameMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, EyeOff, Share2, X, Check, Globe, Copy, UserPlus, Trash2, Plus, Pencil } from 'lucide-react'
import { calendars } from '@/lib/api'
import type { Calendar } from '@/lib/api'
import { cn } from '@/lib/utils'

const PERMISSION_OPTIONS = [
  { value: 'free_busy', label: 'Free/Busy only', description: 'Show only free or busy status' },
  { value: 'read', label: 'View all details', description: 'See event titles and details' },
  { value: 'write', label: 'Edit', description: 'Create and edit events' },
  { value: 'delegate', label: 'Delegate', description: 'Full access including sharing' },
]

interface CalendarSidebarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

function MiniCalendar({ selectedDate, onDateSelect }: CalendarSidebarProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate)

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  })

  const startPad = getDay(startOfMonth(viewMonth))

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          aria-label="Previous month"
          className="p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C] transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-[#323130]">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C] transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] text-[#605E5C] font-medium pb-1">
            {d}
          </div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDateSelect(day)}
            aria-label={format(day, 'EEEE, MMMM d, yyyy')}
            aria-pressed={isSameDay(day, selectedDate)}
            className={cn(
              'w-6 h-6 mx-auto rounded-full text-[11px] flex items-center justify-center transition-colors',
              isSameDay(day, selectedDate) && 'bg-[#0078D4] text-white',
              isToday(day) && !isSameDay(day, selectedDate) && 'border border-[#0078D4] text-[#0078D4] font-semibold',
              !isSameMonth(day, viewMonth) && 'text-[#A19F9D]',
              !isSameDay(day, selectedDate) && isSameMonth(day, viewMonth) && 'hover:bg-[#EDEBE9] text-[#323130]'
            )}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CalendarSidebar({ selectedDate, onDateSelect }: CalendarSidebarProps) {
  const queryClient = useQueryClient()
  const [shareDialog, setShareDialog] = useState<{ cal: Calendar; permission: string } | null>(null)
  const [publishDialog, setPublishDialog] = useState<{ cal: Calendar; detail: 'availability' | 'full' } | null>(null)
  const [copied, setCopied] = useState(false)
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribeError, setSubscribeError] = useState('')
  const [newCalendarOpen, setNewCalendarOpen] = useState(false)
  const [newCalName, setNewCalName] = useState('')
  const [newCalColor, setNewCalColor] = useState('#0078D4')
  const [editCal, setEditCal] = useState<Calendar | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#0078D4')

  const { data: calendarList = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendars.list(),
  })

  const toggleVisibility = useMutation({
    mutationFn: (cal: Calendar) =>
      calendars.update(cal.id, { is_visible: !cal.is_visible }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendars'] }),
  })

  // When the publish dialog opens (or the user changes scope), ensure the
  // calendar has a real publish_token. The legacy /cal/pub/{id} URL is just
  // a fallback — the new render page expects a token.
  const publishMutation = useMutation({
    mutationFn: ({ id, enable, scope }: { id: string; enable: boolean; scope: 'free_busy' | 'full' }) =>
      calendars.publish(id, enable, scope),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendars'] }),
  })

  useEffect(() => {
    if (!publishDialog) return
    const cal = publishDialog.cal
    const wantedScope = publishDialog.detail === 'full' ? 'full' : 'free_busy'
    // Only fire if either the token is missing OR the chosen scope differs
    // from what's stored — keeps server writes minimal.
    if (!cal.publish_token || cal.publish_scope !== wantedScope) {
      publishMutation.mutate({ id: cal.id, enable: true, scope: wantedScope })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishDialog?.cal.id, publishDialog?.detail])

  const shareMutation = useMutation({
    mutationFn: ({ cal, permission }: { cal: Calendar; permission: string }) =>
      calendars.share(cal.id, permission, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
      setShareDialog(null)
    },
  })

  const unshareMutation = useMutation({
    mutationFn: (calId: string) => calendars.share(calId, 'none', false),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendars'] }),
  })

  // Create a custom calendar (name + color). Available in the event composer
  // calendar dropdown after creation.
  const createCalendarMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => calendars.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setNewCalendarOpen(false)
      setNewCalName('')
      setNewCalColor('#0078D4')
    },
  })

  // Edit calendar — rename / recolor in place. Visibility has its own toggle
  // so we don't surface it here.
  const editCalendarMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color: string }) =>
      calendars.update(id, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setEditCal(null)
    },
  })

  const deleteCalendarMutation = useMutation({
    mutationFn: (id: string) => calendars.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setEditCal(null)
    },
  })

  const openEdit = (cal: Calendar) => {
    setEditCal(cal)
    setEditName(cal.name)
    setEditColor(cal.color)
  }

  const subscribeMutation = useMutation({
    mutationFn: (email: string) => calendars.subscribe(email),
    onSuccess: (newCal) => {
      // Optimistic-style update — append the freshly-created subscription
      // calendar to the cache straight away so the sidebar shows it without
      // waiting for the refetch round-trip. Invalidate after to reconcile.
      queryClient.setQueryData<Calendar[]>(['calendars'], (old) => {
        if (!old) return old
        if (old.some((c) => c.id === newCal.id)) return old
        return [...old, newCal]
      })
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setSubscribeEmail('')
      setSubscribeError('')
    },
    onError: (err: Error) => setSubscribeError(err.message),
  })

  const unsubscribeMutation = useMutation({
    mutationFn: (id: string) => calendars.unsubscribe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const myCalendars = calendarList.filter((c) => !c.shared_by_user_id)
  const subscribedCalendars = calendarList.filter((c) => !!c.shared_by_user_id)

  return (
    <div className="w-56 flex-shrink-0 border-r border-[#EDEBE9] bg-[#F3F2F1] flex flex-col h-full relative">
      <MiniCalendar selectedDate={selectedDate} onDateSelect={onDateSelect} />

      <div className="h-px bg-[#EDEBE9] mx-3" />

      {/* Add calendar — opens a small dialog to create a real calendar
          (name + color). The user can then pick this calendar when
          composing an event so events get color-coded by purpose. */}
      <button
        type="button"
        onClick={() => setNewCalendarOpen(true)}
        className="mx-3 mt-3 flex items-center gap-2 text-sm text-[#0078D4] hover:bg-[#EDEBE9] rounded px-2 py-1.5 transition-colors"
      >
        <Plus size={14} /> <span className="font-medium">Add calendar</span>
      </button>

      {/* Calendar list */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar p-3 space-y-4">
        {/* My calendars */}
        <div>
          <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide mb-2">
            My calendars
          </p>
          <ul className="space-y-1">
            {myCalendars.map((cal) => (
              <li key={cal.id} className="group">
                <div className="flex items-center gap-1 px-1 py-1 rounded hover:bg-[#EDEBE9] transition-colors">
                  <button
                    onClick={() => toggleVisibility.mutate(cal)}
                    aria-label={`${cal.is_visible ? 'Hide' : 'Show'} ${cal.name} calendar`}
                    aria-pressed={cal.is_visible}
                    className="flex items-center gap-2 flex-1 min-w-0 text-sm text-[#323130]"
                  >
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: cal.is_visible ? cal.color : 'transparent',
                        border: `2px solid ${cal.color}`,
                      }}
                    />
                    <span className="flex-1 text-left truncate">{cal.name}</span>
                    {!cal.is_visible && <EyeOff size={12} className="text-[#A19F9D] flex-shrink-0" />}
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${cal.name}`}
                    title="Edit calendar"
                    onClick={() => openEdit(cal)}
                    className="p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 text-[#605E5C] hover:text-[#0078D4]"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Share ${cal.name}`}
                    title={cal.is_shared ? 'Sharing settings' : 'Share calendar'}
                    onClick={() => setShareDialog({ cal, permission: cal.permission_level === 'none' ? 'read' : cal.permission_level })}
                    className={cn(
                      'p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0',
                      cal.is_shared ? 'text-[#0078D4] opacity-100' : 'text-[#605E5C] hover:text-[#0078D4]'
                    )}
                  >
                    <Share2 size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Publish ${cal.name}`}
                    title="Publish calendar (external link)"
                    onClick={() => setPublishDialog({ cal, detail: 'availability' })}
                    className="p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 text-[#605E5C] hover:text-[#0078D4]"
                  >
                    <Globe size={12} />
                  </button>
                </div>
                {cal.is_shared && (
                  <p className="text-[10px] text-[#0078D4] pl-6 -mt-0.5 truncate">
                    Shared · {PERMISSION_OPTIONS.find((p) => p.value === cal.permission_level)?.label ?? cal.permission_level}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Other people's calendars */}
        <div>
          <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-wide mb-2">
            Other people&apos;s calendars
          </p>
          <ul className="space-y-1 mb-2">
            {subscribedCalendars.map((cal) => (
              <li key={cal.id} className="group">
                <div className="flex items-center gap-1 px-1 py-1 rounded hover:bg-[#EDEBE9] transition-colors">
                  <button
                    onClick={() => toggleVisibility.mutate(cal)}
                    aria-label={`${cal.is_visible ? 'Hide' : 'Show'} ${cal.name}`}
                    aria-pressed={cal.is_visible}
                    className="flex items-center gap-2 flex-1 min-w-0 text-sm text-[#323130]"
                  >
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: cal.is_visible ? cal.color : 'transparent',
                        border: `2px solid ${cal.color}`,
                      }}
                    />
                    <span className="flex-1 text-left truncate">{cal.name}</span>
                    {!cal.is_visible && <EyeOff size={12} className="text-[#A19F9D] flex-shrink-0" />}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${cal.name}`}
                    title="Remove from my calendars"
                    onClick={() => unsubscribeMutation.mutate(cal.id)}
                    className="p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 text-[#605E5C] hover:text-[#D13438]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {/* Subscribe by email */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (subscribeEmail.trim()) subscribeMutation.mutate(subscribeEmail.trim())
            }}
            className="flex items-center gap-1"
          >
            <input
              type="email"
              value={subscribeEmail}
              onChange={(e) => { setSubscribeEmail(e.target.value); setSubscribeError('') }}
              placeholder="Add person's email"
              aria-label="Subscribe to another person's calendar"
              className="flex-1 text-[11px] border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] bg-white focus:outline-none focus:border-[#0078D4] min-w-0"
            />
            <button
              type="submit"
              aria-label="Add calendar overlay"
              disabled={!subscribeEmail.trim() || subscribeMutation.isPending}
              className="p-1.5 rounded bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-40 text-white transition-colors flex-shrink-0"
            >
              <UserPlus size={11} />
            </button>
          </form>
          {subscribeError && (
            <p className="text-[10px] text-[#D13438] mt-1 truncate">{subscribeError}</p>
          )}
        </div>
      </div>

      {/* Publish dialog overlay */}
      {publishDialog && (() => {
        // Read the latest calendar from React Query so the URL reflects the
        // freshly-generated publish_token after the mutation runs (the
        // captured snapshot in publishDialog.cal stays stale).
        const liveCal = calendarList.find((c) => c.id === publishDialog.cal.id) ?? publishDialog.cal
        const pubUrl = liveCal.publish_token
          ? `${typeof window !== 'undefined' ? window.location.origin : 'https://app.example.com'}/calendar/public/${liveCal.publish_token}`
          : 'Generating link…'
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Publish ${publishDialog.cal.name}`}
            className="absolute inset-0 z-20 flex items-start justify-center pt-8 bg-black/20"
            onClick={(e) => { if (e.target === e.currentTarget) setPublishDialog(null) }}
          >
            <div className="bg-white rounded shadow-outlook-lg border border-[#EDEBE9] w-56 mx-2">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9]">
                <h3 className="text-sm font-semibold text-[#323130] flex items-center gap-1.5">
                  <Globe size={13} className="text-[#0078D4]" />
                  Publish calendar
                </h3>
                <button type="button" aria-label="Close" onClick={() => setPublishDialog(null)} className="text-[#605E5C] hover:text-[#323130]">
                  <X size={13} />
                </button>
              </div>
              <div className="p-3 space-y-3">
                <p className="text-xs text-[#605E5C] font-medium">Show</p>
                <div className="space-y-1">
                  {([['availability', 'Availability only', 'Show free/busy status'], ['full', 'All details', 'Show event titles and details']] as const).map(([val, label, desc]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPublishDialog((d) => d ? { ...d, detail: val } : d)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between gap-2',
                        publishDialog.detail === val ? 'bg-[#EBF3FB] text-[#0078D4]' : 'text-[#323130] hover:bg-[#F3F2F1]'
                      )}
                    >
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-[#A19F9D]">{desc}</p>
                      </div>
                      {publishDialog.detail === val && <Check size={12} className="flex-shrink-0" />}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-[#605E5C] font-medium mb-1">Public link</p>
                  <div className="flex items-center gap-1">
                    <input
                      readOnly
                      value={pubUrl}
                      aria-label="Public calendar URL"
                      className="flex-1 text-[10px] border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] bg-[#FAF9F8] focus:outline-none truncate"
                    />
                    <button
                      type="button"
                      aria-label="Copy link"
                      onClick={() => {
                        navigator.clipboard?.writeText(pubUrl)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="p-1.5 rounded border border-[#EDEBE9] hover:bg-[#F3F2F1] text-[#605E5C] transition-colors flex-shrink-0"
                    >
                      {copied ? <Check size={11} className="text-[#107C10]" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Share dialog overlay */}
      {shareDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Share ${shareDialog.cal.name}`}
          className="absolute inset-0 z-20 flex items-start justify-center pt-8 bg-black/20"
          onClick={(e) => { if (e.target === e.currentTarget) setShareDialog(null) }}
        >
          <div className="bg-white rounded shadow-outlook-lg border border-[#EDEBE9] w-56 mx-2">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9]">
              <h3 className="text-sm font-semibold text-[#323130] truncate">{shareDialog.cal.name}</h3>
              <button type="button" aria-label="Close" onClick={() => setShareDialog(null)} className="text-[#605E5C] hover:text-[#323130]">
                <X size={13} />
              </button>
            </div>
            <div className="p-3">
              <p className="text-xs font-medium text-[#605E5C] mb-2">Permission level</p>
              <div className="space-y-1">
                {PERMISSION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setShareDialog((d) => d ? { ...d, permission: opt.value } : d)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between gap-2',
                      shareDialog.permission === opt.value
                        ? 'bg-[#EBF3FB] text-[#0078D4]'
                        : 'text-[#323130] hover:bg-[#F3F2F1]'
                    )}
                  >
                    <div>
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-[#A19F9D]">{opt.description}</p>
                    </div>
                    {shareDialog.permission === opt.value && <Check size={12} className="flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => shareMutation.mutate({ cal: shareDialog.cal, permission: shareDialog.permission })}
                  disabled={shareMutation.isPending}
                  className="flex-1 text-xs font-medium bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white px-3 py-1.5 rounded transition-colors"
                >
                  Share
                </button>
                {shareDialog.cal.is_shared && (
                  <button
                    type="button"
                    onClick={() => { unshareMutation.mutate(shareDialog.cal.id); setShareDialog(null) }}
                    className="text-xs text-[#D13438] hover:bg-[#FDE7E9] px-2 py-1.5 rounded transition-colors"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New calendar dialog */}
      {newCalendarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New calendar"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setNewCalendarOpen(false) }}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9]">
              <h2 className="text-base font-semibold text-[#323130]">New calendar</h2>
              <button
                type="button"
                onClick={() => setNewCalendarOpen(false)}
                aria-label="Close"
                className="p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="newcal-name">
                  Name
                </label>
                <input
                  id="newcal-name"
                  type="text"
                  value={newCalName}
                  onChange={(e) => setNewCalName(e.target.value)}
                  placeholder="e.g. Project X"
                  autoFocus
                  className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                />
              </div>
              <div>
                <p className="block text-xs font-medium text-[#605E5C] mb-1.5">Color</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    '#0078D4', '#107C10', '#FF8C00', '#D13438',
                    '#8764B8', '#FFB900', '#5C2E91', '#00B7C3',
                    '#E81123', '#A1A1A1',
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCalColor(c)}
                      aria-label={`Color ${c}`}
                      aria-pressed={newCalColor === c}
                      className={cn(
                        'w-7 h-7 rounded-full border-2 transition-transform',
                        newCalColor === c ? 'border-[#323130] scale-110' : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#EDEBE9]">
              <button
                type="button"
                onClick={() => setNewCalendarOpen(false)}
                className="text-sm border border-[#8A8886] text-[#323130] px-4 py-1.5 rounded hover:bg-[#F3F2F1]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  newCalName.trim() &&
                  createCalendarMutation.mutate({ name: newCalName.trim(), color: newCalColor })
                }
                disabled={!newCalName.trim() || createCalendarMutation.isPending}
                className={cn(
                  'text-sm bg-[#0078D4] hover:bg-[#106EBE] text-white px-4 py-1.5 rounded',
                  (!newCalName.trim() || createCalendarMutation.isPending) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {createCalendarMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit calendar dialog — rename / recolor / delete (non-default only) */}
      {editCal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editCal.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditCal(null) }}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9]">
              <h2 className="text-base font-semibold text-[#323130]">Edit calendar</h2>
              <button
                type="button"
                onClick={() => setEditCal(null)}
                aria-label="Close"
                className="p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#605E5C] mb-1" htmlFor="editcal-name">
                  Name
                </label>
                <input
                  id="editcal-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="w-full text-sm border border-[#8A8886] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                />
              </div>
              <div>
                <p className="block text-xs font-medium text-[#605E5C] mb-1.5">Color</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    '#0078D4', '#107C10', '#FF8C00', '#D13438',
                    '#8764B8', '#FFB900', '#5C2E91', '#00B7C3',
                    '#E81123', '#A1A1A1',
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      aria-label={`Color ${c}`}
                      aria-pressed={editColor === c}
                      className={cn(
                        'w-7 h-7 rounded-full border-2 transition-transform',
                        editColor === c ? 'border-[#323130] scale-110' : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {editCal.is_default && (
                <p className="text-[11px] text-[#605E5C] italic">
                  This is your default calendar — it can be renamed and recolored, but not deleted.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#EDEBE9]">
              <button
                type="button"
                onClick={() =>
                  editName.trim() && editCal &&
                  editCalendarMutation.mutate({ id: editCal.id, name: editName.trim(), color: editColor })
                }
                disabled={!editName.trim() || editCalendarMutation.isPending}
                className={cn(
                  'text-sm bg-[#0078D4] hover:bg-[#106EBE] text-white px-4 py-1.5 rounded',
                  (!editName.trim() || editCalendarMutation.isPending) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {editCalendarMutation.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditCal(null)}
                className="text-sm border border-[#8A8886] text-[#323130] px-4 py-1.5 rounded hover:bg-[#F3F2F1]"
              >
                Cancel
              </button>
              {!editCal.is_default && (
                <button
                  type="button"
                  onClick={() => {
                    if (editCal && confirm(`Delete the calendar "${editCal.name}"? Events on it will be removed.`)) {
                      deleteCalendarMutation.mutate(editCal.id)
                    }
                  }}
                  disabled={deleteCalendarMutation.isPending}
                  className="ml-auto text-sm flex items-center gap-1.5 text-[#D13438] hover:bg-[#FDE7E9] px-3 py-1.5 rounded"
                >
                  <Trash2 size={13} />
                  {deleteCalendarMutation.isPending ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
