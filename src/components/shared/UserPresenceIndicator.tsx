import { cn } from '@/lib/utils'

type Status = 'online' | 'offline' | 'away' | 'busy'

interface UserPresenceIndicatorProps {
  status: Status
  className?: string
}

const statusColors: Record<Status, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500'
}

export function UserPresenceIndicator({ 
  status, 
  className 
}: UserPresenceIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'h-2.5 w-2.5 rounded-full',
        statusColors[status]
      )} />
      <span className="text-sm text-gray-500 capitalize">{status}</span>
    </div>
  )
} 