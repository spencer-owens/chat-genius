'use client'

import { Layout } from '@/components/layout/Layout'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useDirectMessages } from '@/hooks/useDirectMessages'
import { useUsers } from '@/hooks/useUsers'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationBanner } from '@/components/shared/NotificationBanner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Loader2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { use } from 'react'

interface PageProps {
  params: Promise<{ userId: string }>
}

export default function DMPage({ params }: PageProps) {
  const { userId } = use(params)
  const [error, setError] = useState<string | null>(null)
  const { messages, loading: messagesLoading } = useDirectMessages(userId)
  const { users, loading: usersLoading } = useUsers()
  const { user: currentUser } = useCurrentUser()
  const otherUser = users.find(u => u.id === userId)
  const supabase = createClient()

  if (usersLoading || !otherUser) {
    return null
  }

  const handleSendMessage = async (content: string) => {
    try {
      if (!currentUser) {
        setError('You must be logged in to send messages')
        return
      }

      const { error: sendError } = await supabase
        .from('direct_messages')
        .insert([{
          content,
          sender_id: currentUser.id,
          receiver_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (sendError) {
        console.error('Error sending message:', sendError)
        throw new Error(sendError.message)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {error && (
        <NotificationBanner
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="flex-none p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {otherUser.profile_picture ? (
              <img
                src={otherUser.profile_picture}
                alt={otherUser.username}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-white">{otherUser.username[0]}</span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-medium text-white">
                {otherUser.username}
              </h2>
              <Circle className={cn(
                'h-2 w-2',
                otherUser.status === 'online' ? 'text-green-500' : 'text-gray-500'
              )} />
            </div>
            <p className="text-sm text-gray-400">
              {otherUser.status || 'offline'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {messagesLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <MessageList
            messages={messages}
            type="dm"
          />
        )}
      </div>

      <div className="flex-none p-4 border-t border-gray-700">
        <MessageInput
          onSend={handleSendMessage}
          onFileUpload={() => {}}
          placeholder={`Message ${otherUser.username}`}
        />
      </div>
    </div>
  )
} 