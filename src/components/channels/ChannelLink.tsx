import { Hash, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ChannelLinkProps {
  channel: {
    id: string
    name: string
    is_private: boolean
  }
  isActive: boolean
  unreadCount?: number
}

export function ChannelLink({ channel, isActive, unreadCount }: ChannelLinkProps) {
  return (
    <Link
      href={`/channels/${channel.id}`}
      className={cn(
        'flex items-center px-2 py-1 text-sm rounded-md',
        isActive
          ? 'bg-gray-800 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      )}
    >
      {channel.is_private ? (
        <Lock className="h-4 w-4 mr-2" />
      ) : (
        <Hash className="h-4 w-4 mr-2" />
      )}
      <span className="flex-1">{channel.name}</span>
      {unreadCount > 0 && (
        <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
          {unreadCount}
        </span>
      )}
    </Link>
  )
} 