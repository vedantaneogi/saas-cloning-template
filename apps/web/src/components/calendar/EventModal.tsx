'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { events, calendars, contacts, categories as categoriesApi } from '@/lib/api'
import type { Event, Contact, EventAttendee as EventAttendeeT, Category } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { MapPin, Video, Users, Clock, RotateCcw, Check, HelpCircle, X as XIcon, CalendarSearch, Building2, Search, AlignLeft, ChevronDown, Calendar as CalendarIcon, Tag } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'
import { SchedulingAssistantView } from './SchedulingAssistantView'
import { FindATimePane } from './FindATimePane'
import { RoomFinderPopover } from './RoomFinderPopover'

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
  // Pre-fill the attendee chip list when opened from a context that already
  // knows participants (e.g. the Groups page seeds the group address here so
  // the event is identifiable as belonging to that group).
  initialAttendees?: { email: string; name: string }[]
  // Pre-fill the title field for new events (e.g. "Team A event" from groups).
  initialTitle?: string
}

function formatDateTimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function EventModal({ open, onClose, initialDate, event, initialAttendees, initialTitle }: EventModalProps) {
  const queryClient = useQueryClient()
  const [scopeDialog, setScopeDialog] = useState<{ action: 'save'; data: FormValues } | { action: 'delete' } | null>(null)

  const { data: calendarList = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendars.list(),
  })

  const defaultCalendar = calendarList.find((c) => c.is_default) ?? calendarList[0]

  const now = initialDate ?? new Date()
  const nowPlus1 = new Date(now.getTime() + 60 * 60 * 1000)

  // Seed-style recurrence_rule uses iCal day codes (MO/TU/...) and uppercase
  // frequency ("WEEKLY"). The form expects lowercase + integer day indices,
  // so without normalisation Zod fails silently → Save looks like a no-op.
  const ICAL_DAY_TO_INT: Record<string, number> = {
    SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
  }
  const existingDays: number[] = (() => {
    const raw = event?.recurrence_rule?.days_of_week as unknown
    if (!Array.isArray(raw)) return []
    return (raw as Array<number | string>).map((d) => {
      if (typeof d === 'number') return ((d % 7) + 7) % 7
      if (typeof d === 'string') {
        const code = d.toUpperCase().slice(0, 2)
        return ICAL_DAY_TO_INT[code] ?? 0
      }
      return 0
    })
  })()
  const FREQ_VALUES = new Set(['daily', 'weekly', 'monthly', 'yearly'])
  const normalizedFreq: 'daily' | 'weekly' | 'monthly' | 'yearly' = (() => {
    const raw = event?.recurrence_rule?.frequency
    if (!raw) return 'weekly'
    const lower = String(raw).toLowerCase()
    return (FREQ_VALUES.has(lower) ? lower : 'weekly') as 'daily' | 'weekly' | 'monthly' | 'yearly'
  })()

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
          repeat_frequency: normalizedFreq,
          repeat_interval: event.recurrence_rule?.interval ?? 1,
          repeat_end_type: event.recurrence_rule?.end_date ? 'date' : event.recurrence_rule?.count ? 'count' : 'never',
          repeat_end_date: event.recurrence_rule?.end_date ?? '',
          repeat_count: event.recurrence_rule?.count ?? 10,
          repeat_days_of_week: existingDays,
        }
      : {
          title: initialTitle ?? '',
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
  const watchedCalendarId = watch('calendar_id')

  // Backfill calendar_id once the calendars query resolves. The form is created
  // with calendar_id='' if the query hadn't returned yet — which makes Zod's
  // .min(1) validation silently fail on Save, so the modal looks frozen.
  useEffect(() => {
    if (!event && !watchedCalendarId && defaultCalendar?.id) {
      setValue('calendar_id', defaultCalendar.id, { shouldValidate: false })
    }
  }, [event, watchedCalendarId, defaultCalendar?.id, setValue])

  const currentUser = useAuthStore((s) => s.currentUser)
  const isOrganizer = !event || (currentUser?.id === event.user_id)
  const [invitedAttendees, setInvitedAttendees] = useState<{ email: string; name: string }[]>(
    initialAttendees ?? []
  )

  // Pull the full attendee list when editing — the list endpoint doesn't include them.
  // For recurring events the calendar list passes a virtual-occurrence id (uuid5) that
  // doesn't exist in the DB; fall back to the recurrence parent id so the lookup hits a
  // real row and returns its attendees.
  const detailId = event?.recurrence_parent_id ?? event?.id
  const { data: eventDetail } = useQuery({
    queryKey: ['event-detail', detailId],
    queryFn: () => events.get(detailId!),
    enabled: !!detailId,
  })

  const loadedAttendees: EventAttendeeT[] = eventDetail?.attendees ?? []

  // Seed the invitee chips from the loaded attendee rows once they arrive.
  // Skip the organizer row and the current user (they're not invitees of themselves).
  useEffect(() => {
    if (!event || !eventDetail) return
    const currentEmail = currentUser?.email?.toLowerCase()
    const invitees = (eventDetail.attendees || [])
      .filter((a) => !a.is_organizer && a.email.toLowerCase() !== currentEmail)
      .map((a) => ({ email: a.email, name: a.display_name ?? a.email }))
    setInvitedAttendees(invitees)
  }, [event, eventDetail, currentUser?.email])

  // Categorize section — full category list + applied IDs for this event.
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const categoryPickerRef = useRef<HTMLDivElement>(null)

  // Seed selectedCategoryIds whenever the event detail comes back.
  useEffect(() => {
    if (!eventDetail?.categories) return
    setSelectedCategoryIds(eventDetail.categories.map((c) => c.id))
  }, [eventDetail])

  // Outside-click for the picker.
  useEffect(() => {
    if (!categoryPickerOpen) return
    const onDoc = (e: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) {
        setCategoryPickerOpen(false)
        setCategorySearch('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [categoryPickerOpen])

  const selectedCategories: Category[] = allCategories.filter((c) => selectedCategoryIds.includes(c.id))
  const filteredCategories = allCategories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.trim().toLowerCase())
  )

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
      attendees: invitedAttendees.map((a) => ({
        email: a.email,
        display_name: a.name,
        is_organizer: false,
        is_required: true,
      })),
      category_ids: selectedCategoryIds,
    }
  }

  const saveMutation = useMutation({
    mutationFn: ({ data, scope }: { data: FormValues; scope?: 'single' | 'following' | 'series' }) => {
      const payload = buildPayload(data)
      if (event) {
        // Virtual occurrence ids aren't in the DB — use the parent for any scoped update.
        const targetId = event.recurrence_parent_id ?? event.id
        if (scope === 'single' || scope === 'following') {
          return events.update(targetId, payload, scope, event.start_time)
        }
        if (scope === 'series') {
          return events.update(targetId, payload, scope)
        }
        return events.update(event.id, payload, scope)
      }
      return events.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      // Refresh the attendee panel — proposed_new_time may have been cleared and
      // RSVP statuses bumped to "accepted" for anyone whose proposal was honored.
      queryClient.invalidateQueries({ queryKey: ['event-detail', event?.id] })
      queryClient.invalidateQueries({ queryKey: ['event-detail', event?.recurrence_parent_id] })
      // Inbox messages reference the event_id — make those refetch too so the
      // organizer's "Other attendees" status chips update.
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      setScopeDialog(null)
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (scope?: 'single' | 'following' | 'series') => {
      // Virtual occurrences carry a synthetic id but recurrence_parent_id points to the real parent row.
      // For any scoped delete on a recurring event, target the parent.
      const targetId = event!.recurrence_parent_id ?? event!.id
      if (scope === 'single' || scope === 'following') {
        return events.delete(targetId, scope, event!.start_time)
      }
      if (scope === 'series') {
        return events.delete(targetId, scope)
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
    mutationFn: (response: 'accepted' | 'tentative' | 'declined') => {
      // For recurring virtual occurrences event.id is a synthesized uuid5 that
      // doesn't exist in the DB — use the parent id so the RSVP lands on the row.
      const targetId = event?.recurrence_parent_id ?? event!.id
      return events.respond(targetId, response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event-detail', event?.recurrence_parent_id ?? event?.id] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const proposeMutation = useMutation({
    mutationFn: ({ start_time, end_time }: { start_time: string; end_time: string }) => {
      const targetId = event?.recurrence_parent_id ?? event!.id
      return events.proposeTime(targetId, start_time, end_time)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event-detail', event?.recurrence_parent_id ?? event?.id] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      setProposeOpen(false)
    },
  })

  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false)
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

  // Attendee rows include the organizer and any invitees with their RSVP status.
  // Use the loaded list (from /events/{id}) — the list endpoint doesn't include attendees.
  const attendees: EventAttendeeT[] = loadedAttendees.length > 0 ? loadedAttendees : (event?.attendees ?? [])
  // The current user's own attendee row — used to render the RSVP buttons when
  // viewing an event you've been invited to.
  const myAttendee = !isOrganizer
    ? attendees.find((a) => a.email.toLowerCase() === (currentUser?.email ?? '').toLowerCase())
    : undefined
  // Whom to show in the "Invitees" / "Other attendees" panel:
  //  - organizer view: everyone except the organizer (i.e. just the invitees)
  //  - attendee view:  everyone except yourself (so you see the organizer + co-invitees)
  const peoplePanel = isOrganizer
    ? attendees.filter((a) => !a.is_organizer)
    : attendees.filter((a) => a.email.toLowerCase() !== (currentUser?.email ?? '').toLowerCase())
  // Aggregate counts for the at-a-glance status line ("2 accepted · 1 declined …").
  const peopleStats = peoplePanel.reduce(
    (acc, a) => {
      if (a.is_organizer) return acc
      acc[a.response_status as 'accepted' | 'tentative' | 'declined' | 'none'] =
        (acc[a.response_status as 'accepted' | 'tentative' | 'declined' | 'none'] ?? 0) + 1
      return acc
    },
    { accepted: 0, tentative: 0, declined: 0, none: 0 } as Record<string, number>
  )
  // Proposed-time chips are only meaningful to the organizer (they decide).
  const proposals = attendees.filter((a) => !a.is_organizer && a.proposed_new_time)
  // Collapse long lists ("+ N more") — Outlook does this past the first few rows.
  const [peopleExpanded, setPeopleExpanded] = useState(false)
  const PEOPLE_PREVIEW_LIMIT = 3
  const visiblePeople = peopleExpanded ? peoplePanel : peoplePanel.slice(0, PEOPLE_PREVIEW_LIMIT)
  const hiddenCount = peoplePanel.length - visiblePeople.length

  // Attendees invite field
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState<Contact[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)

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

  // Room finder — popover anchored to the location input (focus opens,
  // outside click or selection closes). roomQuery / ROOMS / filteredRooms
  // remain declared for backwards compat with stragglers but the popover
  // itself now uses RoomFinderPopover with the shared mock dataset.
  const [roomFinderOpen, setRoomFinderOpen] = useState(false)
  const [roomQuery, setRoomQuery] = useState('')
  const locationWrapperRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!roomFinderOpen) return
    const handler = (e: MouseEvent) => {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(e.target as Node)) {
        setRoomFinderOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [roomFinderOpen])

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

  // Scheduling assistant — view switcher between the form and the
  // full-screen SA layout (per scheduleassistanttask.md spec).
  const [activeView, setActiveView] = useState<'event' | 'scheduling_assistant'>('event')
  const [findATimeOpen, setFindATimeOpen] = useState(true)
  const startVal = watch('start_time')
  const endVal = watch('end_time')
  // attendeeEmails feeds the Find-a-time pane and the SA availability fetch.
  // Earlier this was derived from `attendees` (the *loaded* RSVP list — empty
  // for new events), which silently ignored everyone the user had typed
  // into the autocomplete. Now we use `invitedAttendees` (the live list) +
  // the organizer themselves, so changing invitees actually re-fetches.
  const organizerEmail = (currentUser?.email ?? '').toLowerCase()
  const invitedEmails = invitedAttendees.map((a) => a.email).filter(Boolean)
  const attendeeEmails = (organizerEmail ? [organizerEmail, ...invitedEmails] : invitedEmails)
  const showNotificationToast = useUIStore((s) => s.showNotification)

  // Helper — push an "HH:MM" start (mock-day = May 8 2026) into the form's
  // start_time / end_time. Used by both the SA OK button and the Find-a-time
  // suggested cards. End is start + 30 minutes by default.
  const applyMockSlot = (startHHMM: string, durationMinutes = 30) => {
    const [h, m] = startHHMM.split(':').map(Number)
    // We anchor mock slots to the *event's existing date* (so picking a
    // suggested time on Tue updates Tue, not the spec's hard-coded May 8).
    const base = startVal ? new Date(startVal) : new Date()
    base.setHours(h, m, 0, 0)
    const end = new Date(base.getTime() + durationMinutes * 60_000)
    setValue('start_time', formatDateTimeLocal(base))
    setValue('end_time', formatDateTimeLocal(end))
  }

  // Selected suggested-slot start (HH:MM). Only meaningful when the user
  // has explicitly picked a card; otherwise the recommended one is auto-
  // highlighted by FindATimePane.
  const [selectedSuggestedStart, setSelectedSuggestedStart] = useState<string | null>(null)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit event' : 'New event'}
      size="2xl"
    >
      {/* Outlook-style toolbar ribbon */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#EDEBE9] bg-[#FAF9F8] flex-shrink-0">
        {isOrganizer && (
          <button
            type="button"
            onClick={handleSubmit(handleSaveClick)}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
          >
            <Check size={12} /> Save
          </button>
        )}
        <div className="flex items-center border border-[#EDEBE9] rounded overflow-hidden">
          <button type="button" className="text-xs px-2.5 py-1 bg-white text-[#323130] border-r border-[#EDEBE9] font-medium">
            Event
          </button>
          <button type="button" onClick={() => setValue('repeat', !repeat)} className={cn('text-xs px-2.5 py-1', repeat ? 'bg-[#EBF3FB] text-[#0078D4]' : 'bg-white text-[#605E5C]')}>
            Series
          </button>
        </div>
        {/* Scheduling assistant view-switcher — toggles the modal body
            between the event form and the dedicated SA grid view. */}
        <button
          type="button"
          onClick={() => setActiveView('scheduling_assistant')}
          aria-label="Scheduling assistant"
          aria-pressed={activeView === 'scheduling_assistant'}
          className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors',
            activeView === 'scheduling_assistant'
              ? 'border-[#0078D4] text-[#0078D4] bg-[#EBF3FB]'
              : 'border-[#EDEBE9] text-[#605E5C] hover:bg-[#F3F2F1]',
          )}
        >
          <CalendarSearch size={12} /> Scheduling assistant
        </button>
        <select
          className="text-xs border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] bg-white focus:outline-none"
          defaultValue="busy"
        >
          <option value="busy">Busy</option>
          <option value="free">Free</option>
          <option value="tentative">Tentative</option>
          <option value="out_of_office">Out of office</option>
        </select>
        <select
          aria-label="Reminder"
          className="text-xs border border-[#EDEBE9] rounded px-2 py-1 text-[#323130] bg-white focus:outline-none"
          {...register('reminder_minutes', { valueAsNumber: true })}
        >
          <option value={0}>No reminder</option>
          <option value={5}>5 min</option>
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={60}>1 hour</option>
          <option value={1440}>1 day</option>
        </select>
        <div className="ml-auto flex items-center gap-1">
          {event && isOrganizer && (
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={deleteMutation.isPending}
              className="text-xs text-[#D13438] hover:bg-[#FDE7E9] px-2 py-1 rounded transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

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
                  if (scopeDialog.action === 'delete') deleteMutation.mutate('single')
                  else saveMutation.mutate({ data: scopeDialog.data, scope: 'single' })
                }}
                className="text-left px-3 py-2 text-sm rounded border border-[#EDEBE9] hover:bg-[#F3F2F1] text-[#323130] transition-colors"
              >
                This event
              </button>
              <button
                aria-label="This and all following events"
                onClick={() => {
                  if (scopeDialog.action === 'delete') deleteMutation.mutate('following')
                  else saveMutation.mutate({ data: scopeDialog.data, scope: 'following' })
                }}
                className="text-left px-3 py-2 text-sm rounded border border-[#EDEBE9] hover:bg-[#F3F2F1] text-[#323130] transition-colors"
              >
                This and all following events
              </button>
              <button
                aria-label="All events in the series"
                onClick={() => {
                  if (scopeDialog.action === 'delete') deleteMutation.mutate('series')
                  else saveMutation.mutate({ data: scopeDialog.data, scope: 'series' })
                }}
                className="text-left px-3 py-2 text-sm rounded border border-[#EDEBE9] hover:bg-[#F3F2F1] text-[#323130] transition-colors"
              >
                All events in the series
              </button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setScopeDialog(null)} aria-label="Cancel">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Attendee status summary (organizer + attendees both see this) + organizer-only proposals */}
      {event && peoplePanel.length > 0 && (
        <div className="px-4 pt-3 pb-2 border-b border-[#EDEBE9] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[#605E5C]">
              {isOrganizer ? `Invitees (${peoplePanel.length})` : `Other attendees (${peoplePanel.length})`}
            </p>
            {/* Aggregate counts — shown when there's at least one non-organizer invitee */}
            {(peopleStats.accepted + peopleStats.tentative + peopleStats.declined + peopleStats.none) > 0 && (
              <p className="text-[11px] text-[#605E5C]">
                <span className="text-[#107C10]">{peopleStats.accepted} accepted</span>
                <span className="mx-1.5 text-[#A19F9D]">·</span>
                <span className="text-[#8A6116]">{peopleStats.tentative} tentative</span>
                <span className="mx-1.5 text-[#A19F9D]">·</span>
                <span className="text-[#A4262C]">{peopleStats.declined} declined</span>
                <span className="mx-1.5 text-[#A19F9D]">·</span>
                <span>{peopleStats.none} pending</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visiblePeople.map((a) => {
              const statusColor =
                a.response_status === 'accepted' ? 'bg-[#107C10] text-white border-[#107C10]'
                : a.response_status === 'tentative' ? 'bg-[#FFB900] text-white border-[#FFB900]'
                : a.response_status === 'declined' ? 'bg-[#D13438] text-white border-[#D13438]'
                : 'bg-white text-[#605E5C] border-[#D2D0CE]'
              return (
                <span
                  key={a.id}
                  className={cn('text-xs px-2 py-0.5 rounded border', statusColor)}
                  title={`${a.email}${a.is_organizer ? ' (organizer)' : ''}: ${a.response_status}`}
                >
                  {a.display_name || a.email}
                  {a.is_organizer ? (
                    <span className="ml-1 opacity-80">· organizer</span>
                  ) : (
                    <span className="ml-1 opacity-80">
                      · {a.response_status === 'accepted' ? 'accepted'
                          : a.response_status === 'tentative' ? 'tentative'
                          : a.response_status === 'declined' ? 'declined'
                          : 'pending'}
                    </span>
                  )}
                </span>
              )
            })}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setPeopleExpanded(true)}
                aria-label={`Show ${hiddenCount} more attendees`}
                className="text-xs px-2 py-0.5 rounded border border-dashed border-[#0078D4] text-[#0078D4] hover:bg-[#EBF3FB] transition-colors"
              >
                + {hiddenCount} more
              </button>
            )}
            {peopleExpanded && peoplePanel.length > PEOPLE_PREVIEW_LIMIT && (
              <button
                type="button"
                onClick={() => setPeopleExpanded(false)}
                aria-label="Collapse attendee list"
                className="text-xs px-2 py-0.5 rounded border border-dashed border-[#605E5C] text-[#605E5C] hover:bg-[#F3F2F1] transition-colors"
              >
                Show less
              </button>
            )}
          </div>
          {/* Attendee's own proposal — read-only summary so they remember they proposed
              and can see when. Only render when the current user has a pending proposal. */}
          {!isOrganizer && myAttendee?.proposed_new_time && (
            <div className="bg-[#FFF4CE] border border-[#F4D58A] rounded p-2">
              <p className="text-xs text-[#8A6116] flex items-center gap-1">
                <Clock size={11} />
                <span>
                  You proposed{' '}
                  <strong>
                    {format(new Date(myAttendee.proposed_new_time.start_time), 'EEE MMM d, h:mm a')}
                    {' '}–{' '}
                    {format(new Date(myAttendee.proposed_new_time.end_time), 'h:mm a')}
                  </strong>
                  . Awaiting organizer.
                </span>
              </p>
            </div>
          )}
          {isOrganizer && proposals.length > 0 && (
            <div className="bg-[#FFF4CE] border border-[#F4D58A] rounded p-2 space-y-1">
              <p className="text-xs font-semibold text-[#8A6116] flex items-center gap-1">
                <Clock size={11} /> New time proposals
              </p>
              {proposals.map((a) => {
                const proposed = a.proposed_new_time!
                const ps = new Date(proposed.start_time)
                const pe = new Date(proposed.end_time)
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="text-[#323130]">
                      <strong>{a.display_name || a.email}</strong> proposed{' '}
                      {format(ps, 'EEE MMM d, h:mm a')} – {format(pe, 'h:mm a')}
                    </div>
                    <button
                      type="button"
                      aria-label={`Use proposed time from ${a.display_name || a.email}`}
                      onClick={() => {
                        setValue('start_time', formatDateTimeLocal(ps))
                        setValue('end_time', formatDateTimeLocal(pe))
                      }}
                      className="text-xs bg-white border border-[#D2D0CE] hover:bg-[#F3F2F1] px-2 py-0.5 rounded transition-colors"
                    >
                      Use this time
                    </button>
                  </div>
                )
              })}
            </div>
          )}
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

      {/* Scheduling Assistant view — replaces the form body when active.
          OK confirms the chosen "HH:MM" slot back into the form's start /
          end times. Cancel just flips back to the event form. */}
      {activeView === 'scheduling_assistant' ? (
        <SchedulingAssistantView
          initialStart={
            (() => {
              if (!startVal) return '15:00'
              const d = new Date(startVal)
              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
            })()
          }
          initialDurationMinutes={(() => {
            if (!startVal || !endVal) return 30
            return Math.max(15, Math.round((new Date(endVal).getTime() - new Date(startVal).getTime()) / 60_000))
          })()}
          initialDate={startVal ? new Date(startVal) : undefined}
          invitedAttendees={invitedAttendees}
          organizer={currentUser ? { email: currentUser.email, name: currentUser.display_name ?? currentUser.email } : undefined}
          onAddInvitee={(email, name) => {
            if (invitedAttendees.find((a) => a.email === email)) return
            setInvitedAttendees((prev) => [...prev, { email, name: name?.trim() || email }])
          }}
          onRemoveInvitee={removeInvitee}
          onConfirm={(date, start, dur) => {
            // Push the SA-chosen date into both start_time and end_time so
            // changing the SA day actually moves the event off May 8.
            const [h, m] = start.split(':').map(Number)
            const startDate = new Date(date)
            startDate.setHours(h, m, 0, 0)
            const endDate = new Date(startDate.getTime() + dur * 60_000)
            setValue('start_time', formatDateTimeLocal(startDate))
            setValue('end_time', formatDateTimeLocal(endDate))
            setActiveView('event')
          }}
          onCancel={() => setActiveView('event')}
        />
      ) : (
      <div className="flex flex-1 overflow-hidden">
      <form
        onSubmit={handleSubmit(handleSaveClick)}
        className="flex-1 p-4 space-y-3 overflow-y-auto outlook-scrollbar"
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

        {/* Attendees — only the organizer can edit the invite list. Attendees see the
            "Other attendees" status panel above instead. */}
        {isOrganizer && (
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
        )}

        {/* Calendar — custom dropdown with color dots */}
        <div className="flex items-center gap-3">
          <span className="w-5 text-[#605E5C]">
            <CalendarIcon size={16} />
          </span>
          <div className="relative flex-1">
            {(() => {
              const selectedCal = calendarList.find((c) => c.id === watch('calendar_id'))
              return (
                <>
                  <button
                    type="button"
                    onClick={() => setCalendarDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 text-sm text-[#323130] border-0 border-b border-[#8A8886] bg-transparent px-0 py-1 w-full text-left focus:outline-none focus:border-b-2 focus:border-[#0078D4] cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCal?.color ?? '#0078D4' }} />
                    <span className="flex-1 truncate">
                      {selectedCal?.name ?? 'Calendar'} ({currentUser?.email ?? ''})
                    </span>
                    <ChevronDown size={12} className="text-[#605E5C] flex-shrink-0" />
                  </button>
                  {calendarDropdownOpen && (
                    <div className="absolute left-0 top-full mt-0.5 z-50 w-full min-w-[240px] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg animate-fade-in">
                      {/* Account email header */}
                      <div className="px-3 py-2 border-b border-[#EDEBE9]">
                        <p className="text-xs text-[#605E5C]">{currentUser?.email ?? ''}</p>
                      </div>
                      {/* Calendar list */}
                      <div className="py-1">
                        {calendarList.map((cal) => {
                          const isSelected = watch('calendar_id') === cal.id
                          return (
                            <button
                              key={cal.id}
                              type="button"
                              onClick={() => {
                                setValue('calendar_id', cal.id)
                                setCalendarDropdownOpen(false)
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F3F2F1] transition-colors text-left"
                            >
                              {isSelected ? (
                                <Check size={14} className="text-[#323130] flex-shrink-0" />
                              ) : (
                                <span className="w-[14px] flex-shrink-0" />
                              )}
                              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                              <span className="text-sm text-[#323130]">{cal.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
            {/* Hidden input to keep react-hook-form value */}
            <input type="hidden" {...register('calendar_id')} />
          </div>
        </div>

        {/* Time — Outlook style */}
        <div className="flex items-start gap-3">
          <span className="w-5 text-[#605E5C] pt-1.5">
            <Clock size={16} />
          </span>
          <div className="flex-1 space-y-2">
            {/* Readable time summary */}
            {startVal && endVal && (
              <p className="text-sm text-[#323130]">
                {(() => {
                  try {
                    const s = new Date(startVal)
                    const e = new Date(endVal)
                    if (allDay) {
                      return `${s.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' })}`
                    }
                    return `${s.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' })} ${s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                  } catch { return '' }
                })()}
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                type={allDay ? 'date' : 'datetime-local'}
                aria-label="Start time"
                className="text-sm border-0 border-b border-[#8A8886] px-0 py-1 focus:outline-none focus:border-b-2 focus:border-[#0078D4] text-[#323130] bg-transparent"
                {...register('start_time')}
              />
              <span className="text-[#605E5C] text-sm">-</span>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                aria-label="End time"
                className="text-sm border-0 border-b border-[#8A8886] px-0 py-1 focus:outline-none focus:border-b-2 focus:border-[#0078D4] text-[#323130] bg-transparent"
                {...register('end_time')}
              />
              <label className="flex items-center gap-1.5 text-sm text-[#605E5C] ml-2">
                <input
                  type="checkbox"
                  aria-label="All day event"
                  className="rounded border-[#8A8886]"
                  {...register('all_day')}
                />
                All day
              </label>
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

        {/* Location — underline style matching Outlook */}
        <div className="flex items-center gap-3">
          <span className="w-5 text-[#605E5C]">
            <MapPin size={16} />
          </span>
          <div ref={locationWrapperRef} className="flex-1 relative">
            <input
              type="text"
              placeholder="Search for a location"
              aria-label="Location"
              onFocus={() => setRoomFinderOpen(true)}
              className="w-full text-sm border-0 border-b border-[#8A8886] px-0 py-1.5 focus:outline-none focus:border-b-2 focus:border-[#0078D4] text-[#323130] bg-transparent placeholder:text-[#A19F9D]"
              {...register('location')}
            />
            <MapPin size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#A19F9D]" />
            {/* Suggested-rooms popover anchored below the location input
                (Outlook focus-to-open). Available rooms fill the field;
                busy rooms emit a toast and stay unselected. */}
            {roomFinderOpen && (
              <RoomFinderPopover
                query={watch('location') ?? ''}
                onSelect={(room) => {
                  setValue('location', room.name)
                  setRoomFinderOpen(false)
                }}
                onBusy={(room) =>
                  showNotificationToast(`${room.name} is busy at the selected time.`)
                }
              />
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

        {/* Reminder moved to toolbar ribbon */}

        {/* Categorize — pick / create category tags applied to this event */}
        {isOrganizer && (
        <div className="flex items-start gap-3" ref={categoryPickerRef}>
          <span className="w-5 text-[#605E5C] pt-1.5">
            <Tag size={16} />
          </span>
          <div className="flex-1 relative">
            <div
              className={cn(
                'flex flex-wrap items-center gap-1.5 min-h-[34px] border rounded px-2 py-1 cursor-text bg-white transition-colors',
                categoryPickerOpen ? 'border-[#0078D4]' : 'border-[#EDEBE9] hover:border-[#8A8886]'
              )}
              onClick={() => setCategoryPickerOpen(true)}
            >
              {selectedCategories.length === 0 ? (
                <span className="text-sm text-[#A19F9D]">Add categories</span>
              ) : (
                selectedCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${cat.color}1F`, color: cat.color }}
                  >
                    <Tag size={11} style={{ color: cat.color }} />
                    {cat.name}
                    <button
                      type="button"
                      aria-label={`Remove ${cat.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCategoryIds((prev) => prev.filter((id) => id !== cat.id))
                      }}
                      className="hover:opacity-70"
                    >
                      <XIcon size={10} />
                    </button>
                  </span>
                ))
              )}
            </div>
            {categoryPickerOpen && (
              <div className="absolute left-0 top-full mt-0.5 z-50 w-72 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 max-h-64 overflow-y-auto">
                <div className="px-2 py-1.5 border-b border-[#EDEBE9]">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-[#F3F2F1] rounded">
                    <Search size={11} className="text-[#605E5C] flex-shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search for a category"
                      aria-label="Search categories"
                      className="flex-1 text-xs bg-transparent focus:outline-none text-[#323130] placeholder:text-[#A19F9D]"
                    />
                  </div>
                </div>
                {filteredCategories.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[#A19F9D]">No categories match.</p>
                ) : (
                  filteredCategories.map((cat) => {
                    const active = selectedCategoryIds.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryIds((prev) =>
                            prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                          )
                        }}
                        className="flex items-center gap-2 w-full text-sm text-[#323130] px-3 py-1.5 hover:bg-[#F3F2F1]"
                      >
                        <Tag size={14} className="flex-shrink-0" style={{ color: cat.color }} />
                        <span className="flex-1 text-left truncate">{cat.name}</span>
                        {active && <span className="text-[#0078D4] text-xs font-bold">✓</span>}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Description — Outlook-style rich text editor with image insert (paste/embed). */}
        <div className="flex items-start gap-3">
          <span className="w-5 text-[#605E5C] pt-1.5">
            <AlignLeft size={16} />
          </span>
          <div className="flex-1">
            <RichTextEditor
              content={watch('description') ?? ''}
              onChange={(html) => setValue('description', html, { shouldDirty: true })}
              placeholder="Add a description or attach documents"
              minHeight="140px"
            />
            {/* Hidden input keeps the value flowing through react-hook-form so it
                lands in buildPayload alongside the rest of the event fields. */}
            <input type="hidden" {...register('description')} />
          </div>
        </div>

        {/* Actions moved to toolbar ribbon above */}
      </form>

      {/* Find a time — right-rail with suggested 30-min slots; shown when
          the user has added at least one attendee. Closing it falls back
          to the existing mini-day sidebar. */}
      {findATimeOpen && attendeeEmails.length > 0 && (
        <FindATimePane
          selectedSlotStart={selectedSuggestedStart}
          attendeeEmails={attendeeEmails}
          date={startVal ? new Date(startVal) : new Date()}
          onSelectSlot={(start) => {
            setSelectedSuggestedStart(start)
            applyMockSlot(start, 30)
          }}
          onClose={() => setFindATimeOpen(false)}
        />
      )}

      {/* Mini day view sidebar — matches Outlook event modal */}
      <div className="w-56 flex-shrink-0 border-l border-[#EDEBE9] bg-white overflow-y-auto outlook-scrollbar hidden lg:block">
        <div className="px-3 py-2 border-b border-[#EDEBE9]">
          <p className="text-xs font-medium text-[#605E5C]">
            {startVal ? format(new Date(startVal), 'EEE, MMM d, yyyy') : format(new Date(), 'EEE, MMM d, yyyy')}
          </p>
        </div>
        <div className="relative">
          {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => {
            const eventStart = startVal ? new Date(startVal) : null
            const eventEnd = endVal ? new Date(endVal) : null
            const isInEvent = eventStart && eventEnd &&
              hour >= eventStart.getHours() && hour < eventEnd.getHours() + (eventEnd.getMinutes() > 0 ? 1 : 0)

            return (
              <div key={hour} className="flex border-b border-[#F3F2F1]" style={{ height: 32 }}>
                <span className="w-12 text-[10px] text-[#A19F9D] text-right pr-2 pt-0.5 flex-shrink-0">
                  {hour <= 12 ? `${hour} ${hour < 12 ? 'AM' : 'PM'}` : `${hour - 12} PM`}
                </span>
                <div className="flex-1 relative">
                  {isInEvent && (
                    <div
                      className="absolute inset-0 bg-[#0078D4] rounded-sm mx-0.5"
                      style={{
                        top: eventStart && hour === eventStart.getHours() ? `${(eventStart.getMinutes() / 60) * 100}%` : 0,
                        bottom: eventEnd && hour === (eventEnd.getHours() - (eventEnd.getMinutes() === 0 ? 1 : 0))
                          ? `${((60 - eventEnd.getMinutes()) / 60) * 100}%` : 0,
                      }}
                    >
                      {hour === (eventStart?.getHours() ?? 0) && (
                        <span className="text-[9px] text-white px-1 truncate block leading-tight pt-0.5">
                          {watch('title') || 'New event'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      </div>
      )}
    </Modal>
  )
}
