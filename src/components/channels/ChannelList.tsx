import { Plus, Hash, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Channel {
  id: string
  name: string
  description: string
  is_private: boolean
}

interface ChannelListProps {
  channels: Channel[]
  currentChannelId?: string
  onChannelSelect: (channelId: string) => void
  onCreateChannel?: () => void
  isAdmin?: boolean
}

export function ChannelList({
  channels,
  currentChannelId,
  onChannelSelect,
  onCreateChannel,
  isAdmin
}: ChannelListProps) {
  return (
    <div className="space-y-2 px-2 py-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-sm font-semibold text-gray-200">Channels</h2>
        {isAdmin && onCreateChannel && (
          <button
            onClick={onCreateChannel}
            className="text-gray-400 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <div className="space-y-1">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onChannelSelect(channel.id)}
            className={cn(
              'w-full flex items-center px-2 py-1 text-sm rounded-md',
              currentChannelId === channel.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            {channel.is_private ? (
              <Lock className="h-4 w-4 mr-2" />
            ) : (
              <Hash className="h-4 w-4 mr-2" />
            )}
            {channel.name}
          </button>
        ))}
      </div>
    </div>
  )
} 