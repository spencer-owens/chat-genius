import { UserPresenceIndicator } from '../shared/UserPresenceIndicator'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  username: string
  status: 'online' | 'offline' | 'away' | 'busy'
  profile_picture?: string
}

interface DirectMessageListProps {
  users: User[]
  currentUserId?: string
  onUserSelect: (userId: string) => void
}

export function DirectMessageList({
  users,
  currentUserId,
  onUserSelect
}: DirectMessageListProps) {
  return (
    <div className="space-y-2 px-2 py-4">
      <div className="px-2">
        <h2 className="text-sm font-semibold text-gray-200">Direct Messages</h2>
      </div>
      
      <div className="space-y-1">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => onUserSelect(user.id)}
            className={cn(
              'w-full flex items-center px-2 py-1 text-sm rounded-md',
              currentUserId === user.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <div className="flex-shrink-0 mr-2">
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.username}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-xs text-white">{user.username[0]}</span>
                </div>
              )}
            </div>
            <span className="flex-1 truncate">{user.username}</span>
            <UserPresenceIndicator status={user.status} className="ml-2" />
          </button>
        ))}
      </div>
    </div>
  )
} 