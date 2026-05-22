import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full border rounded px-3 py-1.5 text-sm text-[#323130] bg-white',
          'placeholder:text-[#A19F9D]',
          'focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-[#0078D4]',
          'disabled:bg-[#F3F2F1] disabled:text-[#A19F9D] disabled:cursor-not-allowed',
          'transition-colors',
          error ? 'border-[#D13438]' : 'border-[#8A8886]',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
