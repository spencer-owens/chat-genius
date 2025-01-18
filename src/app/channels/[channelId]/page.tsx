'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import MessageList from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { Loader2 } from 'lucide-react'

export default function ChannelPage() {
  const params = useParams()
  const channelId = params.channelId as string
  const { currentUser, loading, sendMessage, messagesByChannel } = useStore()
  const [channel, setChannel] = useState<any>(null)
  const [loadingChannel, setLoadingChannel] = useState(true)

  useEffect(() => {
    const fetchChannel = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('channels')
        .select(`
          *,
          memberships(
            user_id,
            is_admin
          )
        `)
        .eq('id', channelId)
        .single()

      if (error) {
        console.error('Error fetching channel:', error)
        return
      }

      setChannel(data)
      setLoadingChannel(false)
    }

    fetchChannel()
  }, [channelId])

  const handleSendMessage = async (
    content: string,
    fileMetadata?: { id: string; url: string; name: string; type: string; size: number }
  ) => {
    await sendMessage(content, channelId, fileMetadata)
  }

  if (loading || loadingChannel) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Please sign in to view this channel</p>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Channel not found</p>
      </div>
    )
  }

  const messages = messagesByChannel[channelId] || []

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none sticky top-0 z-10 bg-gray-900 p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div>
            <h2 className="text-lg font-medium text-white">
              #{channel.name}
            </h2>
            {channel.description && (
              <p className="text-sm text-gray-400">
                {channel.description}
              </p>
            )}
          </div>
        </div>
      </div>
      <MessageList channelId={channelId} messages={messages} />
      <MessageInput channelId={channelId} onSend={handleSendMessage} />
    </div>
  )
} 