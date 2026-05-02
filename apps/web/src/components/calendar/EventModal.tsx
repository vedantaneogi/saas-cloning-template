'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { events, calendars, contacts } from '@/lib/api'
import type { Event, Contact } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MapPin, Video, Users, Clock, RotateCcw, Check, HelpCircle, X as XIcon, CalendarSearch, Building2, Search, AlignLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  calendar_id: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  all_day: z.boolean(),
  location: z.string().optional(),
  description: z.string().optional(),
  is_online_meeting: z.boolean(),
  reminder_minutes: z.number(),
  repeat: z.boolean(),
  repeat_frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  repeat_interval: z.number().min(1),
  repeat_end_type: z.enum(['never', 'date', 'count']),
  repeat_end_date: z.string().optional(),
  repeat_count: z.number().min(1).optional(),
  repeat_days_of_week: z.array(z.number()).optional(),
})

type FormValues = z.infer<typeof schema>

interface EventModalProps {
  open: boolean
  onClose: () => void
  initialDate?: Date
  event?: Event
}

function formatDateTimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function EventModal({ open, onClose, initialDate, event }: EventModalProps) {
  const queryClient = useQueryClient()
  const [scopeDialog, setScopeDialog] = useState<{ action: 'save'; data: FormValues } | { action: 'delete' } | null>(null)

  const { data: calendarList = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendars.list(),
  })

  const defaultCalendar = calendarList.find((c) => c.is_default) ?? calendarList[0]

  const now = initialDate ?? new Date()
  const nowPlus1 = new Date(now.getTime() + 60 * 60 * 1000)

  const existingDays = event?.recurrence_rule?.days_of_week ?? []

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: event
      ? {
          title: event.title,
          calendar_id: event.calendar_id,
          start_time: formatDateTimeLocal(new Date(event.start_time)),
          end_time: formatDateTimeLocal(new Date(event.end_time)),
          all_day: event.all_day,
          location: event.location ?? '',
          description: event.description ?? '',
          is_online_meeting: event.is_online_meeting,
          reminder_minutes: event.reminder_minutes,
          repeat: event.is_recurring,
          repeat_frequency: event.recurrence_rule?.frequency ?? 'weekly',
          repeat_interval: event.recurrence_rule?.interval ?? 1,
          repeat_end_type: event.recurrence_rule?.end_date ? 'date' : event.recurrence_rule?.count ? 'count' : 'never',
          repeat_end_date: event.recurrence_rule?.end_date ?? '',
          repeat_count: event.recurrence_rule?.count ?? 10,
          repeat_days_of_week: existingDays,
        }
      : {
          title: '',
          calendar_id: defaultCalendar?.id ?? '',
          start_time: formatDateTimeLocal(now),
          end_time: formatDateTimeLocal(nowPlus1),
          all_day: false,
          location: '',
          description: '',
          is_online_meeting: false,
          reminder_minutes: 15,
          repeat: false,
          repeat_frequency: 'weekly',
          repeat_interval: 1,
          repeat_end_type: 'never',
          repeat_end_date: '',
          repeat_count: 10,
          repeat_days_of_week: [],
        },
  })

  const allDay = watch('all_day')
  const repeat = watch('repeat')
  const repeatFrequency = watch('repeat_frequency')
  const repeatEndType = watch('repeat_end_type')
  const repeatDays = watch('repeat_days_of_week') ?? []

  const toggleDay = (day: number) => {
    const current = repeatDays
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    setValue('repeat_days_of_week', next)
  }

  const buildPayload = (data: FormValues) => {
    const recurrenceRule = data.repeat
      ? {
          frequency: data.repeat_frequency,
          interval: data.repeat_interval,
          ...(data.repeat_end_type === 'date' && data.repeat_end_date
            ? { end_date: data.repeat_end_date }
            : {}),
          ...(data.repeat_end_type === 'count' && data.repeat_count
            ? { count: data.repeat_count }
            : {}),
          ...(data.repeat_frequency === 'weekly' && data.repeat_days_of_week?.length
            ? { days_of_week: data.repeat_days_of_week }
            : {}),
        }
      : null
    return {
      title: data.title,
      calendar_id: data.calendar_id,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      all_day: data.all_day,
      location: data.location,
      description: data.description,
      is_online_meeting: data.is_online_meeting,
      reminder_minutes: data.reminder_minutes,
      is_recurring: data.repeat,
      recurrence_rule: recurrenceRule,
    }
  }

  const saveMutation = useMutation({
    mutationFn: ({ data, scope }: { data: FormValues; scope?: 'single' | 'series' }) => {
      const payload = buildPayload(data)
      if (event) {
        // For single-occurrence edits, target the parent and pass the occurrence start time
        if (scope === 'single' && event.recurrence_parent_id) {
          return events.update(event.recurrence_parent_id, payload, scope, event.start_time)
        }
        return events.update(event.id, payload, scope)
      }
      return events.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setScopeDialog(null)
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (scope?: 'single' | 'series') => {
      if (scope === 'single' && event!.recurrence_parent_id) {
        return events.delete(event!.recurrence_parent_id, scope, event!.start_time)
      }
      return events.delete(event!.id, scope)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setScopeDialog(null)
      onClose()
    },
  })

  const respondMutation = useMutation({
    mutationFn: (response: 'accepted' | 'tentative' | 'declined') =>
      events.respond(event!.id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const proposeMutation = useMutation({
    mutationFn: ({ start_time, end_time }: { start_time: string; end_time: string }) =>
      events.proposeTime(event!.id, start_time, end_time),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setProposeOpen(false)
    },
  })

  const [proposeOpen, setProposeOpen] = useState(false)
  const [proposeStart, setProposeStart] = useState('')
  const [proposeEnd, setProposeEnd] = useState('')


  const handleSaveClick = (data: FormValues) => {
    if (event?.is_recurring) {
      setScopeDialog({ action: 'save', data })
    } else {
      saveMutation.mutate({ data })
    }
  }

  const handleDeleteClick = () => {
    if (event?.is_recurring) {
      setScopeDialog({ action: 'delete' })
    } else {
      deleteMutation.mutate(undefined)
    }
  }

  const attendees = event?.attendees ?? []
  const myAttendee = attendees.find((a) => !a.is_organizer)

  // Attendees invite field
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState<Contact[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invitedAttendees, setInvitedAttendees] = useState<{ email: string; name: string }[]>([])

  const handleInviteSearch = async (q: string) => {
    setInviteQuery(q)
    if (q.trim().length < 2) { setInviteResults([]); setInviteOpen(false); return }
    try {
      const res = await contacts.autocomplete(q)
      setInviteResults(res)
      setInviteOpen(res.length > 0)
    } catch { setInviteResults([]); setInviteOpen(false) }
  }

  const addInvitee = (contact: Contact) => {
    if (!invitedAttendees.find((a) => a.email === contact.email)) {
      setInvitedAttendees((prev) => [...prev, { email: contact.email, name: contact.display_name }])
    }
    setInviteQuery('')
    setInviteResults([])
    setInviteOpen(false)
  }

  const removeInvitee = (email: string) => {
    setInvitedAttendees((prev) => prev.filter((a) => a.email !== email))
  }

  // Room finder
  const [roomFinderOpen, setRoomFinderOpen] = useState(false)
  const [roomQuery, setRoomQuery] = useState('')

  const ROOMS = [
    { id: 'r1', name: 'Boardroom A', building: 'HQ – Floor 3', capacity: 20, features: ['Projector', 'Video conf'] },
    { id: 'r2', name: 'Boardroom B', building: 'HQ – Floor 3', capacity: 12, features: ['Whiteboard', 'Video conf'] },
    { id: 'r3', name: 'Focus Room 1', building: 'HQ – Floor 2', capacity: 4, features: ['TV screen'] },
    { id: 'r4', name: 'Focus Room 2', building: 'HQ – Floor 2', capacity: 4, features: ['TV screen'] },
    { id: 'r5', name: 'Training Room', building: 'HQ – Floor 1', capacity: 30, features: ['Projector', 'Whiteboard'] },
    { id: 'r6', name: 'East Wing Conf', building: 'East Wing – Floor 1', capacity: 8, features: ['Video conf'] },
    { id: 'r7', name: 'West Wing Conf', building: 'West Wing – Floor 2', capacity: 10, features: ['Whiteboard', 'Video conf'] },
  ]

  const filteredRooms = roomQuery.trim()
    ? ROOMS.filter(
        (r) =>
          r.name.toLowerCase().includes(roomQuery.toLowerCase()) ||
          r.building.toLowerCase().includes(roomQuery.toLowerCase()) ||
          r.features.some((f) => f.toLowerCase().includes(roomQuery.toLowerCase()))
      )
    : ROOMS

  // Scheduling assistant
  const [schedulerOpen, setSchedulerOpen] = useState(false)
  const startVal = watch('start_time')
  const endVal = watch('end_time')
  const attendeeEmails = attendees.map((a) => a.email).filter(Boolean)

  const { data: availabilityData, refetch: fetchAvailability, isFetching: availabilityLoading } = useQuery({
    queryKey: ['availability', attendeeEmails, startVal, endVal],
    queryFn: () => events.getAvailability(
      attendeeEmails,
      startVal ? new Date(startVal).toISOString() : new Date().toISOString(),
      endVal ? new Date(endVal).toISOString() : new Date().toISOString(),
    ),
    enabled: false,
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit event' : 'New event'}
      size="lg"
    >
      {/* Scope dialog for recurring events */}
      {scopeDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={scopeDialog.action === 'delete' ? 'Delete recurring event' : 'Save recurring event'}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded"
        >
          <div className="bg-white rounded shadow-outlook-lg border border-[#EDEBE9] p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-[#323130] mb-2">
              {scopeDialog.action === 'delete' ? 'Delete recurring event' : 'Edit recurring event'}
            </h3>
            <p className="text-sm text-[#605E5C] mb-4">
              This is a recurring event. Do you want to {scopeDialog.action === 'delete' ? 'delete' : 'edit'} just this event or all events in the series?
            </p>
            <div className="flex flex-col gap-2 mb-4">
              <button
                aria-label="This event only"
                onClick={() => {
                  if (scopeDialog.action === 'delete') {
                    deleteMutation.mutate('single')
                  } else {
                    saveMutation.mutate({ data: scopeDialog.data, scope: 'single' })
                  }
                }}
                className="text-left px-3 py-2 text-sm rounded border border-[#EDEBE9] hover:bg-[#F3F2F1] text-[#323130] transition-colors"
              >
                This event
              </button>
              <button
                aria-label="All events in series"
                onClick={() => {
                  if (scopeDialog.action === 'delete') {
                    deleteMutation.mutate('series')
                  } else {
                    saveMutation.mutate({ data: scopeDialog.data, scope: 'series' })
                  }
                }}
                className="text-left px-3 py-2 text-sm rounded border border-[#EDEBE9] hover:bg-[#F3F2F1] text-[#323130] transition-colors"
              >
                All events in series
              </button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setScopeDialog(null)} aria-label="Cancel">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Invite response buttons */}
      {myAttendee && (
        <div className="px-4 pt-3 pb-0 flex items-center gap-2 border-b border-[#EDEBE9]">
          <span className="text-xs text-[#605E5C] mr-1">RSVP:</span>
          <button
            type="button"
            aria-label="Accept invite"
            aria-pressed={myAttendee.response_status === 'accepted'}
            onClick={() => respondMutation.mutate('accepted')}
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors',
              myAttendee.response_status === 'accepted'
                ? 'bg-[#107C10] text-white border-[#107C10]'
                : 'border-[#D2D0CE] text-[#323130] hover:bg-[#F3F2F1]'
            )}
          >
            <Check size={11} /> Accept
          </button>
          <button
            type="button"
            aria-label="Accept tentatively"
            aria-pressed={myAttendee.response_status === 'tentative'}
            onClick={() => respondMutation.mutate('tentative')}
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors',
              myAttendee.response_status === 'tentative'
                ? 'bg-[#FFB900] text-white border-[#FFB900]'
                : 'border-[#D2D0CE] text-[#323130] hover:bg-[#F3F2F1]'
            )}
          >
            <HelpCircle size={11} /> Tentative
          </button>
          <button
            type="button"
            aria-label="Decline invite"
            aria-pressed={myAttendee.response_status === 'declined'}
            onClick={() => respondMutation.mutate('declined')}
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors',
              myAttendee.response_status === 'declined'
                ? 'bg-[#D13438] text-white border-[#D13438]'
                : 'border-[#D2D0CE] text-[#323130] hover:bg-[#F3F2F1]'
            )}
          >
            <XIcon size={11} /> Decline
          </button>
          <button
            type="button"
            aria-label="Propose new time"
            onClick={() => {
              setProposeStart(event ? formatDateTimeLocal(new Date(event.start_time)) : '')
              setProposeEnd(event ? formatDateTimeLocal(new Date(event.end_time)) : '')
              setProposeOpen(true)
            }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-[#D2D0CE] text-[#323130] hover:bg-[#F3F2F1] transition-colors"
          >
            <Clock size={11} /> Propose new time
          </button>
        </div>
      )}

      {/* Propose new time dialog */}
      {proposeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Propose new time"
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded"
        >
          <div className="bg-white rounded shadow-outlook-lg border border-[#EDEBE9] p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-[#323130] mb-4">Propose new time</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#605E5C] mb-1">Start</label>
                <input
                  type="datetime-local"
                  value={proposeStart}
                  onChange={(e) => setProposeStart(e.target.value)}
                  className="w-full border border-[#8A8886] rounded px-3 py-1.5 text-sm text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#605E5C] mb-1">End</label>
                <input
                  type="datetime-local"
                  value={proposeEnd}
                  onChange={(e) => setProposeEnd(e.target.value)}
                  className="w-full border border-[#8A8886] rounded px-3 py-1.5 text-sm text-[#323130] focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={proposeMutation.isPending}
                onClick={() => proposeMutation.mutate({
                  start_time: new Date(proposeStart).toISOString(),
                  end_time: new Date(proposeEnd).toISOString(),
                })}
              >
                Send proposal
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setProposeOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(handleSaveClick)}
        className="p-4 space-y-4"
        aria-label={event ? 'Edit event form' : 'New event form'}
      >
        {/* Title */}
        <div>
          <Input
            placeholder="Add a title"
            aria-label="Event title"
            error={!!errors.title}
            className="text-xl border-0 border-b border-[#EDEBE9] rounded-none px-0 focus:ring-0 focus:border-[#0078D4] text-[#323130] font-semibold"
            {...register('title')}
          />
          {errors.title && (
            <p className="text-xs text-[#D13438] mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Attendees */}
        <div className="flex items-start gap-3">
          <span className="w-5 text-[#605E5C] pt-2">
            <Users size={16} />
          </span>
          <div className="flex-1 relative">
            <div className="flex flex-wrap gap-1 min-h-[34px] border border-[#EDEBE9] rounded px-2 py-1 focus-within:ring-2 focus-within:ring-[#0078D4] bg-white">
              {invitedAttendees.map((a) => (
                <span key={a.email} className="flex items-center gap-1 bg-[#EBF3FB] text-[#0078D4] text-xs px-1.5 py-0.5 rounded">
                  {a.name || a.email}
                  <button type="button" onClick={() => removeInvitee(a.email)} aria-label={`Remove ${a.name}`} className="hover:text-[#D13438]">
                    <XIcon size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={inviteQuery}
                onChange={(e) => handleInviteSearch(e.target.value)}
                onFocus={() => inviteResults.length > 0 && setInviteOpen(true)}
                onBlur={() => setTimeout(() => setInviteOpen(false), 150)}
                placeholder={invitedAttendees.length === 0 ? 'Invite required attendees' : ''}
                aria-label="Invite required attendees"
                className="flex-1 min-w-[160px] text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent py-0.5"
              />
            </div>
            {inviteOpen && inviteResults.length > 0 && (
              <div className="absolute left-0 top-full mt-0.5 z-50 w-full bg-white border border-[#EDEBE9] rounded shadow-outlook-lg max-h-48 overflow-y-auto">
                {inviteResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => addInvitee(c)}
                    className="w-full text-left px-3 py-2 hover:bg-[#F3F2F1] transition-colors"
                  >
                    <p className="text-sm font-medium text-[#323130]">{c.display_name}</p>
                    <p className="text-xs text-[#605E5C]">{c.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="flex items-center gap-3">
          <span className="w-5 text-[#605E5C]">
            <Users size={16} />
          </span>
          <select
            aria-label="Calendar"
            className="text-sm text-[#323130] border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4]"
            {...register('calendar_id')}
          >
            {calendarList.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
        </div>

        {/* Time */}
        <div className="flex items-start gap-3">
          <span className="w-5 text-[#605E5C] pt-1.5">
            <Clock size={16} />
          </span>
          <div className="flex-1 space-y-2">
            <label className="flex items-center gap-2 text-sm text-[#323130]">
              <input
                type="checkbox"
                aria-label="All day event"
                className="rounded border-[#D2D0CE]"
                {...register('all_day')}
              />
              All day
            </label>
            <div className="flex items-center gap-2">
              <input
                type={allDay ? 'date' : 'datetime-local'}
                aria-label="Start time"
                className="text-sm border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130]"
                {...register('start_time')}
              />
              <span className="text-[#605E5C] text-sm">→</span>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                aria-label="End time"
                className="text-sm border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130]"
                {...register('end_time')}
              />
            </div>
          </div>
        </div>

        {/* Recurrence */}
        <div className="flex items-start gap-3">
          <span className="w-5 text-[#605E5C] pt-1">
            <RotateCcw size={16} />
          </span>
          <div className="flex-1 space-y-2">
            <label className="flex items-center gap-2 text-sm text-[#323130]">
              <input
                type="checkbox"
                aria-label="Repeat event"
                className="rounded border-[#D2D0CE]"
                {...register('repeat')}
              />
              Repeat
            </label>
            {repeat && (
              <div className="space-y-2 pl-1">
                {/* Frequency + interval */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#605E5C]">Every</span>
                  <input
                    type="number"
                    min={1}
                    aria-label="Repeat interval"
                    className="w-14 text-sm border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130]"
                    {...register('repeat_interval', { valueAsNumber: true })}
                  />
                  <select
                    aria-label="Repeat frequency"
                    className="text-sm border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130]"
                    {...register('repeat_frequency')}
                  >
                    <option value="daily">day(s)</option>
                    <option value="weekly">week(s)</option>
                    <option value="monthly">month(s)</option>
                    <option value="yearly">year(s)</option>
                  </select>
                </div>

                {/* Days of week (weekly only) */}
                {repeatFrequency === 'weekly' && (
                  <div className="flex items-center gap-1" aria-label="Days of week">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        aria-label={label}
                        aria-pressed={repeatDays.includes(idx)}
                        className={cn(
                          'w-7 h-7 text-xs rounded-full border transition-colors',
                          repeatDays.includes(idx)
                            ? 'bg-[#0078D4] text-white border-[#0078D4]'
                            : 'border-[#D2D0CE] text-[#605E5C] hover:border-[#0078D4]'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* End type */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#605E5C]">Ends</span>
                  <select
                    aria-label="Recurrence end type"
                    className="text-sm border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130]"
                    {...register('repeat_end_type')}
                  >
                    <option value="never">Never</option>
                    <option value="date">On date</option>
                    <option value="count">After</option>
                  </select>
                  {repeatEndType === 'date' && (
                    <input
                      type="date"
                      aria-label="Recurrence end date"
                      className="text-sm border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130]"
                      {...register('repeat_end_date')}
                    />
                  )}
                  {repeatEndType === 'count' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        aria-label="Repeat count"
                        className="w-16 text-sm border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130]"
                        {...register('repeat_count', { valueAsNumber: true })}
                      />
                      <span className="text-xs text-[#605E5C]">occurrences</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-3">
          <span className="w-5 text-[#605E5C]">
            <MapPin size={16} />
          </span>
          <Input
            placeholder="Add a location"
            aria-label="Location"
            {...register('location')}
          />
        </div>

        {/* Room finder */}
        <div className="flex items-start gap-3">
          <span className="w-5 text-[#605E5C] pt-1">
            <Building2 size={16} />
          </span>
          <div className="flex-1">
            <button
              type="button"
              aria-label="Find a room"
              aria-expanded={roomFinderOpen}
              onClick={() => setRoomFinderOpen((v) => !v)}
              className={cn(
                'text-sm px-2 py-1 rounded border transition-colors flex items-center gap-1.5',
                roomFinderOpen
                  ? 'border-[#0078D4] text-[#0078D4] bg-[#EBF3FB]'
                  : 'border-[#D2D0CE] text-[#605E5C] hover:bg-[#F3F2F1]'
              )}
            >
              <Building2 size={13} /> Find a room
            </button>

            {roomFinderOpen && (
              <div className="mt-2 border border-[#EDEBE9] rounded overflow-hidden">
                {/* Search */}
                <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#EDEBE9] bg-[#FAF9F8]">
                  <Search size={12} className="text-[#A19F9D] flex-shrink-0" />
                  <input
                    type="text"
                    value={roomQuery}
                    onChange={(e) => setRoomQuery(e.target.value)}
                    placeholder="Search rooms…"
                    aria-label="Search rooms"
                    className="flex-1 text-xs text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent"
                  />
                  {roomQuery && (
                    <button type="button" onClick={() => setRoomQuery('')} className="text-[#A19F9D] hover:text-[#323130]">
                      <XIcon size={11} />
                    </button>
                  )}
                </div>

                {/* Room list */}
                <div className="max-h-48 overflow-y-auto outlook-scrollbar">
                  {filteredRooms.length === 0 ? (
                    <p className="text-xs text-[#A19F9D] px-3 py-3">No rooms match your search.</p>
                  ) : (
                    filteredRooms.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        aria-label={`Select ${room.name}`}
                        onClick={() => {
                          setValue('location', `${room.name}, ${room.building}`)
                          setRoomFinderOpen(false)
                          setRoomQuery('')
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#F3F2F1] transition-colors border-b border-[#EDEBE9] last:border-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#323130] truncate">{room.name}</p>
                            <p className="text-xs text-[#605E5C] truncate">{room.building}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs text-[#605E5C]">Cap. {room.capacity}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {room.features.map((f) => (
                            <span key={f} className="text-xs bg-[#EDEBE9] text-[#605E5C] px-1.5 py-0.5 rounded">
                              {f}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Online meeting — Teams toggle */}
        <div className="flex items-center gap-3">
          <span className="w-5 text-[#6264A7]">
            <Video size={16} />
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={watch('is_online_meeting')}
              aria-label="Teams meeting toggle"
              onClick={() => setValue('is_online_meeting', !watch('is_online_meeting'))}
              className={cn(
                'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6264A7] focus:ring-offset-1',
                watch('is_online_meeting') ? 'bg-[#6264A7]' : 'bg-[#D2D0CE]'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
                  watch('is_online_meeting') ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
            <span className="text-sm text-[#323130]">
              {watch('is_online_meeting') ? (
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#6264A7]">Teams</span>
                  <span className="text-[#605E5C]">meeting link will be included</span>
                </span>
              ) : (
                <span className="text-[#605E5C]">Add a Teams meeting</span>
              )}
            </span>
          </div>
        </div>

        {/* Reminder */}
        <div className="flex items-center gap-3">
          <span className="w-5 text-[#605E5C]">
            <Clock size={16} />
          </span>
          <div className="flex items-center gap-2">
            <select
              aria-label="Reminder"
              className="text-sm border border-[#EDEBE9] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130]"
              {...register('reminder_minutes', { valueAsNumber: true })}
            >
              <option value={0}>No reminder</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={1440}>1 day</option>
            </select>
            <span className="text-sm text-[#605E5C]">before</span>
          </div>
        </div>

        {/* Description */}
        <div className="flex items-start gap-3">
          <span className="w-5 text-[#605E5C] pt-1.5">
            <AlignLeft size={16} />
          </span>
          <textarea
            placeholder="Add a description or attach documents"
            aria-label="Description"
            rows={6}
            className="flex-1 text-sm border border-[#EDEBE9] rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130] placeholder:text-[#A19F9D] resize-y"
            {...register('description')}
          />
        </div>

        {/* Scheduling assistant */}
        {attendeeEmails.length > 0 && (
          <div className="border border-[#EDEBE9] rounded">
            <button
              type="button"
              aria-label="Scheduling assistant"
              aria-expanded={schedulerOpen}
              onClick={() => {
                setSchedulerOpen((v) => !v)
                if (!schedulerOpen) fetchAvailability()
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#0078D4] hover:bg-[#F3F2F1] transition-colors rounded"
            >
              <CalendarSearch size={14} />
              Scheduling assistant
              {schedulerOpen ? <span className="ml-auto text-[#605E5C] text-xs">▲</span> : <span className="ml-auto text-[#605E5C] text-xs">▼</span>}
            </button>
            {schedulerOpen && (
              <div className="border-t border-[#EDEBE9] px-3 py-3 space-y-3">
                {availabilityLoading ? (
                  <p className="text-xs text-[#605E5C] animate-pulse">Checking availability…</p>
                ) : availabilityData ? (
                  <>
                    {/* Free/busy grid — one row per attendee, one cell per hour */}
                    {(() => {
                      const rangeStart = startVal ? new Date(startVal) : new Date()
                      const rangeEnd = endVal ? new Date(endVal) : new Date(rangeStart.getTime() + 3600_000)
                      const totalMs = rangeEnd.getTime() - rangeStart.getTime()
                      const totalHours = Math.max(1, Math.ceil(totalMs / 3600_000))
                      const hours = Array.from({ length: Math.min(totalHours, 24) }, (_, i) => i)

                      const isBusy = (attendeeRow: { attendee: string; slots: Array<{ start: string; end: string; status: string }> }, hourOffset: number) => {
                        const slotStart = new Date(rangeStart.getTime() + hourOffset * 3600_000)
                        const slotEnd = new Date(slotStart.getTime() + 3600_000)
                        return attendeeRow.slots.some((s) => {
                          const bs = new Date(s.start), be = new Date(s.end)
                          return bs < slotEnd && be > slotStart
                        })
                      }

                      // Find suggested free slots: hours where all attendees are free
                      const suggestedHours = hours.filter((h) =>
                        availabilityData.every((row) => !isBusy(row, h))
                      ).slice(0, 3)

                      return (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-[#323130] mb-1.5">
                              Free/busy grid
                            </p>
                            {/* Hour labels */}
                            <div className="flex items-center gap-0 mb-1 ml-32">
                              {hours.map((h) => (
                                <div key={h} className="flex-1 text-center text-[9px] text-[#A19F9D]">
                                  {format(new Date(rangeStart.getTime() + h * 3600_000), 'h')}
                                </div>
                              ))}
                            </div>
                            {availabilityData.map((row) => (
                              <div key={row.attendee} className="flex items-center gap-0 mb-0.5">
                                <span className="w-32 flex-shrink-0 text-xs text-[#323130] truncate pr-1">
                                  {row.attendee.split('@')[0]}
                                </span>
                                {hours.map((h) => (
                                  <div
                                    key={h}
                                    title={`${row.attendee} – ${format(new Date(rangeStart.getTime() + h * 3600_000), 'h:mm a')}: ${isBusy(row, h) ? 'Busy' : 'Free'}`}
                                    className={cn(
                                      'flex-1 h-4 border border-white',
                                      isBusy(row, h) ? 'bg-[#D13438]' : 'bg-[#107C10]/30'
                                    )}
                                  />
                                ))}
                              </div>
                            ))}
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="flex items-center gap-1 text-[10px] text-[#605E5C]">
                                <span className="w-3 h-3 bg-[#107C10]/30 inline-block rounded-sm" /> Free
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-[#605E5C]">
                                <span className="w-3 h-3 bg-[#D13438] inline-block rounded-sm" /> Busy
                              </span>
                            </div>
                          </div>

                          {suggestedHours.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-[#323130] mb-1.5">Suggested times</p>
                              <div className="flex flex-wrap gap-2">
                                {suggestedHours.map((h) => {
                                  const slotStart = new Date(rangeStart.getTime() + h * 3600_000)
                                  const slotEnd = new Date(slotStart.getTime() + 3600_000)
                                  return (
                                    <button
                                      key={h}
                                      type="button"
                                      onClick={() => {
                                        setValue('start_time', formatDateTimeLocal(slotStart))
                                        setValue('end_time', formatDateTimeLocal(slotEnd))
                                      }}
                                      className="text-xs bg-[#EBF3FB] hover:bg-[#C7E0F4] text-[#0078D4] px-2 py-1 rounded transition-colors"
                                    >
                                      {format(slotStart, 'EEE h:mm a')} – {format(slotEnd, 'h:mm a')}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </>
                ) : (
                  <p className="text-xs text-[#605E5C]">Click &quot;Scheduling assistant&quot; to check availability.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#EDEBE9]">
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              loading={isSubmitting || saveMutation.isPending}
              aria-label="Save event"
            >
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              aria-label="Cancel"
            >
              Cancel
            </Button>
          </div>
          {event && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteClick}
              loading={deleteMutation.isPending}
              aria-label="Delete event"
            >
              Delete
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
