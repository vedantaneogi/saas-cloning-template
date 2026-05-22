
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  // Optional left-side adornment (icon, swatch, etc.)
  icon?: React.ReactNode
}

export interface SelectGroup {
  label: string
  items: SelectOption[]
}

export interface SelectProps {
  value: string
  onChange: (value: string) => void
  /** Flat options. Use `groups` instead for grouped (optgroup-style) menus. */
  options?: SelectOption[]
  groups?: SelectGroup[]
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
  align?: 'left' | 'right'
}

/**
 * Outlook-style dropdown — replaces the browser-native <select>. Renders the
 * trigger inline and the menu via portal so it floats above any overflow
 * clipping. Keyboard support: Enter/Space toggles, ArrowUp/Down moves the
 * focused option, Esc closes.
 */
export function Select({
  value,
  onChange,
  options,
  groups,
  placeholder,
  disabled,
  className,
  size = 'md',
  ariaLabel,
  align = 'left',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Resolve to a flat list when looking up the current item.
  const flat = options ?? groups?.flatMap((g) => g.items) ?? []
  const current = flat.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    if (wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <>
      <button
        ref={wrapRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'flex items-center justify-between gap-2 border border-[#8A8886] bg-white text-[#323130] rounded transition-colors',
          'focus:outline-none focus:border-[#0078D4]',
          'hover:border-[#605E5C]',
          disabled && 'opacity-50 cursor-not-allowed bg-[#F3F2F1]',
          size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-2 py-1.5',
          className,
        )}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {current?.icon}
          <span className={cn('truncate', !current && 'text-[#A19F9D]')}>
            {current?.label ?? placeholder ?? 'Select'}
          </span>
        </span>
        <ChevronDown size={12} className="text-[#605E5C] flex-shrink-0" />
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            top: pos.top,
            left: align === 'right' ? undefined : pos.left,
            right: align === 'right' ? Math.max(8, window.innerWidth - (pos.left + pos.width)) : undefined,
            minWidth: pos.width,
          }}
          role="listbox"
          className="fixed z-[9999] bg-white border border-[#EDEBE9] rounded shadow-outlook-lg py-1 max-h-64 overflow-y-auto"
        >
          {(() => {
            const renderItem = (o: SelectOption) => {
              const selected = o.value === value
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 text-left px-3 py-1.5 hover:bg-[#F3F2F1] transition-colors',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                    selected ? 'text-[#0078D4]' : 'text-[#323130]',
                  )}
                >
                  {o.icon}
                  <span className="flex-1 truncate">{o.label}</span>
                  {selected && <Check size={12} className="text-[#0078D4] flex-shrink-0" />}
                </button>
              )
            }

            if (groups && groups.length > 0) {
              return groups.map((g) => (
                <div key={g.label} className="py-1 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[#EDEBE9]">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase text-[#605E5C] tracking-wide">
                    {g.label}
                  </p>
                  {g.items.map(renderItem)}
                </div>
              ))
            }

            const list = options ?? []
            if (list.length === 0) {
              return <p className="px-3 py-2 text-xs text-[#A19F9D] italic">No options</p>
            }
            return list.map(renderItem)
          })()}
        </div>,
        document.body,
      )}
    </>
  )
}
