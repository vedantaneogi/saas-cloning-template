'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Mail,
  PenLine,
  GitBranch,
  MessageSquareReply,
  Tag,
  Settings,
  User,
  Zap,
  Shield,
  Search,
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
  { id: 'oof', label: 'Automatic replies', href: '/settings/oof', icon: <MessageSquareReply size={16} /> },
  { id: 'categories', label: 'Categories', href: '/settings/categories', icon: <Tag size={16} /> },
  { id: 'quick-steps', label: 'Quick Steps', href: '/settings/quick-steps', icon: <Zap size={16} /> },
  { id: 'delegates', label: 'Delegates', href: '/settings/delegates', icon: <Shield size={16} /> },
]

export function SettingsSidebar() {
  const pathname = usePathname()
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? SETTINGS_SECTIONS.filter((s) => s.label.toLowerCase().includes(search.toLowerCase()))
    : SETTINGS_SECTIONS

  return (
    <nav
      aria-label="Settings navigation"
      className="w-56 flex-shrink-0 bg-white border-r border-[#EDEBE9] h-full flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h2 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest mb-3">
          Settings
        </h2>
        {/* Search */}
        <div className="flex items-center gap-2 border border-[#EDEBE9] rounded px-2 py-1.5 bg-[#FAF9F8] focus-within:border-[#0078D4] focus-within:ring-1 focus-within:ring-[#0078D4]">
          <Search size={13} className="text-[#A19F9D] flex-shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search settings"
            aria-label="Search settings"
            className="flex-1 text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Nav items */}
      <ul className="flex-1 overflow-y-auto outlook-scrollbar py-1" role="list">
        {filtered.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors no-underline',
                  isActive
                    ? 'text-[#0078D4] font-medium bg-[#EBF3FB]'
                    : 'text-[#323130] hover:bg-[#F3F2F1]'
                )}
              >
                {/* Blue left accent bar */}
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#0078D4] rounded-r" />
                )}
                <span className={isActive ? 'text-[#0078D4]' : 'text-[#605E5C]'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-3 text-sm text-[#A19F9D]">No results</li>
        )}
      </ul>
    </nav>
  )
}
