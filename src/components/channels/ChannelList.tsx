import { Plus, Hash, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import useStore from '@/store'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type Channel = Tables['channels']['Row'] & {
  memberships: Array<{
    user_id: string
    is_admin: boolean
  }>
}

interface ChannelListProps {
  currentChannelId?: string
  onChannelSelect: (channelId: string) => void
  onCreateChannel?: () => void
}

export function ChannelList({
  currentChannelId,
  onChannelSelect,
  onCreateChannel
}: ChannelListProps) {
  const { channels, currentUser } = useStore()
  const isAdmin = channels.find(c => c.id === currentChannelId)?.memberships.some(
    m => m.user_id === currentUser?.id && m.is_admin
  )

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