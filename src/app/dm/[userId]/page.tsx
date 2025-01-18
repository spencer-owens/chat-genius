'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import MessageList from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { Loader2 } from 'lucide-react'

export default function DMPage() {
  const params = useParams()
  const userId = params.userId as string
  const { currentUser, loading, sendMessage, messagesByChannel } = useStore()
  const [otherUser, setOtherUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        return
      }

      setOtherUser(data)
      setLoadingUser(false)
    }

    fetchUser()
  }, [userId])

  const handleSendMessage = async (
    content: string,
    fileMetadata?: { id: string; url: string; name: string; type: string; size: number }
  ) => {
    await sendMessage(content, userId, fileMetadata)
  }

  if (loading || loadingUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Please sign in to view messages</p>
      </div>
    )
  }

  if (!otherUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">User not found</p>
      </div>
    )
  }

  const messages = messagesByChannel[userId] || []

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none sticky top-0 z-10 bg-gray-900 p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {otherUser.profile_picture ? (
              <img
                src={otherUser.profile_picture}
                alt={otherUser.username}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-lg text-white">
                  {otherUser.username[0].toUpperCase()}
                </span>
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-gray-900 ${
                otherUser.status === 'online'
                  ? 'bg-green-400'
                  : otherUser.status === 'away'
                  ? 'bg-yellow-400'
                  : otherUser.status === 'busy'
                  ? 'bg-red-400'
                  : 'bg-gray-400'
              }`}
            />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">
              {otherUser.username}
            </h2>
            <p className="text-sm text-gray-400">
              {otherUser.status.charAt(0).toUpperCase() + otherUser.status.slice(1)}
            </p>
          </div>
        </div>
      </div>
      <MessageList channelId={userId} messages={messages} />
      <MessageInput channelId={userId} onSend={handleSendMessage} />
    </div>
  )
} 