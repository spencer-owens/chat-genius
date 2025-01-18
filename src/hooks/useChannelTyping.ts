import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']

export function useChannelTyping(channelId: string | null) {
  const { 
    currentUser,
    typingUsers,
    updateTypingUsers
  } = useStore()
  const supabase = createClient()

  // Use our new realtime subscription
  useRealtimeSubscription('typing_status', channelId || '')

  useEffect(() => {
    if (!channelId) return

    const channelIdString = channelId // Capture in a const to help TypeScript understand it's not null

    async function fetchTypingUsers() {
      try {
        const query = supabase
          .from('typing_status')
          .select(`
            user:users(*)
          `)
          .eq('channel_id', channelIdString)
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
          }, {} as Record<string, Tables['users']['Row']>)
          updateTypingUsers(channelIdString, users)
        }
      } catch (error) {
        console.error('Error fetching typing users:', error)
        toast.error('Failed to load typing users')
      }
    }

    fetchTypingUsers()
  }, [channelId, currentUser])

  return { 
    typingUsers: typingUsers[channelId || ''] || {},
    loading: false
  }
} 