
import { usePathname, useRouter } from '@/lib/next-compat'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
}

// SVG icons matching real Outlook's Fluent-style colored icons (20x20)
function MailIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="1" y="4" width="18" height="12" rx="1.5" fill={active ? '#0078D4' : '#0F6CBD'} />
      <path d="M1 6L10 11.5L19 6" stroke="white" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="3" width="16" height="15" rx="1.5" fill={active ? '#0078D4' : '#0F6CBD'} />
      <rect x="2" y="3" width="16" height="4.5" rx="1.5" fill={active ? '#005A9E' : '#0A4A7A'} />
      <rect x="5" y="9.5" width="2.5" height="2" rx="0.4" fill="white" opacity="0.9" />
      <rect x="8.75" y="9.5" width="2.5" height="2" rx="0.4" fill="white" opacity="0.55" />
      <rect x="12.5" y="9.5" width="2.5" height="2" rx="0.4" fill="white" opacity="0.55" />
      <rect x="5" y="13" width="2.5" height="2" rx="0.4" fill="white" opacity="0.55" />
      <rect x="8.75" y="13" width="2.5" height="2" rx="0.4" fill="white" opacity="0.55" />
    </svg>
  )
}

function PeopleIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="8" cy="6.5" r="3" fill={active ? '#0078D4' : '#0F6CBD'} />
      <path d="M2 16.5c0-2.5 2.8-4.2 6-4.2s6 1.7 6 4.2" fill={active ? '#0078D4' : '#0F6CBD'} />
      <circle cx="15" cy="7.5" r="2" fill={active ? '#4DA3E0' : '#5CAEE0'} />
      <path d="M12.5 16.5c0-1.5 1-2.8 2.5-3.5 1-.4 2-.6 2.8-.6 1.2 0 2.2.8 2.2 2.5" fill={active ? '#4DA3E0' : '#5CAEE0'} />
    </svg>
  )
}

function TodoIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="16" height="16" rx="2.5" fill={active ? '#0078D4' : '#0F6CBD'} />
      <path d="M6 10.5L8.5 13L14 7.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GroupsIcon({ active }: { active: boolean }) {
  const color = active ? '#0078D4' : '#0F6CBD'
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="5.5" r="2.5" fill={color} />
      <circle cx="4.5" cy="7.5" r="1.8" fill={color} opacity="0.55" />
      <circle cx="15.5" cy="7.5" r="1.8" fill={color} opacity="0.55" />
      <path d="M6 16.5c0-2.2 1.8-4 4-4s4 1.8 4 4" fill={color} />
      <path d="M1 17c0-1.6 1.2-2.8 2.8-2.8.9 0 1.7.4 2.2 1" fill={color} opacity="0.45" />
      <path d="M19 17c0-1.6-1.2-2.8-2.8-2.8-.9 0-1.7.4-2.2 1" fill={color} opacity="0.45" />
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'mail',
    label: 'Mail',
    icon: <MailIcon active={false} />,
    href: '/mail/inbox',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: <CalendarIcon active={false} />,
    href: '/calendar/month',
  },
  {
    id: 'people',
    label: 'People',
    icon: <PeopleIcon active={false} />,
    href: '/contacts',
  },
  {
    id: 'tasks',
    label: 'To Do',
    icon: <TodoIcon active={false} />,
    href: '/tasks',
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: <GroupsIcon active={false} />,
    href: '/groups',
  },
]

const ACTIVE_ICONS: Record<string, React.ReactNode> = {
  mail: <MailIcon active />,
  calendar: <CalendarIcon active />,
  people: <PeopleIcon active />,
  tasks: <TodoIcon active />,
  groups: <GroupsIcon active />,
}

// ─── Add-in stubs ─────────────────────────────────────────────────────────────
// Senior asked for sidebar add-ins matching Outlook's "More apps" rail. Clicks
// are intentional no-ops — these are visual placeholders only.

function ZoomAddInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="1.5" y="5" width="13" height="10" rx="2" fill="#2D8CFF" />
      <path d="M14.5 8.5L18.5 6.2v7.6l-4-2.3z" fill="#2D8CFF" />
    </svg>
  )
}

function SalesforceAddInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M14 6.2c.6-.6 1.4-1 2.3-1 1.9 0 3.5 1.6 3.5 3.5 0 .4-.1.7-.2 1 .5.4.9 1 .9 1.7 0 1.2-1 2.2-2.2 2.2H5.2c-1.8 0-3.2-1.4-3.2-3.2 0-1.6 1.2-3 2.8-3.2.4-1.6 1.9-2.7 3.6-2.7 1 0 1.9.4 2.5 1 .8-1.1 2-1.8 3.5-1.8 1.7 0 3.1 1 3.7 2.4-.7.1-1.4.4-1.9 1z"
        fill="#00A1E0"
      />
    </svg>
  )
}

function AsanaAddInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="13.5" r="3" fill="#F06A6A" />
      <circle cx="5.5" cy="6.5" r="3" fill="#F06A6A" />
      <circle cx="14.5" cy="6.5" r="3" fill="#F06A6A" />
    </svg>
  )
}

const ADD_INS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'zoom', label: 'Zoom', icon: <ZoomAddInIcon /> },
  { id: 'salesforce', label: 'Salesforce', icon: <SalesforceAddInIcon /> },
  { id: 'asana', label: 'Asana', icon: <AsanaAddInIcon /> },
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
      aria-label="App navigation"
      className="w-[40px] flex-shrink-0 bg-[#F3F2F1] border-r border-[#EDEBE9] flex flex-col items-center py-1 gap-1"
    >
      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const active = getActive(item)
        return (
          <div key={item.id} className="relative w-full flex items-center justify-center">
            {/* Left blue accent bar for active item */}
            {active && (
              <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#0078D4] rounded-r" />
            )}
            <button
              onClick={() => router.push(item.href)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              title={item.label}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded transition-colors',
                active ? 'bg-[#EBF3FB]' : 'hover:bg-[#EDEBE9]'
              )}
            >
              {active ? ACTIVE_ICONS[item.id] : item.icon}
            </button>
          </div>
        )
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Add-ins — visual stubs (no nav target) */}
      <div className="w-full flex flex-col items-center gap-1 pb-1">
        <div className="w-6 h-px bg-[#D2D0CE] my-1" aria-hidden="true" />
        {ADD_INS.map((addIn) => (
          <button
            key={addIn.id}
            type="button"
            aria-label={`${addIn.label} add-in (preview)`}
            title={addIn.label}
            // Stub by senior request — click does nothing.
            onClick={(e) => e.preventDefault()}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#EDEBE9] transition-colors"
          >
            {addIn.icon}
          </button>
        ))}
      </div>
    </nav>
  )
}