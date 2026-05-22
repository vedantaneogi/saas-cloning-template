
import { useState } from 'react'
import { X, User, Settings, Mail, CalendarDays, Users, Search } from 'lucide-react'
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

// ─── 3-column layout matching Outlook ────────────────────────────────────────
// Left: section icons (Account, General, Mail, Calendar, People)
// Middle: sub-items for selected section
// Right: content for selected sub-item

interface Section {
  id: string
  label: string
  icon: React.ReactNode
  subItems: { id: string; label: string }[]
}

const SECTIONS: Section[] = [
  {
    id: 'account',
    label: 'Account',
    icon: <User size={18} />,
    subItems: [
      { id: 'email-account', label: 'Email account' },
      { id: 'oof', label: 'Automatic replies' },
      { id: 'signatures', label: 'Signatures' },
      { id: 'categories', label: 'Categories' },
      { id: 'storage', label: 'Storage' },
    ],
  },
  {
    id: 'general',
    label: 'General',
    icon: <Settings size={18} />,
    subItems: [
      { id: 'general', label: 'General' },
      { id: 'delegates', label: 'Delegates' },
    ],
  },
  {
    id: 'mail',
    label: 'Mail',
    icon: <Mail size={18} />,
    subItems: [
      { id: 'mail', label: 'Layout' },
      { id: 'rules', label: 'Rules' },
      { id: 'quick-steps', label: 'Quick Steps' },
    ],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: <CalendarDays size={18} />,
    subItems: [
      { id: 'calendar-general', label: 'Calendar' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    icon: <Users size={18} />,
    subItems: [
      { id: 'people-general', label: 'People' },
    ],
  },
]

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

  // Determine which left-section is active based on the selected sub-item
  const activeSection = SECTIONS.find((s) => s.subItems.some((sub) => sub.id === settingsSection)) ?? SECTIONS[0]
  const [selectedSectionId, setSelectedSectionId] = useState(activeSection.id)
  const displaySection = SECTIONS.find((s) => s.id === selectedSectionId) ?? SECTIONS[0]

  if (!settingsOpen) return null

  // Filter sub-items by search
  const searchTerm = search.trim().toLowerCase()
  const filteredSubItems = searchTerm
    ? SECTIONS.flatMap((s) => s.subItems).filter((sub) => sub.label.toLowerCase().includes(searchTerm))
    : displaySection.subItems

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) closeSettings() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="bg-white rounded-lg shadow-outlook-lg w-[960px] max-w-[94vw] h-[640px] max-h-[88vh] flex flex-col overflow-hidden animate-fade-in"
      >
        {/* Header — title + close. Lives outside the 3-column body so the
            X doesn't collide with section toolbars (e.g. the "+ New rule"
            button on the Rules page). */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#EDEBE9] flex-shrink-0">
          <h1 className="text-sm font-semibold text-[#323130]">Settings</h1>
          <button
            onClick={closeSettings}
            aria-label="Close settings"
            className="w-8 h-8 flex items-center justify-center text-[#605E5C] hover:bg-[#F3F2F1] rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — 3 columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left column — section icons */}
          <nav className="w-[72px] flex-shrink-0 border-r border-[#EDEBE9] flex flex-col bg-[#FAF9F8]">
            <div className="px-2 pt-3 pb-2 flex-shrink-0">
              <div className="flex items-center gap-1 border border-[#EDEBE9] rounded px-1.5 py-1 bg-white focus-within:border-[#0078D4]">
                <Search size={11} className="text-[#A19F9D] flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  aria-label="Search settings"
                  className="w-full text-[10px] text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent"
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto outlook-scrollbar">
              {SECTIONS.map((section) => {
                const isActive = selectedSectionId === section.id
                return (
                  <li key={section.id}>
                    <button
                      onClick={() => {
                        setSelectedSectionId(section.id)
                        // Auto-select first sub-item
                        if (section.subItems.length > 0) {
                          openSettings(section.subItems[0].id)
                        }
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'relative w-full flex flex-col items-center gap-0.5 px-1 py-2.5 transition-colors',
                        isActive
                          ? 'text-[#0078D4] bg-[#EBF3FB]'
                          : 'text-[#605E5C] hover:bg-[#EDEBE9]',
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#0078D4] rounded-r" />
                      )}
                      <span>{section.icon}</span>
                      <span className="text-[9px] leading-tight">{section.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Middle column — sub-items */}
          <nav className="w-[170px] flex-shrink-0 border-r border-[#EDEBE9] flex flex-col bg-white overflow-y-auto outlook-scrollbar">
            {filteredSubItems.map((sub) => {
              const isActive = settingsSection === sub.id
              return (
                <button
                  key={sub.id}
                  onClick={() => openSettings(sub.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative w-full text-left text-sm px-4 py-2.5 transition-colors border-l-[3px]',
                    isActive
                      ? 'text-[#0078D4] font-medium bg-[#EBF3FB] border-l-[#0078D4]'
                      : 'text-[#323130] hover:bg-[#F3F2F1] border-l-transparent',
                  )}
                >
                  {sub.label}
                </button>
              )
            })}
          </nav>

          {/* Right column — content */}
          <div className="flex-1 overflow-y-auto outlook-scrollbar">
            <SectionContent section={settingsSection} />
          </div>
        </div>
      </div>
    </div>
  )
}