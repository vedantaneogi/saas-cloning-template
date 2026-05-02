'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell, HelpCircle, Check, X, UserPlus, Menu, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useMailStore } from '@/store/mail'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatMessageDate } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { messages, auth } from '@/lib/api'

export function TopToolbar() {
  const router = useRouter()
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
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBell])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      setSearchQuery(search.trim())
      router.push('/mail/search')
    }
  }

  const handleLogout = async () => {
    logout()
    router.push('/sign-in')
  }

  const handleSwitchAccount = (userId: string) => {
    switchAccount(userId)
    queryClient.clear()
    setShowUserMenu(false)
    router.push('/mail/inbox')
  }

  const handleRemoveAccount = (userId: string) => {
    removeAccount(userId)
    queryClient.clear()
    // If we removed the current user, auth store switches automatically; redirect if logged out
    const remaining = useAuthStore.getState().token
    if (!remaining) router.push('/sign-in')
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setAddPending(true)
    try {
      const result = await auth.login(addEmail.trim(), addPassword)
      addAccount(result.access_token, result.user)
      queryClient.clear()
      setShowAddAccount(false)
      setAddEmail('')
      setAddPassword('')
      setShowUserMenu(false)
      router.push('/mail/inbox')
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setAddPending(false)
    }
  }

  return (
    <header
      aria-label="Top toolbar"
      className="h-12 bg-[#0078D4] flex items-center px-2 gap-1 flex-shrink-0"
    >
      {/* Left: Hamburger + Outlook logo */}
      <div className="flex items-center gap-0 flex-shrink-0">
        <button
          aria-label="Toggle navigation"
          className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors"
        >
          <Menu size={20} />
        </button>
        <button
          onClick={() => router.push('/mail/inbox')}
          aria-label="Go to Outlook"
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            {/* Microsoft Outlook-style "O" logo */}
            <rect x="1" y="5" width="20" height="22" rx="2" fill="white" opacity="0.15"/>
            <rect x="1" y="5" width="20" height="22" rx="2" fill="#0078D4"/>
            <rect x="17" y="1" width="14" height="14" rx="2" fill="white" opacity="0.85"/>
            <rect x="17" y="17" width="14" height="14" rx="2" fill="white" opacity="0.65"/>
            <text x="3.5" y="21" fontSize="15" fontWeight="800" fill="white" fontFamily="Segoe UI, sans-serif">O</text>
          </svg>
        </button>
      </div>

      {/* Center: Search */}
      <form onSubmit={handleSearch} className="flex-1" role="search">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for email, meetings, files and more."
            aria-label="Search for email, meetings, files and more."
            className="w-full bg-white/20 hover:bg-white/30 focus:bg-white/30 text-white placeholder:text-white/70 text-sm pl-9 pr-4 py-1.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-white/50 transition-colors"
          />
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* Notification Bell */}
        <div className="relative" ref={bellRef}>
          <button
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={showBell}
            aria-haspopup="true"
            onClick={() => setShowBell((v) => !v)}
            className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors relative"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#D13438] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showBell && (
            <div
              role="dialog"
              aria-label="Notifications panel"
              className="absolute right-0 top-10 z-50 w-80 bg-white rounded shadow-outlook-lg border border-[#EDEBE9] animate-fade-in"
            >
              <div className="px-4 py-2.5 border-b border-[#EDEBE9] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#323130]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-[#605E5C]">{unreadCount} new</span>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[#605E5C]">
                  No new notifications
                </div>
              ) : (
                <ul className="max-h-80 overflow-y-auto outlook-scrollbar divide-y divide-[#EDEBE9]">
                  {notifications.map((msg) => (
                    <li key={msg.id}>
                      <button
                        onClick={() => {
                          router.push('/mail/inbox')
                          setShowBell(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#F3F2F1] transition-colors"
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-[#323130] truncate">
                            {msg.from_name || msg.from_address.split('@')[0]}
                          </span>
                          <span className="text-xs text-[#605E5C] flex-shrink-0">
                            {formatMessageDate(msg.received_at ?? msg.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-[#605E5C] truncate">
                          {msg.subject || '(no subject)'}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="px-4 py-2 border-t border-[#EDEBE9]">
                <button
                  onClick={() => { router.push('/mail/inbox'); setShowBell(false) }}
                  className="text-xs text-[#0078D4] hover:underline"
                >
                  View all mail
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          aria-label="Settings"
          onClick={() => router.push('/settings')}
          className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors"
        >
          <Settings size={18} />
        </button>
        <button
          aria-label="Help"
          className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors"
        >
          <HelpCircle size={18} />
        </button>

        {/* Account */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            aria-label={`Account manager for ${currentUser?.display_name ?? 'User'}`}
            aria-expanded={showUserMenu}
            aria-haspopup="menu"
            className="ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <Avatar
              name={currentUser?.display_name ?? 'U'}
              src={currentUser?.avatar_url}
              size="sm"
            />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => { setShowUserMenu(false); setShowAddAccount(false) }}
                aria-hidden="true"
              />
              <div
                role="menu"
                aria-label="Account manager"
                className="absolute right-0 top-10 z-50 w-72 bg-white rounded shadow-outlook-lg border border-[#EDEBE9] animate-fade-in"
              >
                {/* Accounts list */}
                <div className="border-b border-[#EDEBE9]">
                  {accounts.length > 0 ? accounts.map((acct) => {
                    const isCurrent = acct.user.id === currentUser?.id
                    return (
                      <div
                        key={acct.user.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 group',
                          isCurrent ? 'bg-[#EBF3FB]' : 'hover:bg-[#F3F2F1] cursor-pointer'
                        )}
                        onClick={() => !isCurrent && handleSwitchAccount(acct.user.id)}
                        role={isCurrent ? undefined : 'menuitem'}
                        aria-label={isCurrent ? undefined : `Switch to ${acct.user.display_name}`}
                      >
                        <Avatar name={acct.user.display_name} src={acct.user.avatar_url} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#323130] truncate flex items-center gap-1">
                            {acct.user.display_name}
                            {isCurrent && <Check size={12} className="text-[#0078D4] flex-shrink-0" />}
                          </p>
                          <p className="text-xs text-[#605E5C] truncate">{acct.user.email}</p>
                        </div>
                        {accounts.length > 1 && (
                          <button
                            role="menuitem"
                            aria-label={`Remove ${acct.user.display_name}`}
                            onClick={(e) => { e.stopPropagation(); handleRemoveAccount(acct.user.id) }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#EDEBE9] text-[#605E5C] hover:text-[#D13438] transition-colors flex-shrink-0"
                          >
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

                {/* Add account */}
                {!showAddAccount ? (
                  <button
                    role="menuitem"
                    onClick={() => setShowAddAccount(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#0078D4] hover:bg-[#F3F2F1] transition-colors"
                  >
                    <UserPlus size={14} />
                    Add another account
                  </button>
                ) : (
                  <form onSubmit={handleAddAccount} className="px-3 py-2 space-y-2 border-b border-[#EDEBE9]">
                    <p className="text-xs font-semibold text-[#323130]">Add account</p>
                    <input
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="Email"
                      autoFocus
                      required
                      className="w-full text-xs border border-[#EDEBE9] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                    />
                    <input
                      type="password"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full text-xs border border-[#EDEBE9] rounded px-2 py-1.5 focus:outline-none focus:border-[#0078D4]"
                    />
                    {addError && <p className="text-xs text-[#D13438]">{addError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={addPending}
                        className="flex-1 text-xs bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-50 text-white px-2 py-1.5 rounded transition-colors"
                      >
                        {addPending ? 'Signing in…' : 'Sign in'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddAccount(false); setAddError('') }}
                        className="text-xs text-[#605E5C] hover:bg-[#EDEBE9] px-2 py-1.5 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Sign out */}
                <div className="p-1">
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] rounded transition-colors"
                  >
                    Sign out of all accounts
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
