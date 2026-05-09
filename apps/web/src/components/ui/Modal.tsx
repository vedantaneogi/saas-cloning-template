'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  children: React.ReactNode
  className?: string
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  // 2xl bumps to ~1152px — used by the EventModal so the form + Find-a-time
  // right-rail aren't squeezed against the mini-day sidebar.
  '2xl': 'max-w-6xl',
  full: 'max-w-[90vw] max-h-[90vh]',
}

export function Modal({ open, onClose, title, size = 'md', children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      {/* Panel — max-h-[90vh] caps height for any size so the inner overflow-auto
          scrolls instead of the page when content is tall (e.g. EventModal with
          scheduling assistant expanded). */}
      <div
        className={cn(
          'relative bg-white rounded shadow-outlook-lg w-full flex flex-col max-h-[90vh]',
          sizes[size],
          size === 'full' && 'h-[90vh]',
          'animate-fade-in',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE9]">
            <h2 className="text-base font-semibold text-[#323130]">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1 rounded hover:bg-[#F3F2F1] text-[#605E5C] hover:text-[#323130] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
