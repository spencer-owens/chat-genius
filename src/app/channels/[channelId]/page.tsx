'use client'

import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { MessageThread } from '@/components/chat/MessageThread'
import { useMessages } from '@/hooks/useMessages'
import { useChannels } from '@/hooks/useChannels'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { NotificationBanner } from '@/components/shared/NotificationBanner'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { use } from 'react'
import { Layout } from '@/components/layout/Layout'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface PageProps {
  params: Promise<{ channelId: string }>
}

export default function ChannelPage({ params }: PageProps) {
  const { channelId } = use(params)
  const [selectedThread, setSelectedThread] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { messages, loading: messagesLoading, sendMessage } = useMessages(channelId)
  const { channels, loading: channelsLoading } = useChannels()
  const { markChannelAsRead } = useUnreadCounts()
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  // Mark channel as read when we navigate to it
  useEffect(() => {
    if (channelId && currentUser) {
      markChannelAsRead(channelId)
    }
  }, [channelId, currentUser, markChannelAsRead])

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
      
      await sendMessage(messageContent, fileMetadata)
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
    }
  }

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

        {/* Scrollable Message Area */}
        <div className="flex-1 min-h-0">
          {messagesLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <MessageList
              messages={messages}
              type="channel"
              onReaction={(messageId, emoji) => {
                // Handle reaction
              }}
              onThreadClick={(messageId) => {
                const message = messages.find(m => m.id === messageId)
                setSelectedThread(message)
              }}
            />
          )}
        </div>

        {/* Fixed Input Area */}
        <div className="flex-none p-4 border-t border-gray-700">
          <MessageInput
            onSend={handleSendMessage}
            channelId={channelId}
            placeholder={`Message #${channel.name}`}
          />
        </div>

        {/* Thread Overlay */}
        {selectedThread && (
          <MessageThread
            parentMessage={selectedThread}
            replies={[]}
            onClose={() => setSelectedThread(null)}
            onReply={(content) => console.log('Thread reply:', content)}
          />
        )}
      </div>
    </Layout>
  )
} 