
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contacts } from '@/lib/api'
import type { Contact } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { SpinnerOverlay } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Users, Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContactListProps {
  selectedId: string | null
  onSelect: (contact: Contact) => void
}

export function ContactList({ selectedId, onSelect }: ContactListProps) {
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => contacts.list({ search: search || undefined, per_page: 100 }),
    retry: 1,
  })

  const contactList = data?.items ?? []

  // Group by first letter
  const grouped = contactList.reduce<Record<string, Contact[]>>((acc, c) => {
    const letter = c.display_name[0]?.toUpperCase() ?? '#'
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(c)
    return acc
  }, {})

  const favorites = contactList.filter((c) => c.is_favorite)

  return (
    <div className="flex flex-col h-full border-r border-[#EDEBE9]">
      {/* Search */}
      <div className="p-3 border-b border-[#EDEBE9] flex-shrink-0">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#605E5C] pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts"
            aria-label="Search contacts"
            className="w-full bg-[#F3F2F1] border border-[#EDEBE9] text-sm text-[#323130] pl-8 pr-3 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:bg-white transition-colors placeholder:text-[#A19F9D]"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto outlook-scrollbar" role="list" aria-label="Contact list">
        {isLoading ? (
          <SpinnerOverlay />
        ) : isError ? (
          <EmptyState icon={Users} title="Failed to load contacts" description="Check your connection and refresh." />
        ) : contactList.length === 0 ? (
          <EmptyState icon={Users} title="No contacts" description="Your address book is empty." />
        ) : (
          <>
            {/* Favorites */}
            {favorites.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                  <Star size={12} className="text-[#FFB900] fill-[#FFB900]" />
                  <span className="text-xs font-semibold text-[#605E5C] uppercase tracking-wide">
                    Favorites
                  </span>
                </div>
                {favorites.map((contact) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    selected={selectedId === contact.id}
                    onSelect={onSelect}
                  />
                ))}
                <div className="h-px bg-[#EDEBE9] mx-3 my-2" />
              </div>
            )}

            {/* Alphabetical */}
            {Object.keys(grouped)
              .sort()
              .map((letter) => (
                <div key={letter}>
                  <div className="px-3 pt-2 pb-0.5">
                    <span className="text-xs font-semibold text-[#605E5C]">{letter}</span>
                  </div>
                  {grouped[letter].map((contact) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      selected={selectedId === contact.id}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  )
}

function ContactRow({
  contact,
  selected,
  onSelect,
}: {
  contact: Contact
  selected: boolean
  onSelect: (c: Contact) => void
}) {
  return (
    <button
      role="listitem"
      data-testid="contact-item"
      aria-selected={selected}
      onClick={() => onSelect(contact)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
        selected ? 'bg-[#EBF3FB]' : 'hover:bg-[#F3F2F1]'
      )}
    >
      <Avatar name={contact.display_name} src={contact.avatar_url} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#323130] truncate">{contact.display_name}</p>
        <p className="text-xs text-[#605E5C] truncate">{contact.email}</p>
      </div>
      {contact.is_favorite && (
        <Star size={12} className="text-[#FFB900] fill-[#FFB900] flex-shrink-0 ml-auto" />
      )}
    </button>
  )
}
