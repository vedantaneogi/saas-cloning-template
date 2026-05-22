import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

// Deterministic color from name
function nameToColor(name: string): string {
  const colors = [
    '#0078D4', '#106EBE', '#005A9E',
    '#107C10', '#005A00', '#498205',
    '#8764B8', '#5C2D91', '#881798',
    '#C239B3', '#B4009E',
    '#D13438', '#A4262C',
    '#FF8C00', '#CA5010',
    '#038387', '#00B7C3',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  const bgColor = nameToColor(name)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizes[size], className)}
      />
    )
  }

  return (
    <div
      aria-label={name}
      className={cn(
        'rounded-full flex items-center justify-center font-medium text-white flex-shrink-0 select-none',
        sizes[size],
        className
      )}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  )
}
