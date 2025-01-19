'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Message, ChannelMessage } from '@/types/messages'

interface ChannelContextType {
  messages: Record<string, ChannelMessage[]>
  threadMessages: Record<string, ChannelMessage[]>
  loading: boolean
  error: Error | null
  sendMessage: (channelId: string, content: string, fileMetadata?: any, threadId?: string) => Promise<void>
  subscribeToChannel: (channelId: string) => Promise<void>
  unsubscribeFromChannel: (channelId: string) => void
  subscribeToThread: (threadId: string) => Promise<void>
  unsubscribeFromThread: (threadId: string) => void
}

const ChannelContext = createContext<ChannelContextType | null>(null)

// Debug helper
const logWithTime = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] Channel: ${message}`, data || '')
}

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Record<string, ChannelMessage[]>>({})
  const [threadMessages, setThreadMessages] = useState<Record<string, ChannelMessage[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user: currentUser } = useAuth()
  const messagesRef = useRef<Record<string, ChannelMessage[]>>({})
  const threadMessagesRef = useRef<Record<string, ChannelMessage[]>>({})
  const activeSubscriptions = useRef<Record<string, any>>({})

  // Update refs whenever messages change
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    threadMessagesRef.current = threadMessages
  }, [threadMessages])

  // Deduplicate messages
  const deduplicateMessages = (messages: ChannelMessage[]) => {
    const seen = new Set()
    return messages.filter(msg => {
      if (seen.has(msg.id)) return false
      seen.add(msg.id)
      return true
    })
  }

  // Helper function to format a message with all necessary data
  const formatMessage = useCallback(async (messageData: any): Promise<ChannelMessage> => {
    // Get thread count if this is a parent message
    let replyCount = 0
    if (!messageData.thread_id) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', messageData.id)

      replyCount = count || 0
    }

    return {
      ...messageData,
      type: 'channel' as const,
      reactions: messageData.reactions || [],
      reply_count: replyCount,
      file: messageData.file ? {
        ...messageData.file,
        url: supabase.storage.from('public-documents').getPublicUrl(messageData.file.path).data.publicUrl
      } : undefined
    }
  }, [])

  // Send message function
  const sendMessage = useCallback(async (channelId: string, content: string, fileMetadata?: any, threadId?: string) => {
    if (!currentUser) {
      throw new Error('Must be logged in to send messages')
    }

    // Create optimistic message
    const optimisticId = `temp-${Date.now()}`
    const newMessage = {
      id: optimisticId,
      content,
      channel_id: channelId,
      thread_id: threadId,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      type: 'channel' as const,
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        status: currentUser.status,
        profile_picture: currentUser.profile_picture
      },
      reactions: [],
      reply_count: 0,
      file: fileMetadata
    }

    // Add optimistic message to appropriate state
    if (threadId) {
      setThreadMessages(prev => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), newMessage]
      }))

      // Update parent message's reply count
      const parentMessage = messagesRef.current[channelId]?.find(msg => msg.id === threadId)
      if (parentMessage) {
        setMessages(prev => ({
          ...prev,
          [channelId]: prev[channelId].map(msg =>
            msg.id === threadId ? { ...msg, reply_count: msg.reply_count + 1 } : msg
          )
        }))
      }
    } else {
      setMessages(prev => ({
        ...prev,
        [channelId]: [...(prev[channelId] || []), newMessage]
      }))
    }

    try {
      // Send the message
      const { data, error: sendError } = await supabase
        .from('messages')
        .insert([{
          content,
          channel_id: channelId,
          thread_id: threadId,
          sender_id: currentUser.id,
          file_id: fileMetadata?.id
        }])
        .select(`
          *,
          sender:users!sender_id(
            id,
            username,
            status,
            profile_picture
          ),
          reactions(*),
          file:file_metadata(
            id,
            name,
            type,
            size,
            path
          )
        `)
        .single()

      if (sendError) throw sendError

      // Format and update the message
      const formattedMessage = await formatMessage(data)

      if (threadId) {
        setThreadMessages(prev => ({
          ...prev,
          [threadId]: prev[threadId].map(msg =>
            msg.id === optimisticId ? formattedMessage : msg
          )
        }))
      } else {
        setMessages(prev => ({
          ...prev,
          [channelId]: prev[channelId].map(msg =>
            msg.id === optimisticId ? formattedMessage : msg
          )
        }))
      }
    } catch (error) {
      // Remove optimistic message and revert reply count
      if (threadId) {
        setThreadMessages(prev => ({
          ...prev,
          [threadId]: prev[threadId].filter(msg => msg.id !== optimisticId)
        }))
        
        const parentMessage = messagesRef.current[channelId]?.find(msg => msg.id === threadId)
        if (parentMessage) {
          setMessages(prev => ({
            ...prev,
            [channelId]: prev[channelId].map(msg =>
              msg.id === threadId ? { ...msg, reply_count: Math.max(0, msg.reply_count - 1) } : msg
            )
          }))
        }
      } else {
        setMessages(prev => ({
          ...prev,
          [channelId]: prev[channelId].filter(msg => msg.id !== optimisticId)
        }))
      }
      toast.error('Failed to send message. Please try again.')
      throw error
    }
  }, [currentUser, formatMessage])

  // Update the message fetching in subscribeToChannel to use formatMessage
  const fetchAndFormatMessages = useCallback(async (messages: any[]) => {
    const formattedMessages = await Promise.all(
      messages.map(msg => formatMessage(msg))
    )
    return formattedMessages
  }, [formatMessage])

  // Subscribe to messages in a channel
  const subscribeToChannel = useCallback(async (channelId: string) => {
    if (!currentUser || activeSubscriptions.current[`channel:${channelId}`]) return

    logWithTime('Subscribing to channel', { channelId })

    try {
      // Fetch existing messages with thread counts
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(
            id,
            username,
            status,
            profile_picture
          ),
          reactions(*),
          file:file_metadata(
            id,
            name,
            type,
            size,
            path
          ),
          thread_messages:messages!thread_id(count)
        `)
        .eq('channel_id', channelId)
        .is('thread_id', null)
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedMessages = data.map(msg => ({
        ...msg,
        type: 'channel' as const,
        reactions: msg.reactions || [],
        reply_count: msg.thread_messages?.[0]?.count || 0,
        file: msg.file ? {
          ...msg.file,
          url: supabase.storage.from('public-documents').getPublicUrl(msg.file.path).data.publicUrl
        } : undefined
      }))

      setMessages(prev => ({
        ...prev,
        [channelId]: formattedMessages
      }))

      // Set up subscription for main channel messages
      const channelName = `channel:${channelId}`
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${channelId} and thread_id=is.null`
          },
          async (payload: any) => {
            logWithTime('Received message event', { type: payload.eventType, payload })

            switch (payload.eventType) {
              case 'INSERT': {
                const newMessage = payload.new

                // Don't process if we already have this message
                if (messagesRef.current[channelId]?.some(msg => msg.id === newMessage.id)) {
                  return
                }

                // Fetch the complete message with thread count
                const { data: messageData, error: messageError } = await supabase
                  .from('messages')
                  .select(`
                    *,
                    sender:users!sender_id(
                      id,
                      username,
                      status,
                      profile_picture
                    ),
                    reactions(*),
                    file:file_metadata(
                      id,
                      name,
                      type,
                      size,
                      path
                    ),
                    thread_messages:messages!thread_id(count)
                  `)
                  .eq('id', newMessage.id)
                  .single()

                if (messageError) {
                  console.error('Error fetching complete message:', messageError)
                  return
                }

                const formattedMessage = {
                  ...messageData,
                  type: 'channel' as const,
                  reactions: messageData.reactions || [],
                  reply_count: messageData.thread_messages?.[0]?.count || 0,
                  file: messageData.file ? {
                    ...messageData.file,
                    url: supabase.storage.from('public-documents').getPublicUrl(messageData.file.path).data.publicUrl
                  } : undefined
                }

                setMessages(prev => ({
                  ...prev,
                  [channelId]: [...(prev[channelId] || []), formattedMessage]
                }))
                break
              }
              case 'UPDATE': {
                const updatedMessage = payload.new
                setMessages(prev => ({
                  ...prev,
                  [channelId]: prev[channelId].map(msg =>
                    msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
                  )
                }))
                break
              }
              case 'DELETE': {
                const deletedMessage = payload.old
                setMessages(prev => ({
                  ...prev,
                  [channelId]: prev[channelId].filter(msg => msg.id !== deletedMessage.id)
                }))
                break
              }
            }
          }
        )
        // Subscribe to thread message changes to update reply counts
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${channelId} and thread_id=not.is.null`
          },
          async (payload: any) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              const threadId = payload.new?.thread_id || payload.old?.thread_id
              if (!threadId) return

              // Get updated thread count
              const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', threadId)

              // Update parent message's reply count
              setMessages(prev => ({
                ...prev,
                [channelId]: prev[channelId].map(msg =>
                  msg.id === threadId ? { ...msg, reply_count: count || 0 } : msg
                )
              }))
            }
          }
        )
        .subscribe()

      activeSubscriptions.current[`channel:${channelId}`] = channel
    } catch (error) {
      console.error('Error subscribing to channel:', error)
      setError(error as Error)
    }
  }, [currentUser])

  // Subscribe to messages in a thread
  const subscribeToThread = useCallback(async (threadId: string) => {
    if (!currentUser || activeSubscriptions.current[`thread:${threadId}`]) return

    logWithTime('Subscribing to thread', { threadId })

    try {
      // Fetch existing thread messages
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(
            id,
            username,
            status,
            profile_picture
          ),
          reactions(*),
          file:file_metadata(
            id,
            name,
            type,
            size,
            path
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedMessages = data.map(msg => ({
        ...msg,
        type: 'channel' as const,
        reactions: msg.reactions || [],
        reply_count: 0,
        file: msg.file ? {
          ...msg.file,
          url: supabase.storage.from('public-documents').getPublicUrl(msg.file.path).data.publicUrl
        } : undefined
      }))

      setThreadMessages(prev => ({
        ...prev,
        [threadId]: formattedMessages
      }))

      // Set up subscription
      const channelName = `thread:${threadId}`
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `thread_id=eq.${threadId}`
          },
          async (payload: any) => {
            switch (payload.eventType) {
              case 'INSERT': {
                const newMessage = payload.new

                // Don't process if we already have this message
                if (threadMessagesRef.current[threadId]?.some(msg => msg.id === newMessage.id)) {
                  return
                }

                // Fetch the complete message
                const { data: messageData, error: messageError } = await supabase
                  .from('messages')
                  .select(`
                    *,
                    sender:users!sender_id(
                      id,
                      username,
                      status,
                      profile_picture
                    ),
                    reactions(*),
                    file:file_metadata(
                      id,
                      name,
                      type,
                      size,
                      path
                    )
                  `)
                  .eq('id', newMessage.id)
                  .single()

                if (messageError) {
                  console.error('Error fetching complete message:', messageError)
                  return
                }

                const formattedMessage = {
                  ...messageData,
                  type: 'channel' as const,
                  reactions: messageData.reactions || [],
                  reply_count: 0,
                  file: messageData.file ? {
                    ...messageData.file,
                    url: supabase.storage.from('public-documents').getPublicUrl(messageData.file.path).data.publicUrl
                  } : undefined
                }

                setThreadMessages(prev => ({
                  ...prev,
                  [threadId]: [...(prev[threadId] || []), formattedMessage]
                }))
                break
              }
              case 'UPDATE': {
                const updatedMessage = payload.new
                setThreadMessages(prev => ({
                  ...prev,
                  [threadId]: prev[threadId].map(msg =>
                    msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
                  )
                }))
                break
              }
              case 'DELETE': {
                const deletedMessage = payload.old
                setThreadMessages(prev => ({
                  ...prev,
                  [threadId]: prev[threadId].filter(msg => msg.id !== deletedMessage.id)
                }))
                break
              }
            }
          }
        )
        .subscribe()

      activeSubscriptions.current[`thread:${threadId}`] = channel
    } catch (error) {
      console.error('Error subscribing to thread:', error)
      setError(error as Error)
    }
  }, [currentUser])

  // Unsubscribe functions
  const unsubscribeFromChannel = useCallback((channelId: string) => {
    const subscription = activeSubscriptions.current[`channel:${channelId}`]
    if (subscription) {
      supabase.removeChannel(subscription)
      delete activeSubscriptions.current[`channel:${channelId}`]
    }
  }, [])

  const unsubscribeFromThread = useCallback((threadId: string) => {
    const subscription = activeSubscriptions.current[`thread:${threadId}`]
    if (subscription) {
      supabase.removeChannel(subscription)
      delete activeSubscriptions.current[`thread:${threadId}`]
    }
  }, [])

  // Cleanup subscriptions when component unmounts
  useEffect(() => {
    return () => {
      Object.values(activeSubscriptions.current).forEach(channel => {
        supabase.removeChannel(channel)
      })
      activeSubscriptions.current = {}
    }
  }, [])

  // Reset state when user changes
  useEffect(() => {
    if (!currentUser) {
      setMessages({})
      setThreadMessages({})
      setLoading(false)
      return
    }

    setLoading(false)
  }, [currentUser])

  return (
    <ChannelContext.Provider value={{
      messages,
      threadMessages,
      loading,
      error,
      sendMessage,
      subscribeToChannel,
      unsubscribeFromChannel,
      subscribeToThread,
      unsubscribeFromThread
    }}>
      {children}
    </ChannelContext.Provider>
  )
}

export function useChannelContext() {
  const context = useContext(ChannelContext)
  if (!context) {
    throw new Error('useChannelContext must be used within a ChannelProvider')
  }
  return context
} 