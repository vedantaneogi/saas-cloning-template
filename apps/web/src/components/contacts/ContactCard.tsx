'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Contact } from '@/lib/api'
import { contacts } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/ui'
import { Mail, Phone, Building2, MapPin, Star, Edit2, Trash2, FileText } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ContactCardProps {
  contact: Contact
  onEdit?: () => void
}

const CONTACT_TABS = ['Overview', 'Contact', 'Files', 'Messages'] as const
type ContactTab = (typeof CONTACT_TABS)[number]

export function ContactCard({ contact, onEdit }: ContactCardProps) {
  const queryClient = useQueryClient()
  const openComposer = useUIStore((s) => s.openComposer)
  const [activeTab, setActiveTab] = useState<ContactTab>('Contact')

  const favoriteMutation = useMutation({
    mutationFn: () => contacts.update(contact.id, { is_favorite: !contact.is_favorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => contacts.delete(contact.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  })

  return (
    <div className="flex flex-col h-full overflow-y-auto outlook-scrollbar" data-testid="contact-detail" aria-label={`Contact details for ${contact.display_name}`}>
      {/* Header */}
      <div className="flex items-start gap-4 p-6 border-b border-[#EDEBE9]">
        <Avatar name={contact.display_name} src={contact.avatar_url} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[#323130] truncate">
              {contact.display_name}
            </h2>
            <button
              onClick={() => favoriteMutation.mutate()}
              aria-label={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              className="text-[#605E5C] hover:text-[#FFB900] transition-colors"
            >
              <Star
                size={16}
                className={contact.is_favorite ? 'text-[#FFB900] fill-[#FFB900]' : ''}
              />
            </button>
          </div>
          {contact.job_title && (
            <p className="text-sm text-[#605E5C]">{contact.job_title}</p>
          )}
          {contact.company && (
            <p className="text-sm text-[#605E5C]">{contact.company}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label="Edit contact"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            aria-label="Delete contact"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-6 py-3 border-b border-[#EDEBE9]">
        <Button
          size="sm"
          onClick={() =>
            openComposer({
              to: [`${contact.display_name} <${contact.email}>`],
            })
          }
          aria-label={`Email ${contact.display_name}`}
        >
          <Mail size={13} />
          Email
        </Button>
      </div>

      {/* Tabs — matching Outlook: Overview / Contact / Files / Messages */}
      <div className="flex border-b border-[#EDEBE9] px-6" role="tablist">
        {CONTACT_TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-2 text-sm transition-colors relative',
              activeTab === tab
                ? 'text-[#0078D4] font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#0078D4]'
                : 'text-[#605E5C] hover:text-[#323130] hover:bg-[#F3F2F1]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <div className="p-6">
          <p className="text-sm text-[#323130] mb-3">{contact.display_name}</p>
          {contact.email && (
            <div className="flex items-center gap-2 mb-2">
              <Mail size={14} className="text-[#605E5C]" />
              <a href={`mailto:${contact.email}`} className="text-sm text-[#0078D4] hover:underline">{contact.email}</a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 mb-2">
              <Phone size={14} className="text-[#605E5C]" />
              <span className="text-sm text-[#323130]">{contact.phone}</span>
            </div>
          )}
          {contact.company && (
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-[#605E5C]" />
              <span className="text-sm text-[#323130]">{contact.company}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Contact' && (
      <div className="p-6 space-y-4">
        {/* Email */}
        <div className="flex items-start gap-3">
          <Mail size={16} className="text-[#605E5C] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-[#605E5C] mb-0.5">Email</p>
            <a
              href={`mailto:${contact.email}`}
              className="text-sm text-[#0078D4] hover:underline"
              aria-label={`Email ${contact.email}`}
            >
              {contact.email}
            </a>
          </div>
        </div>

        {/* Phone */}
        {contact.phone && (
          <div className="flex items-start gap-3">
            <Phone size={16} className="text-[#605E5C] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[#605E5C] mb-0.5">Phone</p>
              <a
                href={`tel:${contact.phone}`}
                className="text-sm text-[#323130] hover:text-[#0078D4] transition-colors"
              >
                {contact.phone}
              </a>
            </div>
          </div>
        )}

        {/* Company */}
        {contact.company && (
          <div className="flex items-start gap-3">
            <Building2 size={16} className="text-[#605E5C] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[#605E5C] mb-0.5">Company</p>
              <p className="text-sm text-[#323130]">{contact.company}</p>
            </div>
          </div>
        )}

        {/* Address */}
        {contact.address && (
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-[#605E5C] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[#605E5C] mb-0.5">Address</p>
              <p className="text-sm text-[#323130]">
                {[
                  contact.address.street,
                  contact.address.city,
                  contact.address.state,
                  contact.address.zip,
                  contact.address.country,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div>
            <p className="text-xs text-[#605E5C] mb-1">Notes</p>
            <p className="text-sm text-[#323130] whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}
      </div>
      )}

      {activeTab === 'Files' && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-[#605E5C]" />
            <p className="text-sm text-[#605E5C]">Files shared with {contact.display_name}</p>
          </div>
          <p className="text-sm text-[#A19F9D] text-center py-8">No shared files</p>
        </div>
      )}

      {activeTab === 'Messages' && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} className="text-[#605E5C]" />
            <p className="text-sm text-[#605E5C]">Recent messages with {contact.display_name}</p>
          </div>
          <p className="text-sm text-[#A19F9D] text-center py-8">Search your mailbox for messages from {contact.email}</p>
        </div>
      )}
    </div>
  )
}
