'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { events, calendars } from '@/lib/api'
import type { Event } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MapPin, Video, Users, Clock, RotateCcw, Check, HelpCircle, X as XIcon } from 'lucide-react'
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
    mutationFn: (scope?: 'single' | 'series') => events.delete(event!.id, scope),
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

        {/* Online meeting */}
        <div className="flex items-center gap-3">
          <span className="w-5 text-[#605E5C]">
            <Video size={16} />
          </span>
          <label className="flex items-center gap-2 text-sm text-[#323130]">
            <input
              type="checkbox"
              aria-label="Online meeting"
              className="rounded border-[#D2D0CE]"
              {...register('is_online_meeting')}
            />
            Add online meeting
          </label>
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
            <Users size={16} />
          </span>
          <textarea
            placeholder="Add a description"
            aria-label="Description"
            rows={3}
            className="flex-1 text-sm border border-[#EDEBE9] rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0078D4] text-[#323130] placeholder:text-[#A19F9D] resize-none"
            {...register('description')}
          />
        </div>

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
