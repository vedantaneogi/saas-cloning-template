'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Mail,
  PenLine,
  GitBranch,
  Clock,
  Tag,
  Settings,
  User,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
}

const SETTINGS_SECTIONS: NavItem[] = [
  { id: 'general', label: 'General', href: '/settings/general', icon: <Settings size={16} /> },
  { id: 'accounts', label: 'Accounts', href: '/settings/accounts', icon: <User size={16} /> },
  { id: 'mail', label: 'Mail', href: '/settings/mail', icon: <Mail size={16} /> },
  { id: 'signatures', label: 'Signatures', href: '/settings/signatures', icon: <PenLine size={16} /> },
  { id: 'rules', label: 'Rules', href: '/settings/rules', icon: <GitBranch size={16} /> },
  { id: 'oof', label: 'Automatic replies', href: '/settings/oof', icon: <Clock size={16} /> },
  { id: 'categories', label: 'Categories', href: '/settings/categories', icon: <Tag size={16} /> },
]

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Settings navigation"
      className="w-56 flex-shrink-0 bg-[#F3F2F1] border-r border-[#EDEBE9] h-full overflow-y-auto outlook-scrollbar"
    >
      <div className="p-3">
        <h2 className="text-xs font-semibold text-[#605E5C] uppercase tracking-wide mb-2">
          Settings
        </h2>
      </div>
      <ul className="px-1 space-y-0.5">
        {SETTINGS_SECTIONS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors no-underline',
                  isActive
                    ? 'bg-[#EDEBE9] text-[#0078D4] font-medium'
                    : 'text-[#323130] hover:bg-[#EDEBE9]'
                )}
              >
                <span className={isActive ? 'text-[#0078D4]' : 'text-[#605E5C]'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
