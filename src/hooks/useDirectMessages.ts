import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

interface DirectMessage {
  id: string
  content: string
  created_at: string
  sender_id: string
  receiver_id: string
  sender: {
    username: string
    status: string
    profile_picture?: string
  }
  type: 'dm'
}

export function useDirectMessages(otherUserId: string | null) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  // Debug function
  const logWithTime = (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '')
  }

  useEffect(() => {
    if (!otherUserId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    logWithTime('Setting up DM hook', { currentUser: currentUser.id, otherUser: otherUserId })

    async function fetchMessages() {
      try {
        logWithTime('Fetching messages')
        const { data, error } = await supabase
          .from('direct_messages')
          .select(`
            *,
            sender:users!sender_id(
              id,
              username,
              status,
              profile_picture
            )
          `)
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),` +
            `and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
          )
          .order('created_at', { ascending: true })

        if (error) throw error

        logWithTime('Messages fetched', { count: data?.length })

        const formattedMessages: DirectMessage[] = (data || []).map(msg => ({
          ...msg,
          type: 'dm'
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

    // Simpler subscription pattern
    const channelName = `direct_messages_${[currentUser.id, otherUserId].sort().join('_')}`
    logWithTime('Creating channel', { channelName })

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id}))`
        },
        async (payload) => {
          logWithTime('Received new message payload', payload)

          // Fetch the complete message to ensure we have all related data
          const { data, error } = await supabase
            .from('direct_messages')
            .select(`
              *,
              sender:users!sender_id(
                id,
                username,
                status,
                profile_picture
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            console.error('Error fetching new message details:', error)
            return
          }

          logWithTime('Adding new message to state', data)
          
          const newMessage: DirectMessage = {
            ...data,
            type: 'dm'
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
  }, [currentUser, otherUserId])

  const sendMessage = async (content: string) => {
    if (!currentUser || !otherUserId) {
      throw new Error('Must be logged in to send messages')
    }

    const newMessage = {
      content,
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    logWithTime('Sending message:', newMessage)

    // Add optimistic message
    const optimisticMessage: DirectMessage = {
      ...newMessage,
      id: `temp-${Date.now()}`,
      type: 'dm',
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        status: 'online',
        profile_picture: currentUser.profile_picture
      }
    }

    setMessages(prev => [...prev, optimisticMessage])

    try {
      const { error: sendError } = await supabase
        .from('direct_messages')
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