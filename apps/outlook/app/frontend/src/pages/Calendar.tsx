
import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from '@/lib/next-compat'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { events, calendars } from '@/lib/api'
import type { Event } from '@/lib/api'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar'
import { DateNavigator } from '@/components/calendar/DateNavigator'
import { EventModal } from '@/components/calendar/EventModal'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'

type CalendarView = 'day' | 'week' | 'work-week' | 'month'

const VALID_VIEWS: CalendarView[] = ['day', 'week', 'work-week', 'month']

export function Calendar() {
  const params = useParams()
  const rawView = (params?.view as string[] | undefined)?.[0] ?? 'month'
  const view: CalendarView = VALID_VIEWS.includes(rawView as CalendarView)
    ? (rawView as CalendarView)
    : 'month'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | undefined>()
  const [initialDate, setInitialDate] = useState<Date | undefined>()
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  // Listen for "New event" from ribbon toolbar
  useEffect(() => {
    const handler = () => {
      setInitialDate(new Date())
      setEditingEvent(undefined)
      setEventModalOpen(true)
    }
    window.addEventListener('outlook:new-event', handler)
    return () => window.removeEventListener('outlook:new-event', handler)
  }, [])

  // Listen for ribbon "Share" button
  useEffect(() => {
    const handler = () => setShareDialogOpen(true)
    window.addEventListener('outlook:share-calendar', handler)
    return () => window.removeEventListener('outlook:share-calendar', handler)
  }, [])

  // Cross-page entry point: navigating with `?new=1` (e.g. from Groups page)
  // pops the New Event modal once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('new') === '1') {
      setInitialDate(new Date())
      setEditingEvent(undefined)
      setEventModalOpen(true)
      // Strip the query param so a refresh doesn't reopen the modal.
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Calculate date range for events query
  // Month view widens to startOfWeek(startOfMonth) → endOfWeek(endOfMonth)
  // so events on leading/trailing days the grid paints are included.
  const getDateRange = () => {
    if (view === 'month') {
      return {
        start: format(startOfWeek(startOfMonth(currentDate)), "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(endOfWeek(endOfMonth(currentDate)), "yyyy-MM-dd'T'HH:mm:ss"),
      }
    }
    if (view === 'week' || view === 'work-week') {
      return {
        start: format(startOfWeek(currentDate), "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(endOfWeek(currentDate), "yyyy-MM-dd'T'HH:mm:ss"),
      }
    }
    return {
      start: format(currentDate, "yyyy-MM-dd'T'00:00:00"),
      end: format(currentDate, "yyyy-MM-dd'T'23:59:59"),
    }
  }

  const { start, end } = getDateRange()

  const { data: calendarList = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendars.list(),
  })

  const { data: eventList = [] } = useQuery({
    queryKey: ['events', view, start, end],
    queryFn: () => events.list({ start, end }),
  })

  // Apply ribbon Filter: all / mine / invites / no-allday + category multiselect
  // + per-calendar visibility (unchecking a calendar in the sidebar hides its
  // events). Visibility lives on the Calendar row itself.
  const calendarFilter = useUIStore((s) => s.calendarFilter)
  const calendarCategoryFilter = useUIStore((s) => s.calendarCategoryFilter)
  const currentUserEmail = useAuthStore((s) => s.currentUser?.email)?.toLowerCase()
  const filteredEvents = useMemo(() => {
    let list = eventList

    // Hide events whose calendar is currently unchecked in the sidebar.
    const hiddenCalendarIds = new Set(
      calendarList.filter((c) => !c.is_visible).map((c) => c.id)
    )
    if (hiddenCalendarIds.size > 0) {
      list = list.filter((e) => !hiddenCalendarIds.has(e.calendar_id))
    }

    if (calendarCategoryFilter.length > 0) {
      const wanted = new Set(calendarCategoryFilter)
      list = list.filter((e) =>
        e.categories?.some((c) => wanted.has(c.id))
      )
    }
    if (calendarFilter === 'all') return list
    if (calendarFilter === 'no-allday') return list.filter((e) => !e.all_day)
    const isInvite = (e: Event) => {
      const organizer = e.attendees?.find((a) => a.is_organizer)
      if (!organizer) return false
      return !!currentUserEmail && organizer.email.toLowerCase() !== currentUserEmail
    }
    if (calendarFilter === 'invites') return list.filter(isInvite)
    if (calendarFilter === 'mine') return list.filter((e) => !isInvite(e))
    return list
  }, [eventList, calendarFilter, currentUserEmail, calendarCategoryFilter, calendarList])

  const handleSlotClick = (date: Date) => {
    setInitialDate(date)
    setEditingEvent(undefined)
    setEventModalOpen(true)
  }

  const handleEventClick = (event: Event) => {
    setEditingEvent(event)
    setInitialDate(undefined)
    setEventModalOpen(true)
  }

  const router = useRouter()
  // Click anywhere in a month-view day cell — open new event modal at that date.
  // Outlook opens compose; previously this jumped to Day view, which was wrong.
  const handleDayClick = (date: Date) => {
    setInitialDate(date)
    setEditingEvent(undefined)
    setEventModalOpen(true)
  }
  // Click on the day number / "+N more" — navigate to that day's Day view.
  const handleDayNavigate = (date: Date) => {
    setCurrentDate(date)
    router.push('/calendar/day')
  }

  return (
    <div data-testid="calendar-page" className="h-full flex overflow-hidden" aria-label="CalendarModule" data-automation-id="CalendarModule">
      {/* Left sidebar */}
      <CalendarSidebar selectedDate={currentDate} onDateSelect={setCurrentDate} />

      {/* Main calendar area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        {/* Date navigation bar — matches Outlook: Today + arrows + date range */}
        <div
          className="flex items-center px-4 py-2 border-b border-[#EDEBE9] bg-white flex-shrink-0"
          aria-label="CalendarSurfaceNavigationToolbar"
        >
          <DateNavigator
            currentDate={currentDate}
            view={view}
            onDateChange={setCurrentDate}
          />
        </div>

        {/* Calendar grid */}
        <div
          className="flex-1 overflow-hidden flex flex-col"
          data-automation-id="CalendarModuleSurface"
        >
          <CalendarGrid
            view={view}
            currentDate={currentDate}
            events={filteredEvents}
            calendars={calendarList}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
            onDayClick={handleDayClick}
            onDayNavigate={handleDayNavigate}
          />
        </div>
      </div>

      {/* Event modal — keyed so the form resets between openings (react-hook-form
          only seeds defaultValues on mount). */}
      <EventModal
        key={editingEvent?.id ?? `new-${initialDate?.toISOString() ?? ''}`}
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        initialDate={initialDate}
        event={editingEvent}
      />

      <ShareCalendarDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
      />
    </div>
  )
}

// ─── Share calendar dialog ────────────────────────────────────────────────────
// Toggles the publish_token on the user's default calendar and shows the
// public URL the user can hand out. Scope picks free/busy vs full detail.
function ShareCalendarDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: calendarList = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => calendars.list(),
    enabled: open,
  })
  const showNotification = useUIStore((s) => s.showNotification)
  const defaultCal = calendarList.find((c) => c.is_default) ?? calendarList[0]
  const [scope, setScope] = useState<'free_busy' | 'full'>(defaultCal?.publish_scope ?? 'free_busy')
  const [token, setToken] = useState<string | null>(defaultCal?.publish_token ?? null)
  const [copied, setCopied] = useState(false)

  // Re-sync when the dialog opens or the default cal changes.
  useEffect(() => {
    if (defaultCal) {
      setScope(defaultCal.publish_scope)
      setToken(defaultCal.publish_token)
    }
  }, [defaultCal?.id, defaultCal?.publish_scope, defaultCal?.publish_token])

  const togglePublish = async (enable: boolean) => {
    if (!defaultCal) return
    try {
      const r = await calendars.publish(defaultCal.id, enable, scope)
      setToken(r.publish_token)
      setScope(r.publish_scope)
      showNotification(enable ? 'Calendar published' : 'Public link removed')
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Could not update publish state')
    }
  }

  const updateScope = async (next: 'free_busy' | 'full') => {
    setScope(next)
    if (!defaultCal || !token) return
    try {
      const r = await calendars.publish(defaultCal.id, true, next)
      setScope(r.publish_scope)
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Could not update scope')
    }
  }

  // Public link points at the rendered Next.js page (which fetches the API
  // and renders a month grid). Recipients see a real calendar, not raw JSON.
  const publicUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/calendar/public/${token}`
    : null

  const copyUrl = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      showNotification('Could not copy URL')
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share calendar"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative bg-white rounded shadow-outlook-lg w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9]">
          <h2 className="text-base font-semibold text-[#323130]">Share calendar</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <p className="text-xs text-[#605E5C]">
            Publish a read-only public link that lets anyone with the URL view
            your <strong>{defaultCal?.name ?? 'calendar'}</strong>.
          </p>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!token}
              onChange={(e) => togglePublish(e.target.checked)}
              className="mt-0.5 accent-[#0078D4]"
            />
            <span className="text-sm text-[#323130]">
              Publish my calendar
              <span className="block text-[11px] text-[#605E5C]">
                {token ? 'Anyone with the link can view' : 'Off — no public access'}
              </span>
            </span>
          </label>

          {token && (
            <>
              <div>
                <p className="text-xs font-medium text-[#605E5C] mb-1">What can people see?</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['free_busy', 'Free / busy', 'Times only — titles, locations, and notes are hidden.'],
                    ['full', 'Full detail', 'Title, time, location, and notes for every event.'],
                  ] as const).map(([val, label, hint]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => updateScope(val)}
                      className={`border rounded px-3 py-2 text-left transition-colors ${
                        scope === val
                          ? 'border-[#0078D4] bg-[#EFF6FC]'
                          : 'border-[#EDEBE9] hover:bg-[#F3F2F1]'
                      }`}
                    >
                      <p className="text-sm font-medium text-[#323130]">{label}</p>
                      <p className="text-[11px] text-[#605E5C] mt-0.5">{hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#605E5C] mb-1">Public link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl ?? ''}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 text-xs border border-[#8A8886] rounded px-2 py-1.5 bg-[#FAF9F8] text-[#323130]"
                  />
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="text-xs bg-[#0078D4] hover:bg-[#106EBE] text-white px-3 py-1.5 rounded"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#EDEBE9]">
          <button
            type="button"
            onClick={onClose}
            className="text-sm border border-[#8A8886] text-[#323130] px-4 py-1.5 rounded hover:bg-[#F3F2F1]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
