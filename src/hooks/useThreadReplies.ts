import { useEffect } from 'react'
import { useChannelContext } from '@/contexts/ChannelContext'
import { Message } from '@/types/messages'

export function useThreadReplies(threadId: string) {
  const { threadMessages, loading, error, sendMessage, subscribeToThread, unsubscribeFromThread } = useChannelContext()

  useEffect(() => {
    if (!threadId) return

    // Subscribe to thread replies
    subscribeToThread(threadId)

    // Cleanup subscription when unmounting or changing threads
    return () => {
      unsubscribeFromThread(threadId)
    }
  }, [threadId, subscribeToThread, unsubscribeFromThread])

  const sendReply = async (content: string, channelId: string, fileMetadata?: { id: string; url: string; name: string; type: string; size: number }) => {
    return sendMessage(channelId, content, fileMetadata, threadId)
  }

  return {
    replies: threadMessages[threadId] || [],
    loading,
    error,
    sendReply
  }
} 