const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    // On 401, clear stale auth and redirect to sign-in
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth-storage')
      window.location.href = '/sign-in'
      throw new Error('Session expired')
    }
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body?.detail ?? body?.message ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  world_id: string
  email: string
  display_name: string
  avatar_url: string | null
  timezone: string
  locale: string
  role: 'worker' | 'manager' | 'admin'
  is_active: boolean
  out_of_office_enabled: boolean
  out_of_office_start: string | null
  out_of_office_end: string | null
  out_of_office_message_internal: string | null
  out_of_office_message_external: string | null
  created_at: string
  updated_at: string
}

export interface Folder {
  id: string
  user_id: string
  name: string
  slug: string
  parent_id: string | null
  is_system: boolean
  icon: string | null
  sort_order: number
  unread_count: number
  total_count: number
  created_at: string
  updated_at: string
}

export interface EmailAddress {
  email: string
  name?: string
}

export interface Message {
  id: string
  user_id: string
  conversation_id: string | null
  folder_id: string
  from_address: string
  from_name: string | null
  to_addresses: EmailAddress[]
  cc_addresses: EmailAddress[]
  bcc_addresses: EmailAddress[]
  subject: string
  body_text: string | null
  body_html: string | null
  is_read: boolean
  is_flagged: boolean
  is_pinned: boolean
  is_draft: boolean
  importance: 'low' | 'normal' | 'high'
  sensitivity: 'normal' | 'personal' | 'private' | 'confidential'
  has_attachments: boolean
  in_reply_to_id: string | null
  reply_type: 'none' | 'reply' | 'reply_all' | 'forward'
  snooze_until: string | null
  scheduled_send_at: string | null
  sent_at: string | null
  received_at: string | null
  created_at: string
  updated_at: string
  attachments?: Attachment[]
  categories?: Category[]
}

export interface Attachment {
  id: string
  message_id: string
  filename: string
  content_type: string
  size_bytes: number
  storage_path: string | null
  is_inline: boolean
  created_at: string
}

export interface Contact {
  id: string
  user_id: string
  world_id: string | null
  first_name: string
  last_name: string | null
  display_name: string
  email: string
  phone: string | null
  company: string | null
  job_title: string | null
  address: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  } | null
  notes: string | null
  avatar_url: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface Calendar {
  id: string
  user_id: string
  name: string
  color: string
  is_default: boolean
  is_shared: boolean
  shared_by_user_id: string | null
  permission_level: 'none' | 'free_busy' | 'read' | 'write' | 'delegate'
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  end_date?: string
  count?: number
  days_of_week?: number[]
}

export interface Event {
  id: string
  calendar_id: string
  user_id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  all_day: boolean
  is_recurring: boolean
  recurrence_rule: RecurrenceRule | null
  recurrence_parent_id: string | null
  reminder_minutes: number
  is_online_meeting: boolean
  meeting_url: string | null
  status: 'free' | 'tentative' | 'busy' | 'out_of_office' | 'working_elsewhere'
  sensitivity: 'normal' | 'personal' | 'private' | 'confidential'
  created_at: string
  updated_at: string
  attendees?: EventAttendee[]
  categories?: Category[]
}

export interface EventAttendee {
  id: string
  event_id: string
  email: string
  display_name: string | null
  response_status: 'none' | 'accepted' | 'tentative' | 'declined'
  is_organizer: boolean
  is_required: boolean
  proposed_new_time: { start_time: string; end_time: string } | null
}

export interface TaskStep {
  id: string
  title: string
  is_completed: boolean
}

export interface Task {
  id: string
  user_id: string
  list_id: string | null
  title: string
  body: string | null
  is_completed: boolean
  completed_at: string | null
  due_date: string | null
  reminder_at: string | null
  importance: 'low' | 'normal' | 'high'
  steps: TaskStep[]
  source_message_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TaskList {
  id: string
  user_id: string
  name: string
  is_default: boolean
  color: string | null
  sort_order: number
  created_at: string
}

export interface RuleCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'has_attachment' | 'importance'
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with'
  value: string
}

export interface RuleAction {
  type:
    | 'move_to_folder'
    | 'mark_as_read'
    | 'flag'
    | 'forward_to'
    | 'delete'
    | 'set_category'
    | 'set_importance'
  params: Record<string, string>
}

export interface Rule {
  id: string
  user_id: string
  name: string
  is_enabled: boolean
  priority: number
  conditions: RuleCondition[]
  actions: RuleAction[]
  stop_processing: boolean
  apply_to: 'incoming' | 'outgoing' | 'both'
  created_at: string
  updated_at: string
}

