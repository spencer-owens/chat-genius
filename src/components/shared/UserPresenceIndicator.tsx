import { cn } from '@/lib/utils'
import { Status } from '@/types/status'
import useStore from '@/store'

interface UserPresenceIndicatorProps {
  userId: string
  className?: string
  showLabel?: boolean
}

const statusColors: Record<Status, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500'
}

export function UserPresenceIndicator({ 
  userId,
  className,
  showLabel = true
}: UserPresenceIndicatorProps) {
  const { userPresence } = useStore()
  const status = userPresence[userId] || 'offline'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'h-2.5 w-2.5 rounded-full',
        statusColors[status]
      )} />
      {showLabel && (
        <span className="text-sm text-gray-500 capitalize">{status}</span>
      )}
    </div>
  )
} 