import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

interface Message {
  id: string
  content: string
  created_at: string
  channel_id: string
  sender: {
    id: string
    username: string
    status: string
    profile_picture?: string
  }
  type: 'channel'
  reactions: Array<{
    emoji: string
    user_id: string
  }>
}

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  // Debug function
  const logWithTime = (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '')
  }

  useEffect(() => {
    if (!channelId) {
      setMessages([])
      setLoading(false)
      return
    }

    logWithTime('Setting up channel messages hook', { channelId })

    async function fetchMessages() {
      try {
        logWithTime('Fetching messages')
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
            reactions(*)
          `)
          .eq('channel_id', channelId)
          .order('created_at', { ascending: true })

        if (error) throw error

        logWithTime('Messages fetched', { count: data?.length })

        const formattedMessages: Message[] = (data || []).map(msg => ({
          ...msg,
          type: 'channel'
        }))

        setMessages(formattedMessages)
      } catch (e) {
        setError(e as Error)
        console.error('Error fetching messages:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Set up real-time subscription
    const channelName = `messages_${channelId}`
    logWithTime('Creating channel subscription', { channelName })

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          logWithTime('Received new message payload', payload)

          // Fetch the complete message to ensure we have all related data
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
              reactions(*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            console.error('Error fetching new message details:', error)
            return
          }

          logWithTime('Adding new message to state', data)
          
          const newMessage: Message = {
            ...data,
            type: 'channel'
          }

          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe((status, err) => {
        logWithTime('Subscription status changed', { status, error: err })
      })

    return () => {
      logWithTime('Cleaning up subscription', { channelName })
      supabase.removeChannel(channel)
    }
  }, [channelId])

  const sendMessage = async (content: string) => {
    if (!currentUser || !channelId) {
      throw new Error('Must be logged in to send messages')
    }

    const newMessage = {
      content,
      channel_id: channelId,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    logWithTime('Sending message:', newMessage)

    // Add optimistic message
    const optimisticMessage: Message = {
      ...newMessage,
      id: `temp-${Date.now()}`,
      type: 'channel',
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        status: 'online',
        profile_picture: currentUser.profile_picture
      },
      reactions: []
    }

    setMessages(prev => [...prev, optimisticMessage])

    try {
      const { error: sendError } = await supabase
        .from('messages')
        .insert([newMessage])

      if (sendError) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
        throw sendError
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      throw error
    }
  }

  return {
    messages,
    loading,
    error,
    sendMessage
  }
} 