import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!channelId) {
      setMessages([])
      setLoading(false)
      return
    }

    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!sender_id(*),
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
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Set up real-time subscription
    const messagesSubscription = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          console.log('Messages change received:', payload)
          fetchMessages() // Refetch messages when changes occur
      })
      .subscribe()

    return () => {
      messagesSubscription.unsubscribe()
    }
  }, [channelId])

  return { messages, loading, error }
} 