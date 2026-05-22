import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-1.5 font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none'

    const variants: Record<Variant, string> = {
      primary:
        'bg-[#0078D4] text-white hover:bg-[#106EBE] active:bg-[#005A9E]',
      secondary:
        'bg-white text-[#323130] border border-[#8A8886] hover:bg-[#F3F2F1] active:bg-[#EDEBE9]',
      ghost:
        'bg-transparent text-[#323130] hover:bg-[#F3F2F1] active:bg-[#EDEBE9]',
      danger:
        'bg-[#D13438] text-white hover:bg-[#A4262C] active:bg-[#8A1015]',
    }

    const sizes: Record<Size, string> = {
      sm: 'text-xs px-2 py-1 h-6',
      md: 'text-sm px-3 py-1.5 h-8',
      lg: 'text-sm px-4 py-2 h-9',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-3 w-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