export interface Signature {
  id: string
  user_id: string
  name: string
  body_html: string
  is_default_new: boolean
  is_default_reply: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface QuickStep {
  id: string
  name: string
  icon: string | null
  actions: { type: string; params?: Record<string, string> }[]
  shortcut_key: string | null
  sort_order: number
}

export interface OOFSettings {
  enabled: boolean
  start: string | null
  end: string | null
  message_internal: string | null
  message_external: string | null
}

export interface AppSettings {
  timezone: string
  locale: string
  reading_pane_position: 'right' | 'bottom' | 'off'
  conversation_grouping: boolean
  focused_inbox: boolean
  theme: 'light' | 'dark'
  // Nested shape from API
  general?: { theme?: string; timezone?: string; locale?: string }
  mail?: Record<string, unknown>
  calendar?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  total_count?: number
  page: number
  per_page: number
  pages: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string; user: User }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  getMe: () => request<User>('/auth/me'),
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messages = {
  list: (params: {
    folder_id?: string
    folder_slug?: string
    page?: number
    per_page?: number
    sort?: string
    order?: 'asc' | 'desc'
    is_read?: boolean
    is_flagged?: boolean
    focused?: boolean
    conversation_grouping?: boolean
    from_addr?: string
  }) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) {
        // Map per_page to limit (backend expects 'limit')
        const key = k === 'per_page' ? 'limit' : k
        qs.set(key, String(v))
      }
    })
    return request<PaginatedResponse<Message>>(`/messages?${qs}`)
  },

  get: (id: string) => request<Message>(`/messages/${id}`),

  create: (data: Partial<Message>) =>
    request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Message>) =>
    request<Message>(`/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/messages/${id}`, { method: 'DELETE' }),

  reply: (id: string, data: Partial<Message>) =>
    request<Message>(`/messages/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forward: (id: string, data: Partial<Message>) =>
    request<Message>(`/messages/${id}/forward`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  move: (id: string, folder_id: string) =>
    request<Message>(`/messages/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ folder_id }),
    }),

  bulk: (action: string, ids: string[], params?: Record<string, string>) =>
    request<{ affected: number }>('/messages/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, message_ids: ids, params }),
    }),

  search: (params: {
    q?: string
    from?: string
    to?: string
    subject?: string
    has_attachment?: boolean
    date_from?: string
    date_to?: string
    folder_id?: string
  }) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v))
    })
    return request<PaginatedResponse<Message>>(`/messages/search?${qs}`)
  },

  needsFollowup: (days = 3) =>
    request<PaginatedResponse<Message>>(`/messages/needs-followup?days=${days}`),

  cleanupThread: (conversationId: string) =>
    request<{ cleaned: number }>('/messages/cleanup-thread', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    }),

  sweepKeepLatest: (senderEmail: string, folderId?: string) =>
    request<{ deleted: number; kept: number }>('/messages/sweep/keep-latest', {
      method: 'POST',
      body: JSON.stringify({ sender_email: senderEmail, folder_id: folderId ?? null }),
    }),

  sweepMoveAll: (senderEmail: string, targetFolderId: string, sourceFolderId?: string) =>
    request<{ moved: number }>('/messages/sweep/move-all', {
      method: 'POST',
      body: JSON.stringify({
        sender_email: senderEmail,
        target_folder_id: targetFolderId,
        source_folder_id: sourceFolderId ?? null,
      }),
    }),

  report: (messageId: string, type: 'junk' | 'phishing' = 'junk') =>
    request<{ status: string }>(`/messages/${messageId}/report?report_type=${type}`, { method: 'POST' }),

  block: (messageId: string) =>
    request<{ status: string; sender: string; moved: number }>(`/messages/${messageId}/block`, { method: 'POST' }),

  ignore: (messageId: string) =>
    request<{ status: string; moved: number }>(`/messages/${messageId}/ignore`, { method: 'POST' }),

  copy: (messageId: string, folderId: string) =>
    request<{ status: string; id: string }>(`/messages/${messageId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ folder_id: folderId }),
    }),

  uploadAttachment: (messageId: string, file: File): Promise<Attachment> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const formData = new FormData()
    formData.append('file', file)
    return fetch(`${BASE_URL}/messages/${messageId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<Attachment>
    })
  },
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export const folders = {
  list: () => request<Folder[]>('/folders'),

  get: (id: string) => request<Folder>(`/folders/${id}`),

  create: (data: Partial<Folder>) =>
    request<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Folder>) =>
    request<Folder>(`/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/folders/${id}`, { method: 'DELETE' }),

  getMessages: (id: string, params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params) : null
    return request<PaginatedResponse<Message>>(
      `/folders/${id}/messages${qs ? `?${qs}` : ''}`
    )
  },
}

