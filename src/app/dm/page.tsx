'use client'

import { useUsers } from '@/hooks/useUsers'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import Link from 'next/link'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useDirectMessages } from '@/hooks/useDirectMessages'

export default function DMPage() {
  const { users } = useUsers()
  const { user: currentUser } = useCurrentUser()
  const otherUsers = users.filter(u => u.id !== currentUser?.id)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-8">Recent Conversations</h1>
      
      <div className="space-y-4">
        {otherUsers.map((user) => (
          <Link
            key={user.id}
            href={`/dm/${user.id}`}
            className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.username}
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-600 flex items-center justify-center">
                    <span className="text-white text-lg">{user.username[0]}</span>
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center">
                  <h2 className="text-lg font-medium text-white">{user.username}</h2>
                  <Circle className={cn(
                    'ml-2 h-2 w-2',
                    user.status === 'online' ? 'text-green-500' : 'text-gray-500'
                  )} />
                </div>
                <MessagePreview userId={user.id} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function MessagePreview({ userId }: { userId: string }) {
  const { messages, loading } = useDirectMessages(userId)
  const lastMessage = messages[messages.length - 1]

  if (loading || !lastMessage) {
    return <p className="text-sm text-gray-400">No messages yet</p>
  }

  return (
    <div className="text-sm text-gray-400">
      <span className="mr-2">{lastMessage.content}</span>
      <span>{format(new Date(lastMessage.created_at), 'MMM d, h:mm a')}</span>
    </div>
  )
} 