'use client'

import { useState } from 'react'
import { X, Mail, PenLine, GitBranch, MessageSquareReply, Tag, Settings, Zap, Shield, Search } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'
import { SignatureSettings } from './SignatureSettings'
import { RuleSettings } from './RuleSettings'
import { OOFSettings } from './OOFSettings'
import { CategorySettings } from './CategorySettings'
import { GeneralSettings } from './GeneralSettings'
import { MailSettings } from './MailSettings'
import { QuickStepSettings } from './QuickStepSettings'
import { DelegateSettings } from './DelegateSettings'

interface SectionGroup {
  group: string
  items: { id: string; label: string; icon: React.ReactNode }[]
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    group: 'Account',
    items: [
      { id: 'general', label: 'General', icon: <Settings size={16} /> },
      { id: 'delegates', label: 'Delegates', icon: <Shield size={16} /> },
    ],
  },
  {
    group: 'Mail',
    items: [
      { id: 'mail', label: 'Layout', icon: <Mail size={16} /> },
      { id: 'signatures', label: 'Signatures', icon: <PenLine size={16} /> },
      { id: 'rules', label: 'Rules', icon: <GitBranch size={16} /> },
      { id: 'oof', label: 'Automatic replies', icon: <MessageSquareReply size={16} /> },
      { id: 'categories', label: 'Categories', icon: <Tag size={16} /> },
      { id: 'quick-steps', label: 'Quick Steps', icon: <Zap size={16} /> },
    ],
  },
]

const ALL_SECTIONS = SECTION_GROUPS.flatMap((g) => g.items)

function SectionContent({ section }: { section: string }) {
  switch (section) {
    case 'signatures': return <SignatureSettings />
    case 'rules': return <RuleSettings />
    case 'oof': return <OOFSettings />
    case 'categories': return <CategorySettings />
    case 'mail': return <MailSettings />
    case 'quick-steps': return <QuickStepSettings />
    case 'delegates': return <DelegateSettings />
    case 'general': default: return <GeneralSettings />
  }
}

export function SettingsModal() {
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const settingsSection = useUIStore((s) => s.settingsSection)
  const closeSettings = useUIStore((s) => s.closeSettings)
  const openSettings = useUIStore((s) => s.openSettings)
  const [search, setSearch] = useState('')

  if (!settingsOpen) return null

  const searchTerm = search.trim().toLowerCase()
  const filteredGroups = searchTerm
    ? SECTION_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((s) => s.label.toLowerCase().includes(searchTerm) || g.group.toLowerCase().includes(searchTerm)),
      })).filter((g) => g.items.length > 0)
    : SECTION_GROUPS

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) closeSettings() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="bg-white rounded-lg shadow-outlook-lg w-[800px] max-w-[90vw] h-[600px] max-h-[85vh] flex flex-col overflow-hidden animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDEBE9] flex-shrink-0">
          <h1 className="text-lg font-semibold text-[#323130]">Settings</h1>
          <button
            onClick={closeSettings}
            aria-label="Close settings"
            className="w-8 h-8 flex items-center justify-center text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="w-52 flex-shrink-0 border-r border-[#EDEBE9] flex flex-col overflow-hidden bg-[#FAF9F8]">
            <div className="px-3 pt-3 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2 border border-[#EDEBE9] rounded px-2 py-1.5 bg-white focus-within:border-[#0078D4]">
                <Search size={13} className="text-[#A19F9D] flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search settings"
                  aria-label="Search settings"
                  className="flex-1 text-xs text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent"
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto outlook-scrollbar py-1">
              {filteredGroups.map((group) => (
                <li key={group.group}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-[#0078D4] uppercase tracking-wide flex items-center gap-1.5">
                    {group.group}
                  </p>
                  <ul>
                    {group.items.map((item) => {
                      const isActive = settingsSection === item.id
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => openSettings(item.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                              'relative w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left',
                              isActive
                                ? 'text-[#0078D4] font-medium bg-[#EBF3FB]'
                                : 'text-[#323130] hover:bg-[#EDEBE9]',
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#0078D4] rounded-r" />
                            )}
                            <span className={isActive ? 'text-[#0078D4]' : 'text-[#605E5C]'}>{item.icon}</span>
                            {item.label}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto outlook-scrollbar">
            <SectionContent section={settingsSection} />
          </div>
        </div>
      </div>
    </div>
  )
}