'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Mail, Calendar, Users, CheckSquare, UsersRound, Cloud, StickyNote, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  color: string
  activeColor: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'mail',
    label: 'Mail',
    icon: <Mail size={20} />,
    href: '/mail/inbox',
    color: '#0F6CBD',
    activeColor: '#0078D4',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: <Calendar size={20} />,
    href: '/calendar/month',
    color: '#0F6CBD',
    activeColor: '#0078D4',
  },
  {
    id: 'people',
    label: 'People',
    icon: <Users size={20} />,
    href: '/contacts',
    color: '#0F6CBD',
    activeColor: '#0078D4',
  },
  {
    id: 'tasks',
    label: 'To Do',
    icon: <CheckSquare size={20} />,
    href: '/tasks',
    color: '#2563EB',
    activeColor: '#0078D4',
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: <UsersRound size={20} />,
    href: '/groups',
    color: '#0F6CBD',
    activeColor: '#0078D4',
  },
  {
    id: 'onedrive',
    label: 'OneDrive',
    icon: <Cloud size={20} />,
    href: '/settings',
    color: '#1565C0',
    activeColor: '#0078D4',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <StickyNote size={20} />,
    href: '/settings',
    color: '#1565C0',
    activeColor: '#0078D4',
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const getActive = (item: NavItem) => {
    if (item.id === 'mail') return pathname.startsWith('/mail')
    if (item.id === 'calendar') return pathname.startsWith('/calendar')
    if (item.id === 'people') return pathname.startsWith('/contacts')
    if (item.id === 'tasks') return pathname.startsWith('/tasks')
    if (item.id === 'groups') return pathname.startsWith('/groups')
    return false
  }

  return (
    <nav
      aria-label="left-rail-appbar"
      className="w-12 flex-shrink-0 bg-[#FAF9F8] border-r border-[#EDEBE9] flex flex-col items-center pt-1 pb-2 gap-0.5"
    >
      {NAV_ITEMS.map((item) => {
        const active = getActive(item)
        return (
          <div key={item.id} className="relative w-full flex items-center justify-center">
            {/* Left blue accent bar for active item */}
            {active && (
              <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#0078D4] rounded-r" />
            )}
            <button
              onClick={() => router.push(item.href)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              title={item.label}
              style={{
                color: active ? item.activeColor : item.color,
              }}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded transition-colors',
                active ? 'bg-[#EBF3FB]' : 'hover:bg-[#EFF6FC]'
              )}
            >
              {item.icon}
            </button>
          </div>
        )
      })}

      {/* Spacer */}
      <div className="flex-1" />
    </nav>
  )
}
