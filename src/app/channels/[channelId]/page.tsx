'use client'

import MessageList from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { MessageThread } from '@/components/chat/MessageThread'
import { useChannelMessages } from '@/hooks/useChannelMessages'
import { useChannels } from '@/hooks/useChannels'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { NotificationBanner } from '@/components/shared/NotificationBanner'
import { Loader2 } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Database } from '@/types/supabase'
import { use } from 'react'
import { ChannelMessage } from '@/types/messages'

type Tables = Database['public']['Tables']
type DatabaseMessage = {
  id: string
  content: string
  sender_id: string
  channel_id: string
  thread_id: string | null
  created_at: string | null
  updated_at: string | null
  file_id: string | null
  reply_count: number | null
  sender: Tables['users']['Row']
  reactions: Tables['reactions']['Row'][]
  file_metadata?: {
    message_id: string
    bucket: string
    path: string
    name: string
    type: string
    size: string
  }
}

interface PageProps {
  params: Promise<{ channelId: string }>
}

export default function ChannelPage({ params }: PageProps) {
  const { channelId } = use(params)
  const [selectedThread, setSelectedThread] = useState<DatabaseMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { messages, loading: messagesLoading } = useChannelMessages(channelId)
  const { channels, loading: channelsLoading } = useChannels()
  const { markAsRead } = useUnreadCounts()
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  // Mark channel as read when we navigate to it
  useEffect(() => {
    if (channelId && currentUser) {
      markAsRead(channelId)
    }
  }, [channelId, currentUser, markAsRead])

  const channel = channels.find(c => c.id === channelId)

  if (channelsLoading || !channel) {
    return null
  }

  const handleSendMessage = async (
    content: string,
    fileMetadata?: { id: string; url: string; name: string; type: string; size: number }
  ) => {
    try {
      if (!currentUser) {
        setError('You must be logged in to send messages')
        return
      }

      // If we have a file but no content, use the file name as content
      const messageContent = content || (fileMetadata ? `Shared a file: ${fileMetadata.name}` : '')
      
      // TODO: Implement sendMessage through store
      // await sendMessage(messageContent, fileMetadata)
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
    }
  }

  // Transform the selected message to ChannelMessage type when needed for the thread
  const selectedChannelMessage = selectedThread ? {
    id: selectedThread.id,
    content: selectedThread.content,
    created_at: selectedThread.created_at || new Date().toISOString(),
    thread_id: selectedThread.thread_id || undefined,
    type: 'channel' as const,
    channel_id: channelId,
    sender: {
      id: selectedThread.sender_id,
      username: selectedThread.sender.username || '',
      status: selectedThread.sender.status || 'offline',
      profile_picture: selectedThread.sender.profile_picture || undefined
    },
    reactions: selectedThread.reactions.map(reaction => ({
      emoji: reaction.emoji,
      user_id: reaction.user_id
    })),
    reply_count: selectedThread.reply_count || 0,
    file: selectedThread.file_metadata ? {
      id: selectedThread.file_id!,
      url: supabase.storage.from(selectedThread.file_metadata.bucket).getPublicUrl(selectedThread.file_metadata.path).data.publicUrl,
      name: selectedThread.file_metadata.name,
      type: selectedThread.file_metadata.type,
      size: parseInt(selectedThread.file_metadata.size)
    } : undefined
  } : null

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-900">
        {/* Fixed Header */}
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

        {/* Error Banner - moved inside scrollable area but at the top */}
        {error && (
          <div className="flex-none px-4 py-2 bg-gray-900">
            <NotificationBanner
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              {messagesLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  channelId={channelId}
                  onUpdateLastRead={() => markAsRead(channelId)}
                />
              )}
            </div>

            {/* Fixed Input Area */}
            <div className="flex-none p-4 border-t border-gray-700 bg-gray-900">
              <MessageInput
                onSend={handleSendMessage}
                channelId={channelId}
                placeholder={`Message #${channel.name}`}
              />
            </div>
          </div>

          {/* Thread Panel */}
          {selectedChannelMessage && (
            <MessageThread
              parentMessage={selectedChannelMessage}
              onClose={() => setSelectedThread(null)}
            />
          )}
        </div>
      </div>
    </Layout>
  )
} 