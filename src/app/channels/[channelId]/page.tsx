'use client'

import { use } from 'react'
import { Layout } from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { ChannelMessage, Message } from '@/types/messages'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { useMessages } from '@/hooks/useMessages'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationBanner } from '@/components/shared/NotificationBanner'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { Status } from '@/types/status'
import { useChannels } from '@/hooks/useChannels'

interface PageProps {
  params: Promise<{ channelId: string }>
}

export default function ChannelPage({ params }: PageProps) {
  const { channelId } = use(params)
  const [error, setError] = useState<string | null>(null)
  const { messages, loading: messagesLoading, sendMessage } = useMessages(channelId)
  const { user: currentUser } = useAuth()
  const { markChannelAsRead } = useUnreadCounts()
  const { channels, loading: channelsLoading } = useChannels()
  const channel = channels?.find(c => c.id === channelId)

  useEffect(() => {
    if (channelId && currentUser) {
      markChannelAsRead(channelId)
    }
  }, [channelId, currentUser, markChannelAsRead])

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

  // Convert messages to ChannelMessage type
  const channelMessages = messages.map(m => ({
    ...m,
    type: 'channel' as const,
    channel_id: channelId,
    reply_count: 0, // Default value since we don't track this yet
    reactions: [], // Default value since we don't track this yet
    sender: {
      ...m.sender,
      status: m.sender.status as Status
    }
  })) as ChannelMessage[]

  const handleReaction = (messageId: string, emoji: string) => {
    // TODO: Implement reaction handling
    console.log('Reaction:', messageId, emoji)
  }

  const handleThreadClick = (messageId: string) => {
    // TODO: Implement thread handling
    console.log('Thread click:', messageId)
  }

  if (channelsLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col h-full">
      {error && (
        <NotificationBanner
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <MessageList
        messages={channelMessages}
        type="channel"
        onReaction={handleReaction}
        onThreadClick={handleThreadClick}
      />

      <MessageInput 
        onSend={handleSendMessage}
        channelId={channelId}
        placeholder={channel ? `Type a message in #${channel.name}` : 'Type a message...'}
      />
    </div>
  )
} 