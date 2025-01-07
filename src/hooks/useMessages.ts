import { useState, useCallback, useRef } from 'react'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = useRef(createClient())

  const fetchMessages = useCallback(async () => {
    if (!channelId) return
    
    try {
      const { data, error } = await supabase.current
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(
            id,
            username,
            profile_picture,
            status
          ),
          reactions(*)
        `)
        .eq('channel_id', channelId)
        .is('thread_id', null)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error
      setMessages(data || [])
    } catch (e) {
      setError(e as Error)
      console.error('Error fetching messages:', e)
    } finally {
      setLoading(false)
    }
  }, [channelId])

  useEffect(() => {
    fetchMessages()

    // Set up real-time subscription for new messages
    const channel = supabase.current
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [channelId, fetchMessages])

  const sendMessage = async (content: string) => {
    if (!channelId) return

    const { data: { user } } = await supabase.current.auth.getUser()
    if (!user) {
      console.error('No user found')
      return
    }

    // Create optimistic message
    const optimisticMessage = {
      id: Date.now().toString(),
      content,
      channel_id: channelId,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      sender: user,
      reactions: []
    }

    // Add optimistic message to state
    setMessages(prev => [...prev, optimisticMessage])

    try {
      const { error } = await supabase.current
        .from('messages')
        .insert([{
          content,
          channel_id: channelId,
          sender_id: user.id
        }])

      if (error) throw error

      // Message will be updated via real-time subscription
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => 
        prev.filter(msg => msg.id !== optimisticMessage.id)
      )
      console.error('Error sending message:', error)
      setError(error as Error)
    }
  }

  return { 
    messages, 
    loading, 
    error,
    sendMessage,
    refreshMessages: fetchMessages
  }
} 