import { useEffect } from 'react'
import { useChannelContext } from '@/contexts/ChannelContext'
import { Message } from '@/types/messages'

export function useChannelMessages(channelId: string | null) {
  const { messages, loading, error, sendMessage, subscribeToChannel, unsubscribeFromChannel } = useChannelContext()

  useEffect(() => {
    if (!channelId) return

    // Subscribe to channel messages
    subscribeToChannel(channelId)

    // Cleanup subscription when unmounting or changing channels
    return () => {
      unsubscribeFromChannel(channelId)
    }
  }, [channelId, subscribeToChannel, unsubscribeFromChannel])

  return {
    messages: channelId ? messages[channelId] || [] : [],
    loading,
    error,
    sendMessage: (content: string, fileMetadata?: { id: string; url: string; name: string; type: string; size: number }) => {
      if (!channelId) throw new Error('No channel selected')
      return sendMessage(channelId, content, fileMetadata)
    }
  }
} 