'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Search, Bell, HelpCircle, Check, X, UserPlus, Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useMailStore } from '@/store/mail'
import { useUIStore } from '@/store/ui'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatMessageDate } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { messages, auth } from '@/lib/api'

// ─── Waffle Icon (Microsoft 365 app launcher) ──────────────────────────────
function WaffleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      {[0, 6.5, 13].map((y) =>
        [0, 6.5, 13].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="4.5" height="4.5" rx="0.8" fill="white" opacity="0.9" />
        ))
      )}
    </svg>
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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showBell, setShowBell] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addError, setAddError] = useState('')
  const [addPending, setAddPending] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => messages.list({ folder_slug: 'inbox', per_page: 10 }),
    refetchInterval: 30000,
  })

  const notifications = (notifData?.items ?? []).filter((m) => !m.is_read).slice(0, 8)
  const unreadCount = notifications.length

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
      setSearchQuery(q)
      router.push(`/mail/search?q=${encodeURIComponent(q)}`)
      searchInputRef.current?.blur()
    }
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (value === '' && pathname?.startsWith('/mail/search')) {
      setSearchQuery('')
      router.push('/mail/inbox')
    }
  }, [pathname, router, setSearchQuery])

  const handleSearchClear = () => {
    setSearch('')
    setSearchQuery('')
    searchInputRef.current?.blur()
    if (pathname?.startsWith('/mail/search')) router.push('/mail/inbox')
  }

  const handleLogout = () => { logout(); router.push('/sign-in') }

  const handleSwitchAccount = (userId: string) => {
    switchAccount(userId); queryClient.clear(); setShowUserMenu(false); router.push('/mail/inbox')
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
      queryClient.clear(); setShowAddAccount(false); setAddEmail(''); setAddPassword('')
      setShowUserMenu(false); router.push('/mail/inbox')
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Login failed')
    } finally { setAddPending(false) }
  }

  return (
      <header
        aria-label="Top toolbar"
        className="h-12 bg-[#0F6CBD] flex items-center px-2 gap-2"
      >
        {/* Waffle + Outlook */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            aria-label="App launcher"
            title="Microsoft 365"
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors"
          >
            <WaffleIcon />
          </button>
          <button
            onClick={() => router.push('/mail/inbox')}
            aria-label="Outlook"
            className="px-1.5 py-1 hover:bg-white/10 rounded transition-colors"
          >
            <span className="text-white text-sm font-semibold">Outlook</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 flex justify-start">
          <div className="relative w-full max-w-md">
            <form onSubmit={handleSearch} role="search">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#605E5C]"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search"
                  aria-label="Search"
                  className="w-full text-sm pl-9 pr-8 py-1.5 rounded bg-white text-[#323130] placeholder:text-[#A19F9D] border border-transparent focus:border-[#0078D4] outline-none transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={handleSearchClear}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-[#605E5C] hover:text-[#323130] hover:bg-[#F3F2F1] transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>
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