// ─── Conversations ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  user_id: string
  subject: string
  last_message_at: string | null
  message_count: number
  has_attachments: boolean
}

export const conversations = {
  list: (params?: { folder_id?: string; limit?: number }) => {
    const qs = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ) : null
    return request<{ items: Conversation[]; next_cursor: string | null; total_count: number }>(`/conversations${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) =>
    request<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const contacts = {
  list: (params?: { page?: number; per_page?: number; search?: string }) => {
    const qs = params ? new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ) : null
    return request<PaginatedResponse<Contact>>(`/contacts${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => request<Contact>(`/contacts/${id}`),

  create: (data: Partial<Contact>) =>
    request<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Contact>) =>
    request<Contact>(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/contacts/${id}`, { method: 'DELETE' }),

  autocomplete: (query: string) =>
    request<Contact[]>(`/contacts/autocomplete?q=${encodeURIComponent(query)}`),
}

// ─── Calendars ────────────────────────────────────────────────────────────────

export const calendars = {
  list: () => request<Calendar[]>('/calendars'),

  create: (data: Partial<Calendar>) =>
    request<Calendar>('/calendars', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Calendar>) =>
    request<Calendar>(`/calendars/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/calendars/${id}`, { method: 'DELETE' }),

  share: (id: string, permissionLevel: string, share: boolean) =>
    request<Calendar>(`/calendars/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_shared: share, permission_level: permissionLevel }),
    }),

  subscribe: (email: string) =>
    request<Calendar>('/calendars/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  unsubscribe: (id: string) =>
    request<void>(`/calendars/${id}`, { method: 'DELETE' }),
}

// ─── Events ───────────────────────────────────────────────────────────────────

