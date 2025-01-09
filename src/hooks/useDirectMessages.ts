import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'

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

  useEffect(() => {
    if (!otherUserId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    async function fetchMessages() {
      try {
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

    // Set up real-time subscription for this conversation
    const channel = supabase
      .channel(`dm:${[currentUser.id, otherUserId].sort().join(':')}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id}))`
        },
        (payload) => {
          console.log('DM change received:', payload)
          if (payload.eventType === 'INSERT') {
            // Optimistically update the messages
            setMessages(prev => [...prev, payload.new])
          } else {
            // For other changes, refetch to ensure consistency
            fetchMessages()
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [currentUser, otherUserId])

  return { messages, loading, error }
} 