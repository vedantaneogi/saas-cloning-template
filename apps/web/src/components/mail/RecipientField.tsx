'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Mail, UserPlus } from 'lucide-react'
import { contacts } from '@/lib/api'
import type { Contact } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'

interface RecipientFieldProps {
  label: string
  value: string[]
  onChange: (recipients: string[]) => void
  placeholder?: string
  id?: string
}

// Pulls "alice@x.com" out of either bare emails or "Name <alice@x.com>" formatted strings.
function extractEmail(addr: string): string {
  const match = addr.match(/<([^>]+)>/)
  return (match ? match[1] : addr).trim()
}

function extractName(addr: string): string {
  const match = addr.match(/^(.+?)\s*<[^>]+>/)
  return match ? match[1].trim() : ''
}

interface ChipPopoverProps {
  recipient: string
  anchor: { x: number; y: number }
  onClose: () => void
}

function ChipPopover({ recipient, anchor, onClose }: ChipPopoverProps) {
  const email = extractEmail(recipient)
  const name = extractName(recipient)
  const openComposer = useUIStore((s) => s.openComposer)
  const cardRef = useRef<HTMLDivElement>(null)

  const { data: matches } = useQuery({
    queryKey: ['contact-lookup', email],
    queryFn: () => contacts.autocomplete(email),
    staleTime: 60000,
  })
  const contact = matches?.[0]

  // Click-outside dismiss
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [onClose])

  const displayName = contact?.display_name || name || email

  return (
    <div
      ref={cardRef}
      className="fixed z-[9999] w-64 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg p-3 animate-fade-in"
      style={{ left: anchor.x, top: anchor.y }}
      role="dialog"
      aria-label={`Contact card for ${displayName}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Avatar name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#323130] truncate">{displayName}</p>
          <p className="text-xs text-[#605E5C] truncate">{email}</p>
        </div>
      </div>
      {contact && (contact.job_title || contact.company || contact.phone) && (
        <div className="space-y-0.5 mb-2 pb-2 border-b border-[#EDEBE9]">
          {contact.job_title && <p className="text-xs text-[#605E5C] truncate">{contact.job_title}</p>}
          {contact.company && <p className="text-xs text-[#605E5C] truncate">{contact.company}</p>}
          {contact.phone && <p className="text-xs text-[#605E5C] truncate">{contact.phone}</p>}
        </div>
      )}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => { openComposer({ to: [recipient] }); onClose() }}
          className="flex items-center gap-1 text-xs text-[#0078D4] hover:underline"
        >
          <Mail size={11} /> Send email
        </button>
        {!contact && (
          <span className="flex items-center gap-1 text-xs text-[#A19F9D]">
            <UserPlus size={11} /> Not in contacts
          </span>
        )}
      </div>
    </div>
  )
}

export function RecipientField({ label, value, onChange, placeholder, id }: RecipientFieldProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<Contact[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch suggestions on input change
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return }
    try {
      const results = await contacts.autocomplete(q)
      setSuggestions(results)
    } catch {
      setSuggestions([])
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(input), 200)
    return () => clearTimeout(timer)
  }, [input, fetchSuggestions])

  const addRecipient = (address: string) => {
    const trimmed = address.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const removeRecipient = (address: string) => {
    onChange(value.filter((v) => v !== address))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') && input.trim()) {
      e.preventDefault()
      addRecipient(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeRecipient(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setSuggestions([])
    }
  }

  const showDropdown = focused && input.length >= 2 && suggestions.length > 0

  // Chip click → contact card popover (Outlook behaviour). Anchor coords are
  // captured on the click and dismissed via outside-click in ChipPopover.
  const [chipPopover, setChipPopover] = useState<{ recipient: string; x: number; y: number } | null>(null)

  return (
    <div className="flex items-start gap-2 min-h-[32px]">
      {label && (
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="text-sm text-[#605E5C] hover:bg-[#F3F2F1] rounded px-2 py-1 flex-shrink-0 transition-colors"
          aria-label={`Add ${label.toLowerCase()} recipients`}
        >
          {label}
        </button>
      )}
      <div
        className={cn(
          'flex-1 flex flex-wrap items-center gap-1 min-h-[32px] py-1 border-b transition-colors',
          focused ? 'border-[#0078D4]' : 'border-[#E1DFDD]'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((recipient) => {
          const displayLabel = extractName(recipient) || extractEmail(recipient)
          return (
            <span
              key={recipient}
              className="inline-flex items-center gap-1 bg-[#EBF3FB] text-[#0078D4] text-xs px-2 py-0.5 rounded-full hover:bg-[#C7E0F4] transition-colors"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setChipPopover({ recipient, x: rect.left, y: rect.bottom + 4 })
                }}
                className="text-left truncate max-w-[200px]"
                title={recipient}
                aria-label={`Open contact card for ${displayLabel}`}
              >
                {displayLabel}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeRecipient(recipient) }}
                aria-label={`Remove ${recipient}`}
                className="hover:text-[#005A9E] transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          )
        })}
        <div className="relative flex-1 min-w-[120px]" ref={wrapperRef}>
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (blurTimeout.current) clearTimeout(blurTimeout.current)
              setFocused(true)
            }}
            onBlur={() => {
              blurTimeout.current = setTimeout(() => {
                setFocused(false)
                if (input.trim() && suggestions.length === 0) {
                  addRecipient(input)
                }
              }, 250)
            }}
            placeholder={value.length === 0 ? placeholder : ''}
            aria-label={label || 'Recipients'}
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            className="w-full text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent py-0.5"
          />
          {showDropdown && (
            <ul
              role="listbox"
              aria-label={`${label} suggestions`}
              className="fixed z-[200] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg w-80 max-h-72 overflow-y-auto"
              style={{
                top: (wrapperRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                left: wrapperRef.current?.getBoundingClientRect().left ?? 0,
              }}
            >
              {suggestions.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      if (blurTimeout.current) clearTimeout(blurTimeout.current)
                      addRecipient(
                        contact.display_name
                          ? `${contact.display_name} <${contact.email}>`
                          : contact.email
                      )
                    }}
                    className="w-full text-left flex items-start gap-3 px-3 py-2.5 hover:bg-[#F3F2F1] transition-colors"
                  >
                    <Avatar name={contact.display_name || contact.email} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#323130]">{contact.display_name}</p>
                      <p className="text-xs text-[#605E5C] truncate">{contact.email}</p>
                      {(contact.job_title || contact.company) && (
                        <p className="text-[11px] text-[#8A8886] truncate mt-0.5">
                          {contact.job_title}
                          {contact.job_title && contact.company ? ' · ' : ''}
                          {contact.company}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {chipPopover && (
        <ChipPopover
          recipient={chipPopover.recipient}
          anchor={{ x: chipPopover.x, y: chipPopover.y }}
          onClose={() => setChipPopover(null)}
        />
      )}
    </div>
  )
}