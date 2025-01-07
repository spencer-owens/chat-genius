import { useState } from 'react'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type NotificationType = 'success' | 'error' | 'info'

interface NotificationBannerProps {
  type: NotificationType
  message: string
  onClose?: () => void
  className?: string
}

const notificationStyles: Record<NotificationType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500'
}

const notificationIcons: Record<NotificationType, typeof AlertCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info
}

export function NotificationBanner({
  type,
  message,
  onClose,
  className
}: NotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const Icon = notificationIcons[type]

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  return (
    <div
      className={cn(
        'fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-lg text-white',
        notificationStyles[type],
        className
      )}
    >
      <div className="flex items-start">
        <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
        <p className="flex-1 text-sm">{message}</p>
        {onClose && (
          <button
            onClick={handleClose}
            className="ml-4 flex-shrink-0 hover:opacity-75"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
} 