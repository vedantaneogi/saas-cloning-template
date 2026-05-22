import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'unread' | 'importance' | 'category' | 'default'
  color?: string
  className?: string
}

export function Badge({ children, variant = 'default', color, className }: BadgeProps) {
  const variants = {
    unread:
      'bg-[#0078D4] text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1',
    importance:
      'bg-[#D13438] text-white text-[10px] font-semibold rounded px-1 h-4 flex items-center',
    category:
      'text-white text-[10px] font-medium rounded px-1.5 h-4 flex items-center',
    default:
      'bg-[#F3F2F1] text-[#605E5C] text-xs rounded px-2 py-0.5',
  }

  return (
    <span
      className={cn(variants[variant], className)}
      style={variant === 'category' && color ? { backgroundColor: color } : undefined}
    >
      {children}
    </span>
  )
}
