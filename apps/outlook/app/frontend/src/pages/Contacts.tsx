
import { useState } from 'react'
import type { Contact } from '@/lib/api'
import { ContactList } from '@/components/contacts/ContactList'
import { ContactCard } from '@/components/contacts/ContactCard'
import { ContactForm } from '@/components/contacts/ContactForm'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Users, UserPlus } from 'lucide-react'

export function Contacts() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [newContactOpen, setNewContactOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)

  return (
    <div data-testid="contacts-page" className="h-full flex overflow-hidden">
      {/* Left: Contact list (40%) */}
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-[#EDEBE9]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE9] bg-white">
          <h1 className="text-sm font-semibold text-[#323130]">People</h1>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setNewContactOpen(true)}
            aria-label="New contact"
          >
            <UserPlus size={14} />
            New contact
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ContactList
            selectedId={selectedContact?.id ?? null}
            onSelect={setSelectedContact}
          />
        </div>
      </div>

      {/* Right: Contact detail */}
      <div className="flex-1 overflow-hidden">
        {selectedContact ? (
          <ContactCard
            contact={selectedContact}
            onEdit={() => setEditContact(selectedContact)}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-[#FAF9F8]">
            <EmptyState
              icon={Users}
              title="Select a contact"
              description="Choose a contact from the list to view details."
              action={
                <Button onClick={() => setNewContactOpen(true)}>
                  <UserPlus size={14} />
                  New contact
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* New contact modal */}
      <Modal
        open={newContactOpen}
        onClose={() => setNewContactOpen(false)}
        title="New contact"
        size="md"
      >
        <ContactForm
          onSuccess={() => setNewContactOpen(false)}
          onCancel={() => setNewContactOpen(false)}
        />
      </Modal>

      {/* Edit contact modal */}
      <Modal
        open={!!editContact}
        onClose={() => setEditContact(null)}
        title="Edit contact"
        size="md"
      >
        {editContact && (
          <ContactForm
            contact={editContact}
            onSuccess={() => {
              setEditContact(null)
              setSelectedContact(null)
            }}
            onCancel={() => setEditContact(null)}
          />
        )}
      </Modal>
    </div>
  )
}