export const events = {
  list: (params: {
    calendar_id?: string
    start?: string
    end?: string
    page?: number
    per_page?: number
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    )
    return request<PaginatedResponse<Event>>(`/events?${qs}`).then((r) => r.items)
  },

  get: (id: string) => request<Event>(`/events/${id}`),

  create: (data: Partial<Event>) =>
    request<Event>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Event>, scope?: 'single' | 'following' | 'series', occurrenceStart?: string) => {
    const qs = new URLSearchParams()
    if (scope) qs.set('scope', scope)
    if (occurrenceStart) qs.set('occurrence_start', occurrenceStart)
    const query = qs.toString() ? `?${qs}` : ''
    return request<Event>(`/events/${id}${query}`, { method: 'PATCH', body: JSON.stringify(data) })
  },

  delete: (id: string, scope?: 'single' | 'following' | 'series', occurrenceStart?: string) => {
    const qs = new URLSearchParams()
    if (scope) qs.set('scope', scope)
    if (occurrenceStart) qs.set('occurrence_start', occurrenceStart)
    const query = qs.toString() ? `?${qs}` : ''
    return request<void>(`/events/${id}${query}`, { method: 'DELETE' })
  },

  respond: (id: string, response: 'accepted' | 'tentative' | 'declined') =>
    request<EventAttendee>(`/events/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    }),

  proposeTime: (
    id: string,
    start_time: string,
    end_time: string
  ) =>
    request<void>(`/events/${id}/propose-time`, {
      method: 'POST',
      body: JSON.stringify({ start_time, end_time }),
    }),

  getAvailability: (emails: string[], start: string, end: string) => {
    const qs = new URLSearchParams({
      attendee_emails: emails.join(','),
      start,
      end,
    })
    return request<Array<{ attendee: string; slots: Array<{ start: string; end: string; status: string }> }>>(
      `/events/availability?${qs}`
    )
  },
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks = {
  list: (params?: {
    list_id?: string
    is_completed?: boolean
    importance?: string
    due_before?: string
    page?: number
    per_page?: number
  }) => {
    const qs = params
      ? new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        )
      : null
    return request<PaginatedResponse<Task>>(`/tasks${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => request<Task>(`/tasks/${id}`),

  create: (data: Partial<Task>) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  complete: (id: string) =>
    request<Task>(`/tasks/${id}/complete`, { method: 'POST' }),

  uncomplete: (id: string) =>
    request<Task>(`/tasks/${id}/uncomplete`, { method: 'POST' }),
}

// ─── Task Lists ───────────────────────────────────────────────────────────────

export const taskLists = {
  list: () => request<TaskList[]>('/task-lists'),

  create: (data: Partial<TaskList>) =>
    request<TaskList>('/task-lists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<TaskList>) =>
    request<TaskList>(`/task-lists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/task-lists/${id}`, { method: 'DELETE' }),
}

// ─── Rules ────────────────────────────────────────────────────────────────────

export const rules = {
  list: () => request<Rule[]>('/rules'),

  create: (data: Partial<Rule>) =>
    request<Rule>('/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Rule>) =>
    request<Rule>(`/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/rules/${id}`, { method: 'DELETE' }),

  run: (id: string, folder_id?: string) =>
    request<void>(`/rules/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ folder_id }),
    }),

  reorder: (ordered_ids: string[]) =>
    request<void>('/rules/reorder', {
      method: 'POST',
      body: JSON.stringify({ ordered_ids }),
    }),
}

// ─── Signatures ───────────────────────────────────────────────────────────────

export const signatures = {
  list: () => request<Signature[]>('/signatures'),

  create: (data: Partial<Signature>) =>
    request<Signature>('/signatures', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Signature>) =>
    request<Signature>(`/signatures/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/signatures/${id}`, { method: 'DELETE' }),
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = {
  list: () => request<Category[]>('/categories'),

  create: (data: Partial<Category>) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Category>) =>
    request<Category>(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/categories/${id}`, { method: 'DELETE' }),
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = {
  get: () => request<AppSettings>('/settings'),

  update: (data: Partial<AppSettings>) =>
    request<AppSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getOOF: () => request<OOFSettings>('/settings/oof'),

  updateOOF: (data: Partial<OOFSettings>) =>
    request<OOFSettings>('/settings/oof', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listDelegates: () => request<{ id: string; email: string; name: string; mail_permission: string; calendar_permission: string }[]>('/settings/delegates'),

  addDelegate: (data: { id: string; email: string; name: string; mail_permission: string; calendar_permission: string }) =>
    request<typeof data>('/settings/delegates', { method: 'POST', body: JSON.stringify(data) }),

  removeDelegate: (id: string) =>
    request<void>(`/settings/delegates/${id}`, { method: 'DELETE' }),
}

// ─── Quick Steps ──────────────────────────────────────────────────────────────

export const quickSteps = {
  list: () => request<QuickStep[]>('/quick-steps'),

  create: (data: Partial<QuickStep>) =>
    request<QuickStep>('/quick-steps', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<QuickStep>) =>
    request<QuickStep>(`/quick-steps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/quick-steps/${id}`, { method: 'DELETE' }),

  run: (id: string, message_id: string) =>
    request<{ applied: string[] }>(`/quick-steps/${id}/run?message_id=${message_id}`, {
      method: 'POST',
    }),
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export interface Group {
  id: string
  name: string
  description: string | null
  email: string
  privacy: 'public' | 'private'
  color: string
  member_count: number
  is_member: boolean
  created_at: string
  updated_at: string
}

export const groups = {
  list: () => request<Group[]>('/groups'),

  create: (data: { name: string; description?: string; email?: string; privacy?: string; color?: string }) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Group>) =>
    request<Group>(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  join: (id: string) =>
    request<{ id: string; group_id: string; user_id: string; role: string; joined_at: string }>(
      `/groups/${id}/join`, { method: 'POST' }
    ),

  leave: (id: string) => request<void>(`/groups/${id}/leave`, { method: 'DELETE' }),
}

// ─── RL Environment ───────────────────────────────────────────────────────────

export const rl = {
  health: () => request<{ status: string; timestamp: string }>('/rl/health'),

  seed: (scenario?: string) =>
    request<{ message: string }>('/rl/seed', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    }),

  reset: () =>
    request<{ message: string }>('/rl/reset', { method: 'POST' }),

  snapshot: () =>
    request<{ snapshot_id: string }>('/rl/snapshot', { method: 'POST' }),

  restore: (snapshot_id: string) =>
    request<{ message: string }>('/rl/restore', {
      method: 'POST',
      body: JSON.stringify({ snapshot_id }),
    }),

  clock: () =>
    request<{ current_time: string; is_frozen: boolean }>('/rl/clock'),

  verify: (checks: string[]) =>
    request<{ results: Record<string, boolean> }>('/rl/verify', {
      method: 'POST',
      body: JSON.stringify({ checks }),
    }),
}
