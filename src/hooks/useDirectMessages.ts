import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useDirectMessages(userId: string | null) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setMessages([])
      setLoading(false)
      return
    }

    async function fetchDirectMessages() {
      try {
        const { data, error } = await supabase
          .from('direct_messages')
          .select(`
            *,
            sender:sender_id(id, username, status, profile_picture),
            receiver:receiver_id(id, username, status, profile_picture)
          `)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        setMessages(data || [])
      } catch (e) {
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchDirectMessages()

    // Set up real-time subscription
    const subscription = supabase
      .channel(`direct_messages:${userId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'direct_messages' },
        (payload) => {
          console.log('DM change received:', payload)
          fetchDirectMessages()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  return { messages, loading, error }
} 