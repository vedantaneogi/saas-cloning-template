'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Bell, HelpCircle, Check, X, UserPlus, Settings, ArrowLeft, Filter,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useMailStore } from '@/store/mail'
import { useUIStore } from '@/store/ui'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatMessageDate } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { messages, auth, contacts } from '@/lib/api'

// ─── Waffle Icon (Microsoft 365 app launcher) ──────────────────────────────
// Matches the Fluent waffle used on the real Outlook web UI: a 2×2 cluster
// of colored tiles (blue/red/green/yellow) instead of the plain white grid we
// shipped earlier. Senior asked for the same icon as Microsoft 365 / Outlook.
function WaffleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="7.5" height="7.5" rx="0.6" fill="#F25022" />
      <rect x="11" y="1.5" width="7.5" height="7.5" rx="0.6" fill="#7FBA00" />
      <rect x="1.5" y="11" width="7.5" height="7.5" rx="0.6" fill="#00A4EF" />
      <rect x="11" y="11" width="7.5" height="7.5" rx="0.6" fill="#FFB900" />
    </svg>
  )
}

// ─── Outlook-style search glyph ────────────────────────────────────────────
// Outlook's search icon is a slightly thicker magnifying glass than the
// lucide default. Stroked with currentColor so it inherits the surrounding
// text color (gray when idle, blue on focus).
function OutlookSearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function FilterFieldWithAutocomplete({ label, value, onChange, contacts: contactsList }: {
  label: string; value: string; onChange: (v: string) => void; contacts: { id: string; display_name: string; email: string }[]
}) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Parse value as comma-separated chips
  const chips = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []

  const addChip = (email: string) => {
    const trimmed = email.trim()
    if (trimmed && !chips.includes(trimmed)) {
      onChange([...chips, trimmed].join(', '))
    }
    setInput('')
    inputRef.current?.focus()
  }

  const removeChip = (email: string) => {
    onChange(chips.filter((c) => c !== email).join(', '))
  }

  const filtered = input.length >= 1
    ? contactsList.filter((c) =>
        (c.display_name?.toLowerCase().includes(input.toLowerCase()) || c.email?.toLowerCase().includes(input.toLowerCase()))
        && !chips.includes(c.email)
      ).slice(0, 5)
    : []

  return (
    <div>
      <label className="block text-sm font-medium text-[#323130] mb-1">{label}</label>
      <div className={cn(
        'flex flex-wrap items-center gap-1 min-h-[32px] border-b transition-colors py-0.5',
        focused ? 'border-[#0078D4] border-b-2' : 'border-[#8A8886]'
      )} onClick={() => inputRef.current?.focus()}>
        {chips.map((chip) => (
          <span key={chip} className="inline-flex items-center gap-1 bg-[#EBF3FB] text-[#0078D4] text-xs px-2 py-0.5 rounded-full">
            {chip}
            <button type="button" onClick={() => removeChip(chip)} className="hover:text-[#005A9E]">
              <X size={10} />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[100px]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ',' || e.key === ';') && input.trim()) {
                e.preventDefault()
                addChip(input)
              } else if (e.key === 'Backspace' && !input && chips.length > 0) {
                removeChip(chips[chips.length - 1])
              }
            }}
            onFocus={() => { if (blurRef.current) clearTimeout(blurRef.current); setFocused(true) }}
            onBlur={() => {
              blurRef.current = setTimeout(() => {
                setFocused(false)
                if (input.trim()) addChip(input)
              }, 200)
            }}
            placeholder={chips.length === 0 ? '' : ''}
            className="w-full text-sm text-[#323130] focus:outline-none bg-transparent py-0.5"
          />
          {focused && filtered.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-[300] w-72 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg max-h-40 overflow-y-auto">
              {filtered.map((c) => (
                <button key={c.id} type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    if (blurRef.current) clearTimeout(blurRef.current)
                    addChip(c.email)
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F3F2F1]">
                  <div className="w-6 h-6 rounded-full bg-[#0078D4] text-white flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                    {c.display_name?.[0]?.toUpperCase() ?? c.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#323130]">{c.display_name}</p>
                    <p className="text-xs text-[#605E5C] truncate">{c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TopToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.currentUser)
  const accounts = useAuthStore((s) => s.accounts)
  const logout = useAuthStore((s) => s.logout)
  const switchAccount = useAuthStore((s) => s.switchAccount)
  const removeAccount = useAuthStore((s) => s.removeAccount)
  const addAccount = useAuthStore((s) => s.addAccount)
  const setSearchQuery = useMailStore((s) => s.setSearchQuery)
  const [search, setSearch] = useState('')
  const [showAppLauncher, setShowAppLauncher] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const appLauncherRef = useRef<HTMLDivElement>(null)
  const [showBell, setShowBell] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addError, setAddError] = useState('')
  const [addPending, setAddPending] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchTab, setSearchTab] = useState<'All' | 'Mail' | 'Files' | 'Teams' | 'People'>('All')
  const [showSearchFilters, setShowSearchFilters] = useState(false)
  const [searchFolderScope, setSearchFolderScope] = useState('all')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterCc, setFilterCc] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterKeywords, setFilterKeywords] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterReadStatus, setFilterReadStatus] = useState('')
  const [filterAttachments, setFilterAttachments] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDropdownRef = useRef<HTMLDivElement>(null)

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => messages.list({ folder_slug: 'inbox', per_page: 10 }),
    refetchInterval: 30000,
  })

  // Contact suggestions for search dropdown
  const { data: contactData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contacts.list(),
  })
  const contactList = contactData?.items ?? []

  // Live search results (mail) — fires on focus regardless of query length so each tab has content
  const liveQuery = search.trim()
  const liveEnabled = searchFocused && (searchTab === 'All' || searchTab === 'Mail' || searchTab === 'Files')
  const { data: liveMail } = useQuery({
    queryKey: ['top-search-mail', liveQuery, searchTab],
    queryFn: () =>
      liveQuery.length >= 2
        ? messages.search({
            q: liveQuery,
            has_attachment: searchTab === 'Files' ? true : undefined,
          })
        : messages.list({
            folder_slug: 'inbox',
            is_read: searchTab === 'Files' ? undefined : undefined,
            per_page: searchTab === 'Files' ? 30 : 8,
          }),
    enabled: liveEnabled,
  })
  const liveMessages = (liveMail?.items ?? []).slice(0, 5)
  // Files: attachments from matched (or recent) messages.
  const liveFiles = (searchTab === 'All' || searchTab === 'Files')
    ? (liveMail?.items ?? []).flatMap((m) =>
        (m.attachments ?? []).map((a) => ({ message: m, attachment: a }))
      ).slice(0, searchTab === 'Files' ? 20 : 5)
    : []
  // People: contact list filtered by query, or full list when no query.
  const livePeople = (searchTab === 'All' || searchTab === 'People')
    ? (liveQuery
        ? contactList.filter((c) => {
            const term = liveQuery.toLowerCase()
            return (
              c.display_name?.toLowerCase().includes(term) ||
              c.email?.toLowerCase().includes(term) ||
              c.company?.toLowerCase().includes(term)
            )
          })
        : contactList
      ).slice(0, searchTab === 'People' ? 20 : 5)
    : []
  const TEAMS_SEED = [
    { id: 't1', name: 'Project Alpha', last: 'Alice: pushed the latest deck' },
    { id: 't2', name: 'Engineering · General', last: 'Bob: anyone seeing flaky CI?' },
    { id: 't3', name: 'Design · Reviews', last: 'David: feedback on iconography' },
    { id: 't4', name: 'Carol Williams', last: 'Carol: thanks for the proposal' },
  ]
  const liveTeams = (searchTab === 'All' || searchTab === 'Teams')
    ? (liveQuery
        ? TEAMS_SEED.filter((t) => t.name.toLowerCase().includes(liveQuery.toLowerCase()) || t.last.toLowerCase().includes(liveQuery.toLowerCase()))
        : TEAMS_SEED
      ).slice(0, searchTab === 'Teams' ? 10 : 3)
    : []

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('outlook_recent_searches') ?? '[]') } catch { return [] }
  })

  const addRecentSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('outlook_recent_searches', JSON.stringify(updated))
  }

  const notifications = (notifData?.items ?? []).filter((m) => !m.is_read).slice(0, 8)
  const unreadCount = notifications.length

  useEffect(() => {
    if (!showAppLauncher) return
    const handler = (e: MouseEvent) => {
      if (appLauncherRef.current && !appLauncherRef.current.contains(e.target as Node)) setShowAppLauncher(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAppLauncher])

  // Close search dropdown on outside click
  useEffect(() => {
    if (!searchFocused) return
    const handler = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchFocused])

  useEffect(() => {
    if (!showBell) return
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBell])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim()
    if (q) {
      addRecentSearch(q)
      setSearchQuery(q)
      // Keep dropdown open with results — Outlook style. No navigation.
    }
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (value === '' && pathname?.startsWith('/mail/search')) {
      setSearchQuery('')
      router.push('/mail/inbox')
    }
  }, [pathname, router, setSearchQuery])

  const handleAdvancedSearch = () => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)
    if (filterCc) params.set('cc', filterCc)
    if (filterSubject) params.set('subject', filterSubject)
    if (filterKeywords) params.set('keywords', filterKeywords)
    if (filterAttachments) params.set('has_attachment', 'true')
    if (filterDateFrom) params.set('date_from', filterDateFrom)
    if (filterDateTo) params.set('date_to', filterDateTo)
    if (filterReadStatus) params.set('read_status', filterReadStatus)
    if (searchFolderScope !== 'all') params.set('folder_id', searchFolderScope)
    const qs = params.toString()
    // Allow search with just filters (no search text required)
    if (qs) {
      if (search.trim()) addRecentSearch(search.trim())
      setSearchFocused(false)
      setShowSearchFilters(false)
      searchInputRef.current?.blur()
      router.push(`/mail/search?${qs}`)
    } else {
      // If nothing entered, just navigate to search page
      setSearchFocused(false)
      setShowSearchFilters(false)
      router.push('/mail/search')
    }
  }

  const handleSearchClear = () => {
    setSearch('')
    setSearchQuery('')
    searchInputRef.current?.blur()
    if (pathname?.startsWith('/mail/search')) router.push('/mail/inbox')
  }

  const handleLogout = () => {
    queryClient.clear()
    useMailStore.getState().setSelectedMessageId(null)
    useMailStore.getState().setSelectedFolderId(null)
    useMailStore.getState().setSelectedFolderSlug('inbox')
    useMailStore.getState().clearSelection()
    logout()
    router.push('/sign-in')
  }

  const handleSwitchAccount = (userId: string) => {
    // 1. Switch token + user in auth store
    switchAccount(userId)
    // 2. Reset mail store to clean state
    useMailStore.getState().setSelectedMessageId(null)
    useMailStore.getState().setSelectedFolderId(null)
    useMailStore.getState().setSelectedFolderSlug('inbox')
    useMailStore.getState().clearSelection()
    useMailStore.getState().setSearchQuery('')
    // 3. Clear ALL query cache — forces fresh fetches with new token
    queryClient.removeQueries()
    // 4. Navigate
    setShowUserMenu(false)
    router.push('/mail/inbox')
    // 5. Force refetch after navigation
    setTimeout(() => {
      queryClient.invalidateQueries()
    }, 100)
  }

  const handleRemoveAccount = (userId: string) => {
    removeAccount(userId); queryClient.clear()
    if (!useAuthStore.getState().token) router.push('/sign-in')
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setAddError(''); setAddPending(true)
    try {
      const result = await auth.login(addEmail.trim(), addPassword)
      addAccount(result.access_token, result.user)
      useMailStore.getState().setSelectedMessageId(null)
      useMailStore.getState().setSelectedFolderId(null)
      useMailStore.getState().setSelectedFolderSlug('inbox')
      useMailStore.getState().clearSelection()
      queryClient.removeQueries()
      setShowAddAccount(false); setAddEmail(''); setAddPassword('')
      setShowUserMenu(false); router.push('/mail/inbox')
      setTimeout(() => queryClient.invalidateQueries(), 100)
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Login failed')
    } finally { setAddPending(false) }
  }

  return (
      <header
        aria-label="Top toolbar"
        className="h-12 bg-[#0F6CBD] flex items-center px-2 gap-2"
      >
        {/* Waffle App Launcher + Outlook */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="relative" ref={appLauncherRef}>
            <button
              onClick={() => setShowAppLauncher((v) => !v)}
              aria-label="App launcher"
              aria-expanded={showAppLauncher}
              aria-haspopup="true"
              title="Microsoft 365"
              className={cn(
                'w-9 h-9 flex items-center justify-center text-white rounded transition-colors',
                showAppLauncher ? 'bg-white/20' : 'hover:bg-white/10'
              )}
            >
              <WaffleIcon />
            </button>

            {showAppLauncher && (
              <div className="absolute left-0 top-11 z-50 w-72 bg-white rounded-lg shadow-outlook-lg border border-[#EDEBE9] animate-fade-in">
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-sm font-semibold text-[#323130]">Microsoft 365</h3>
                </div>
                <div className="grid grid-cols-3 gap-1 px-3 pb-3">
                  {[
                    { name: 'Outlook', icon: '📧', color: '#0078D4', href: '/mail/inbox' },
                    { name: 'Calendar', icon: '📅', color: '#0078D4', href: '/calendar/month' },
                    { name: 'People', icon: '👥', color: '#0078D4', href: '/contacts' },
                    { name: 'To Do', icon: '✅', color: '#107C10', href: '/tasks' },
                    { name: 'Word', icon: '📝', color: '#185ABD', href: '#' },
                    { name: 'Excel', icon: '📊', color: '#107C41', href: '#' },
                    { name: 'PowerPoint', icon: '📙', color: '#C43E1C', href: '#' },
                    { name: 'OneDrive', icon: '☁️', color: '#0078D4', href: '#' },
                    { name: 'Teams', icon: '💬', color: '#6264A7', href: '#' },
                    { name: 'OneNote', icon: '📓', color: '#7719AA', href: '#' },
                    { name: 'SharePoint', icon: '🏢', color: '#038387', href: '#' },
                    { name: 'Groups', icon: '👨‍👩‍👧‍👦', color: '#0078D4', href: '/groups' },
                  ].map((app) => (
                    <button
                      key={app.name}
                      onClick={() => {
                        if (app.href !== '#') router.push(app.href)
                        setShowAppLauncher(false)
                      }}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-[#F3F2F1] transition-colors"
                    >
                      <span className="text-2xl leading-none">{app.icon}</span>
                      <span className="text-[11px] text-[#323130] leading-tight">{app.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#EDEBE9] px-4 py-2.5">
                  <button
                    onClick={() => setShowAppLauncher(false)}
                    className="text-xs text-[#0078D4] hover:underline"
                  >
                    All apps →
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => router.push('/mail/inbox')}
            aria-label="Outlook"
            className="px-1.5 py-1 hover:bg-white/10 rounded transition-colors"
          >
            <span className="text-white text-sm font-semibold">Outlook</span>
          </button>
        </div>

        {/* Search — Outlook style with All folders + filter icon. Fixed
            width band (senior didn't want the bar to jump on focus); only
            the suggestions dropdown appears below when typing. */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-2xl" ref={searchDropdownRef}>
            <form onSubmit={handleSearch} role="search">
              <div className="flex items-center bg-white rounded border border-transparent focus-within:border-[#0078D4] transition-colors">
                {/* All folders dropdown */}
                <div className="relative flex-shrink-0">
                  <select
                    value={searchFolderScope}
                    onChange={(e) => setSearchFolderScope(e.target.value)}
                    className="text-xs text-[#323130] bg-transparent border-0 border-r border-[#EDEBE9] pl-2 pr-6 py-1.5 focus:outline-none appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'8\' height=\'5\' viewBox=\'0 0 8 5\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l3 3 3-3\' stroke=\'%23605E5C\' stroke-width=\'1.2\' stroke-linecap=\'round\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                  >
                    <option value="all">All folders</option>
                    <option value="current">Current folder</option>
                    <option value="subfolders">Subfolders</option>
                    <option value="favorites">Favorites</option>
                  </select>
                </div>

                {/* Back arrow when focused */}
                {searchFocused && (
                  <button type="button" onClick={() => { setSearchFocused(false); setShowSearchFilters(false) }}
                    className="px-1.5 text-[#605E5C] hover:text-[#323130] flex-shrink-0">
                    <ArrowLeft size={14} />
                  </button>
                )}

                {/* Search input */}
                <div className="flex-1 relative">
                  {!searchFocused && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#605E5C]">
                      <OutlookSearchIcon size={14} />
                    </span>
                  )}
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    placeholder="Search"
                    aria-label="Search"
                    className={cn(
                      'w-full text-sm py-1.5 bg-transparent text-[#323130] placeholder:text-[#A19F9D] focus:outline-none',
                      searchFocused ? 'pl-1' : 'pl-7'
                    )}
                  />
                </div>

                {/* Clear + Filter + Search icons */}
                <div className="flex items-center gap-0.5 pr-1 flex-shrink-0">
                  {search && (
                    <button type="button" onClick={() => { handleSearchClear(); setSearchFocused(false); setShowSearchFilters(false) }}
                      className="p-1 text-[#605E5C] hover:text-[#323130] rounded">
                      <X size={14} />
                    </button>
                  )}
                  <button type="button"
                    aria-label="Search filters"
                    onClick={() => setShowSearchFilters((v) => !v)}
                    className={cn('p-1 rounded transition-colors', showSearchFilters ? 'text-[#0078D4] bg-[#EBF3FB]' : 'text-[#605E5C] hover:text-[#323130]')}>
                    <Filter size={14} />
                  </button>
                  {/* Magnifier button is fully functional now — clicking it
                      runs the same search-page navigation as pressing Enter
                      so the icon isn't decorative. With an empty query +
                      filter panel open, it kicks off the filter-only
                      advanced search. */}
                  <button
                    type="button"
                    aria-label="Run search"
                    onClick={(e) => {
                      e.preventDefault()
                      const q = search.trim()
                      if (!q && showSearchFilters) {
                        handleAdvancedSearch()
                        return
                      }
                      if (q) {
                        addRecentSearch(q)
                        setSearchQuery(q)
                        router.push(`/mail/search?q=${encodeURIComponent(q)}`)
                        setSearchFocused(false)
                      } else {
                        searchInputRef.current?.focus()
                      }
                    }}
                    className="p-1 text-[#605E5C] hover:text-[#0078D4] rounded"
                  >
                    <OutlookSearchIcon size={14} />
                  </button>
                </div>
              </div>
            </form>

            {/* Search suggestions dropdown */}
            {searchFocused && (
              <div className="absolute left-0 right-0 top-full mt-0.5 z-50 bg-white border border-[#EDEBE9] rounded-b shadow-outlook-lg animate-fade-in">
                {/* Tabs: All / Mail / Files / Teams / People — filter dropdown content in place */}
                <div className="flex border-b border-[#EDEBE9]">
                  {(['All', 'Mail', 'Files', 'Teams', 'People'] as const).map((tab) => (
                    <button
                      key={tab}
                      onMouseDown={(e) => {
                        e.preventDefault() // keep input focused
                        setSearchTab(tab)
                      }}
                      className={cn(
                        'px-4 py-2 text-sm transition-colors relative',
                        searchTab === tab
                          ? 'text-[#0078D4] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0078D4]'
                          : 'text-[#605E5C] hover:text-[#323130] hover:bg-[#F3F2F1]'
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="max-h-[65vh] overflow-y-auto outlook-scrollbar">
                  {/* Live results — render whenever a tab is active. Without a query we surface
                       recent items of that type (recent inbox / recent files / contacts / teams),
                       matching Outlook's behavior of always showing tab content. */}
                  {searchTab !== 'All' || liveQuery.length >= 2 ? (
                    <>
                      {(searchTab === 'All' || searchTab === 'Mail') && liveMessages.length > 0 && (
                        <div className="py-1 border-b border-[#EDEBE9]">
                          {searchTab === 'All' && (
                            <p className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wide text-[#605E5C]">Mail</p>
                          )}
                          {liveMessages.map((m) => (
                            <button
                              key={m.id}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                addRecentSearch(liveQuery)
                                router.push(`/mail/inbox?msg=${m.id}`)
                                setSearchFocused(false)
                              }}
                              className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-[#F3F2F1] transition-colors text-left"
                            >
                              <Avatar name={m.from_name || m.from_address} size="sm" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <p className="text-sm font-medium text-[#323130] truncate">{m.from_name || m.from_address}</p>
                                  <span className="text-xs text-[#605E5C] flex-shrink-0">{formatMessageDate(m.received_at ?? m.created_at)}</span>
                                </div>
                                <p className="text-xs text-[#323130] truncate">{m.subject || '(no subject)'}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {(searchTab === 'All' || searchTab === 'Files') && liveFiles.length > 0 && (
                        <div className="py-1 border-b border-[#EDEBE9]">
                          {searchTab === 'All' && (
                            <p className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wide text-[#605E5C]">Files</p>
                          )}
                          {liveFiles.map(({ message, attachment }) => (
                            <button
                              key={attachment.id}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                router.push(`/mail/inbox?msg=${message.id}`)
                                setSearchFocused(false)
                              }}
                              className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-[#F3F2F1] transition-colors text-left"
                            >
                              <span className="w-7 h-7 rounded bg-[#F3F2F1] flex items-center justify-center text-xs flex-shrink-0">📎</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#323130] truncate">{attachment.filename}</p>
                                <p className="text-xs text-[#605E5C] truncate">From {message.from_name || message.from_address}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {(searchTab === 'All' || searchTab === 'Teams') && liveTeams.length > 0 && (
                        <div className="py-1 border-b border-[#EDEBE9]">
                          {searchTab === 'All' && (
                            <p className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wide text-[#605E5C]">Teams</p>
                          )}
                          {liveTeams.map((t) => (
                            <div key={t.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-[#F3F2F1] transition-colors">
                              <span className="w-7 h-7 rounded bg-[#6264A7] text-white flex items-center justify-center text-xs flex-shrink-0 font-semibold">T</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#323130] truncate">{t.name}</p>
                                <p className="text-xs text-[#605E5C] truncate">{t.last}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(searchTab === 'All' || searchTab === 'People') && livePeople.length > 0 && (
                        <div className="py-1 border-b border-[#EDEBE9]">
                          {searchTab === 'All' && (
                            <p className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wide text-[#605E5C]">People</p>
                          )}
                          {livePeople.map((c) => (
                            <button
                              key={c.id}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                router.push(`/contacts?id=${c.id}`)
                                setSearchFocused(false)
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F3F2F1] transition-colors text-left"
                            >
                              <Avatar name={c.display_name || c.email} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#323130] truncate">{c.display_name || c.email}</p>
                                <p className="text-xs text-[#605E5C] truncate">{c.email}{c.company ? ` · ${c.company}` : ''}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Per-tab empty state — only when on a specific tab with no results */}
                      {searchTab === 'Mail' && liveMessages.length === 0 && (
                        <div className="px-3 py-6 text-center text-sm text-[#605E5C]">{liveQuery ? `No mail matches "${liveQuery}"` : 'No mail in inbox'}</div>
                      )}
                      {searchTab === 'Files' && liveFiles.length === 0 && (
                        <div className="px-3 py-6 text-center text-sm text-[#605E5C]">{liveQuery ? `No files match "${liveQuery}"` : 'No files in your mailbox'}</div>
                      )}
                      {searchTab === 'Teams' && liveTeams.length === 0 && (
                        <div className="px-3 py-6 text-center text-sm text-[#605E5C]">{liveQuery ? `No Teams chats match "${liveQuery}"` : 'No Teams chats yet'}</div>
                      )}
                      {searchTab === 'People' && livePeople.length === 0 && (
                        <div className="px-3 py-6 text-center text-sm text-[#605E5C]">{liveQuery ? `No people match "${liveQuery}"` : 'No contacts yet'}</div>
                      )}

                      {/* See all results — only meaningful when there's a query */}
                      {liveQuery.length >= 2 && (
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault()
                            addRecentSearch(liveQuery)
                            router.push(`/mail/search?type=${searchTab.toLowerCase()}&q=${encodeURIComponent(liveQuery)}`)
                            setSearchFocused(false)
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-[#0078D4] hover:bg-[#F3F2F1] transition-colors"
                        >
                          See all results for &ldquo;{liveQuery}&rdquo; →
                        </button>
                      )}
                    </>
                  ) : null}

                  {/* Recent searches — only on All tab when nothing typed.
                      Other tabs render their own category content above and must NOT
                      leak unrelated suggestions below the tab header. */}
                  {searchTab === 'All' && liveQuery.length < 2 && recentSearches.length > 0 && (
                    <div className="py-1">
                      {recentSearches.map((q) => (
                        <button
                          key={q}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setSearch(q)
                            setSearchQuery(q)
                            router.push(`/mail/search?q=${encodeURIComponent(q)}`)
                            setSearchFocused(false)
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#323130] hover:bg-[#F3F2F1] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#605E5C] flex-shrink-0"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          <span className="truncate">{q}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Contact suggestions — only on All tab when nothing typed
                      (People tab renders its own scrollable list of livePeople above). */}
                  {searchTab === 'All' && liveQuery.length < 2 && contactList.length > 0 && (
                    <div className="py-1 border-t border-[#EDEBE9]">
                      {contactList
                        .filter((c) => !search || c.display_name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))
                        .slice(0, 5)
                        .map((contact) => (
                          <button
                            key={contact.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              const q = `from:"${contact.email}"`
                              setSearch(q)
                              addRecentSearch(q)
                              setSearchQuery(q)
                              router.push(`/mail/search?from=${encodeURIComponent(contact.email)}`)
                              setSearchFocused(false)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F3F2F1] transition-colors"
                          >
                            <Avatar name={contact.display_name || contact.email} size="sm" />
                            <div className="text-left min-w-0">
                              <p className="text-sm font-medium text-[#323130] truncate">{contact.display_name || contact.email.split('@')[0]}</p>
                              <p className="text-xs text-[#605E5C] truncate">from:&quot;{contact.email}&quot;</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}

                  {searchTab === 'All' && liveQuery.length < 2 && recentSearches.length === 0 && contactList.length === 0 && (
                    <div className="px-3 py-4 text-sm text-[#A19F9D] text-center">
                      Start typing to search
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filter panel — drops down when filter icon clicked */}
            {showSearchFilters && (
              <div className="absolute left-0 right-0 top-full mt-0.5 z-50 bg-white border border-[#EDEBE9] rounded-b shadow-outlook-lg p-4 space-y-3 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-[#323130] mb-1">Search in</label>
                  <select value={searchFolderScope} onChange={(e) => setSearchFolderScope(e.target.value)}
                    className="w-full border-b-2 border-[#0078D4] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none bg-transparent">
                    <option value="all">All folders</option>
                    <option value="current">Current folder</option>
                    <option value="subfolders">Subfolders</option>
                    <option value="favorites">Favorites</option>
                  </select>
                </div>
                <FilterFieldWithAutocomplete label="From" value={filterFrom} onChange={setFilterFrom} contacts={contactList} />
                <FilterFieldWithAutocomplete label="To" value={filterTo} onChange={setFilterTo} contacts={contactList} />
                <FilterFieldWithAutocomplete label="Cc" value={filterCc} onChange={setFilterCc} contacts={contactList} />
                <div>
                  <label className="block text-sm font-medium text-[#323130] mb-1">Subject</label>
                  <input type="text" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
                    className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#323130] mb-1">Keywords</label>
                  <input type="text" value={filterKeywords} onChange={(e) => setFilterKeywords(e.target.value)}
                    className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#323130] mb-1">Date</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <span className="text-xs text-[#605E5C]">Start</span>
                      <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-[#605E5C]">End</span>
                      <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                        className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#323130] mb-1">Read status</label>
                  <select value={filterReadStatus} onChange={(e) => setFilterReadStatus(e.target.value)}
                    className="w-full border-b border-[#8A8886] border-t-0 border-l-0 border-r-0 px-0 py-1.5 text-sm text-[#323130] focus:outline-none focus:border-b-2 focus:border-[#0078D4] bg-transparent">
                    <option value="">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={filterAttachments} onChange={(e) => setFilterAttachments(e.target.checked)} className="rounded border-[#8A8886] w-4 h-4" />
                  <span className="text-sm text-[#323130]">Attachments</span>
                </label>
                <div className="flex items-center justify-between pt-2">
                  <button type="button" className="text-sm text-[#0078D4] hover:underline flex items-center gap-1">+ Add filters</button>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAdvancedSearch}
                      className="bg-[#0078D4] hover:bg-[#106EBE] text-white text-sm font-medium px-6 py-1.5 rounded transition-colors">Search</button>
                    <button type="button" onClick={() => {
                      setFilterFrom(''); setFilterTo(''); setFilterCc(''); setFilterSubject(''); setFilterKeywords('')
                      setFilterDateFrom(''); setFilterDateTo(''); setFilterReadStatus(''); setFilterAttachments(false)
                      setSearch(''); setSearchFolderScope('all'); handleSearchClear(); setShowSearchFilters(false)
                    }} className="text-sm text-[#323130] border border-[#8A8886] px-4 py-1.5 rounded hover:bg-[#F3F2F1] transition-colors">Clear filters</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Bell */}
          <div className="relative" ref={bellRef}>
            <button
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={showBell}
              onClick={() => setShowBell((v) => !v)}
              className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#D13438] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showBell && (
              <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded shadow-outlook-lg border border-[#EDEBE9] animate-fade-in">
                <div className="px-4 py-2.5 border-b border-[#EDEBE9] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#323130]">Notifications</h3>
                  {unreadCount > 0 && <span className="text-xs text-[#605E5C]">{unreadCount} new</span>}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[#605E5C]">No new notifications</div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto outlook-scrollbar divide-y divide-[#EDEBE9]">
                    {notifications.map((msg) => (
                      <li key={msg.id}>
                        <button
                          onClick={() => { router.push('/mail/inbox'); setShowBell(false) }}
                          className="w-full text-left px-4 py-3 hover:bg-[#F3F2F1] transition-colors"
                        >
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-[#323130] truncate">{msg.from_name || msg.from_address.split('@')[0]}</span>
                            <span className="text-xs text-[#605E5C] flex-shrink-0">{formatMessageDate(msg.received_at ?? msg.created_at)}</span>
                          </div>
                          <p className="text-xs text-[#605E5C] truncate">{msg.subject || '(no subject)'}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="px-4 py-2 border-t border-[#EDEBE9]">
                  <button onClick={() => { router.push('/mail/inbox'); setShowBell(false) }} className="text-xs text-[#0078D4] hover:underline">
                    View all mail
                  </button>
                </div>
              </div>
            )}
          </div>

          <button aria-label="Settings" onClick={() => useUIStore.getState().openSettings()} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors">
            <Settings size={18} />
          </button>
          <button aria-label="Help" className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors">
            <HelpCircle size={18} />
          </button>

          {/* Account */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              aria-label={`Account for ${currentUser?.display_name ?? 'User'}`}
              className="ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <Avatar name={currentUser?.display_name ?? 'U'} src={currentUser?.avatar_url} size="sm" />
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setShowUserMenu(false); setShowAddAccount(false) }} />
                <div role="menu" className="absolute right-0 top-10 z-50 w-72 bg-white rounded shadow-outlook-lg border border-[#EDEBE9] animate-fade-in">
                  <div className="border-b border-[#EDEBE9]">
                    {accounts.length > 0 ? accounts.map((acct) => {
                      const isCurrent = acct.user.id === currentUser?.id
                      return (
                        <div key={acct.user.id} className={cn('flex items-center gap-3 px-3 py-2.5 group', isCurrent ? 'bg-[#EBF3FB]' : 'hover:bg-[#F3F2F1] cursor-pointer')}
                          onClick={() => !isCurrent && handleSwitchAccount(acct.user.id)}>
                          <Avatar name={acct.user.display_name} src={acct.user.avatar_url} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#323130] truncate flex items-center gap-1">
                              {acct.user.display_name} {isCurrent && <Check size={12} className="text-[#0078D4]" />}
                            </p>
                            <p className="text-xs text-[#605E5C] truncate">{acct.user.email}</p>
                          </div>
                          {accounts.length > 1 && (
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveAccount(acct.user.id) }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C] hover:text-[#D13438] transition-colors flex-shrink-0">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      )
                    }) : (
                      <div className="px-3 py-3">
                        <p className="text-sm font-semibold text-[#323130]">{currentUser?.display_name}</p>
                        <p className="text-xs text-[#605E5C]">{currentUser?.email}</p>
                      </div>
                    )}
                  </div>
                  {!showAddAccount ? (
                    <button onClick={() => setShowAddAccount(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#0078D4] hover:bg-[#F3F2F1] transition-colors">
                      <UserPlus size={14} /> Add another account
                    </button>
                  ) : (
                    <form onSubmit={handleAddAccount} className="px-3 py-2 space-y-2 border-b border-[#EDEBE9]">
                      <p className="text-xs font-semibold text-[#323130]">Add account</p>
                      <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="Email" autoFocus required className="w-full text-xs border border-[#EDEBE9] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]" />
                      <input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder="Password" required className="w-full text-xs border border-[#EDEBE9] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]" />
                      {addError && <p className="text-xs text-[#D13438]">{addError}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={addPending} className="flex-1 text-xs bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white px-2 py-1.5 rounded transition-colors">{addPending ? 'Signing in…' : 'Sign in'}</button>
                        <button type="button" onClick={() => { setShowAddAccount(false); setAddError('') }} className="text-xs text-[#605E5C] hover:bg-[#EDEBE9] px-2 py-1.5 rounded transition-colors">Cancel</button>
                      </div>
                    </form>
                  )}
                  <div className="p-1">
                    <button onClick={handleLogout} className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] rounded transition-colors">Sign out of all accounts</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
  )
}