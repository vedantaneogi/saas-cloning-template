
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contacts } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { useUIStore } from '@/store/ui'
import { Mail, UserPlus } from 'lucide-react'

interface EmailLinkProps {
  email: string
  name?: string | null
}

export function EmailLink({ email, name }: EmailLinkProps) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const openComposer = useUIStore((s) => s.openComposer)

  const { data: contactList } = useQuery({
    queryKey: ['contact-lookup', email],
    queryFn: () => contacts.autocomplete(email),
    enabled: show,
    staleTime: 60000,
  })

  const contact = contactList?.[0]

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setPos({ x: rect.left, y: rect.bottom + 6 })
      }
      setShow(true)
    }, 400)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    // Delay hide so user can move to card
    timerRef.current = setTimeout(() => setShow(false), 150)
  }

  const handleCardEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const handleCardLeave = () => {
    setShow(false)
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const displayName = name || email

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            setPos({ x: rect.left, y: rect.bottom + 6 })
          }
          setShow((v) => !v)
        }}
        className="text-[#0078D4] hover:underline cursor-pointer"
        title={email}
      >
        {displayName}
      </span>
      {show && (
        <div
          ref={cardRef}
          className="fixed z-[9999] w-64 bg-white border border-[#EDEBE9] rounded shadow-outlook-lg p-3 animate-fade-in"
          style={{ left: pos.x, top: pos.y }}
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleCardLeave}
        >
          <div className="flex items-center gap-3 mb-2">
            <Avatar name={contact?.display_name ?? displayName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#323130] truncate">
                {contact?.display_name ?? displayName}
              </p>
              <p className="text-xs text-[#605E5C] truncate">{email}</p>
            </div>
          </div>
          {contact && (contact.job_title || contact.company || contact.phone) && (
            <div className="space-y-0.5 mb-2 pb-2 border-b border-[#EDEBE9]">
              {contact.job_title && (
                <p className="text-xs text-[#605E5C] truncate">{contact.job_title}</p>
              )}
              {contact.company && (
                <p className="text-xs text-[#605E5C] truncate">{contact.company}</p>
              )}
              {contact.phone && (
                <p className="text-xs text-[#605E5C] truncate">{contact.phone}</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => {
                const addr = name ? `${name} <${email}>` : email
                openComposer({ to: [addr] })
                setShow(false)
              }}
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
      )}
    </>
  )
}
