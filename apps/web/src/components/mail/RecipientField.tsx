'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { contacts } from '@/lib/api'
import { cn } from '@/lib/utils'

interface RecipientFieldProps {
  label: string
  value: string[]
  onChange: (recipients: string[]) => void
  placeholder?: string
  id?: string
}

export function RecipientField({ label, value, onChange, placeholder, id }: RecipientFieldProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: suggestions = [] } = useQuery({
    queryKey: ['contacts-autocomplete', input],
    queryFn: () => contacts.autocomplete(input),
    enabled: input.length >= 2,
    staleTime: 5000,
  })

  const addRecipient = (address: string) => {
    const trimmed = address.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
    setDropdownOpen(false)
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
      setDropdownOpen(false)
    }
  }

  useEffect(() => {
    setDropdownOpen(input.length >= 2 && suggestions.length > 0)
  }, [input, suggestions])

  return (
    <div className="flex items-start gap-2 min-h-[32px]">
      <label
        htmlFor={id}
        className="text-sm text-[#605E5C] pt-1.5 w-8 flex-shrink-0 text-right"
      >
        {label}
      </label>
      <div
        className={cn(
          'flex-1 flex flex-wrap items-center gap-1 min-h-[32px] border-b transition-colors py-1',
          focused ? 'border-[#0078D4]' : 'border-[#EDEBE9]'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((recipient) => (
          <span
            key={recipient}
            className="inline-flex items-center gap-1 bg-[#EBF3FB] text-[#0078D4] text-xs px-2 py-0.5 rounded-full"
          >
            {recipient}
            <button
              type="button"
              onClick={() => removeRecipient(recipient)}
              aria-label={`Remove ${recipient}`}
              className="hover:text-[#005A9E] transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false)
              // Delay to allow click on suggestion
              setTimeout(() => setDropdownOpen(false), 150)
            }}
            placeholder={value.length === 0 ? placeholder : ''}
            aria-label={label}
            aria-autocomplete="list"
            aria-expanded={dropdownOpen}
            className="w-full text-sm text-[#323130] placeholder:text-[#A19F9D] focus:outline-none bg-transparent py-0.5"
          />
          {dropdownOpen && suggestions.length > 0 && (
            <ul
              role="listbox"
              aria-label={`${label} suggestions`}
              className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#EDEBE9] rounded shadow-outlook w-64 max-h-48 overflow-y-auto"
            >
              {suggestions.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      addRecipient(
                        contact.display_name
                          ? `${contact.display_name} <${contact.email}>`
                          : contact.email
                      )
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F3F2F1] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#0078D4] text-white flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                      {contact.display_name?.[0]?.toUpperCase() ?? contact.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{contact.display_name}</p>
                      <p className="text-xs text-[#605E5C] truncate">{contact.email}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
