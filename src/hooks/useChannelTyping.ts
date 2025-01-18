import { useEffect, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type UserRow = Tables['users']['Row']

export function useChannelTyping(channelId: string | null) {
  const { currentUser } = useStore()
  const [typingUsers, setTypingUsers] = useState<Record<string, UserRow>>({})
  const supabase = createClient()

  const updateTypingStatus = useCallback(async () => {
    if (!channelId || !currentUser?.id) return

    try {
      const { error } = await supabase
        .from('typing_status')
        .upsert({
          channel_id: channelId,
          user_id: currentUser.id,
          last_typed_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }, [channelId, currentUser])

  useEffect(() => {
    if (!channelId) return

    async function fetchTypingUsers(id: string) {
      try {
        const query = supabase
          .from('typing_status')
          .select(`
            user:users(*)
          `)
          .eq('channel_id', id)
          .gt('last_typed_at', new Date(Date.now() - 10000).toISOString())
          .not('user_id', 'is', null)

        // Add current user filter if exists
        if (currentUser?.id) {
          query.neq('user_id', currentUser.id)
        }

        const { data: typingData, error } = await query

        if (error) throw error
        if (typingData) {
          const users = typingData.reduce((acc, data) => {
            if (data.user) {
              acc[data.user.id] = data.user
            }
            return acc
          }, {} as Record<string, UserRow>)
          setTypingUsers(users)
        }
      } catch (error) {
        console.error('Error fetching typing users:', error)
        toast.error('Failed to load typing status')
      }
    }

    // Initial fetch
    fetchTypingUsers(channelId)

    // Set up subscription
    const channel = supabase
      .channel('typing')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          if (payload.eventType === 'DELETE' && payload.old?.user_id) {
            const userId = payload.old.user_id
            if (typeof userId === 'string') {
              setTypingUsers(prev => {
                const next = { ...prev }
                delete next[userId]
                return next
              })
            }
          } else {
            // Refetch on other changes
            fetchTypingUsers(channelId)
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Error subscribing to typing status:', err)
          toast.error('Lost connection to typing status')
        }
      })

    // Clean up old typing statuses periodically
    const interval = setInterval(() => {
      fetchTypingUsers(channelId)
    }, 5000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [channelId, currentUser])

  return { 
    typingUsers: Object.values(typingUsers),
    updateTypingStatus
  }
} 