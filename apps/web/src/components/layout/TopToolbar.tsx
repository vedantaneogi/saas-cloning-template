'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell, HelpCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useMailStore } from '@/store/mail'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatMessageDate } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { messages } from '@/lib/api'

export function TopToolbar() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const setSearchQuery = useMailStore((s) => s.setSearchQuery)
  const [search, setSearch] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showBell, setShowBell] = useState(false)
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

  return (
    <header
      aria-label="Top toolbar"
      className="h-12 bg-[#0078D4] flex items-center px-3 gap-2 flex-shrink-0"
    >
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl" role="search">
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
      <div className="flex items-center gap-1 ml-auto">
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
                onClick={() => setShowUserMenu(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                className="absolute right-0 top-10 z-50 w-64 bg-white rounded shadow-outlook-lg border border-[#EDEBE9] animate-fade-in"
              >
                <div className="p-4 border-b border-[#EDEBE9]">
                  <p className="font-semibold text-sm text-[#323130]">
                    {currentUser?.display_name}
                  </p>
                  <p className="text-xs text-[#605E5C]">{currentUser?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full text-left text-sm text-[#323130] px-3 py-2 hover:bg-[#F3F2F1] rounded transition-colors"
                  >
                    Sign out
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
