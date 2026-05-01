'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Mail, Calendar, Users, CheckSquare, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'mail', label: 'Mail', icon: <Mail size={20} />, href: '/mail/inbox' },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} />, href: '/calendar/month' },
  { id: 'people', label: 'People', icon: <Users size={20} />, href: '/contacts' },
  { id: 'tasks', label: 'To Do', icon: <CheckSquare size={20} />, href: '/tasks' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const getActive = (item: NavItem) => {
    if (item.id === 'mail') return pathname.startsWith('/mail')
    if (item.id === 'calendar') return pathname.startsWith('/calendar')
    if (item.id === 'people') return pathname.startsWith('/contacts')
    if (item.id === 'tasks') return pathname.startsWith('/tasks')
    return false
  }

  return (
    <nav
      aria-label="left-rail-appbar"
      className="w-12 flex-shrink-0 bg-[#1B1A19] flex flex-col items-center py-1 gap-0.5"
    >
      {/* App logo */}
      <button
        onClick={() => router.push('/mail/inbox')}
        aria-label="Go to Outlook"
        className="w-10 h-10 flex items-center justify-center mb-1 hover:bg-white/10 rounded transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="28" height="28" x="2" y="10" rx="3" fill="#0078D4"/>
          <rect width="16" height="16" x="30" y="2" rx="2" fill="#50E6FF" opacity="0.9"/>
          <rect width="16" height="16" x="30" y="30" rx="2" fill="#50E6FF" opacity="0.7"/>
          <text x="6" y="33" fontSize="20" fontWeight="bold" fill="white" fontFamily="sans-serif">O</text>
        </svg>
      </button>

      {NAV_ITEMS.map((item) => {
        const active = getActive(item)
        return (
          <button
            key={item.id}
            onClick={() => router.push(item.href)}
            aria-label={item.label}
            title={item.label}
            className={cn(
              'w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded transition-colors text-[#C8C6C4]',
              active
                ? 'bg-white/15 text-white'
                : 'hover:bg-white/10 hover:text-white'
            )}
          >
            <div className={cn(active && 'text-[#50E6FF]')}>{item.icon}</div>
            <span className="text-[9px] leading-none">{item.label}</span>
          </button>
        )
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <button
        onClick={() => router.push('/settings')}
        aria-label="Settings"
        title="Settings"
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded transition-colors text-[#C8C6C4]',
          pathname.startsWith('/settings') ? 'bg-white/15 text-white' : 'hover:bg-white/10 hover:text-white'
        )}
      >
        <Settings size={20} />
      </button>
    </nav>
  )
}
