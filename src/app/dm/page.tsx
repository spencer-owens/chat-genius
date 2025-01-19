'use client'

import { useActiveConversations } from '@/hooks/useActiveConversations'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useUserPresence } from '@/hooks/useUserPresence'

export default function DMPage() {
  const { conversations, loading } = useActiveConversations()
  const { user: currentUser } = useAuth()
  const { getUserStatus } = useUserPresence()

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex-none p-6">
        <h1 className="text-2xl font-bold text-white">Recent Conversations</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-4">
          {conversations.map(({ user, lastMessage, unreadCount }) => (
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <h2 className="text-lg font-medium text-white">{user.username}</h2>
                      <Circle className={cn(
                        'ml-2 h-2 w-2',
                        getUserStatus(user.id) === 'online' ? 'text-green-500' : 
                        getUserStatus(user.id) === 'away' ? 'text-yellow-500' :
                        getUserStatus(user.id) === 'offline' ? 'text-gray-500' :
                        'text-red-500'
                      )} />
                    </div>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <div className="text-sm text-gray-400">
                      <span className="mr-2">{lastMessage.content}</span>
                      <span>{format(new Date(lastMessage.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
} 