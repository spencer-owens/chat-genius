import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'
import { useRealtimeSubscription } from './useRealtimeSubscription'

type Tables = Database['public']['Tables']
type Channel = Tables['channels']['Row'] & {
  memberships: Tables['memberships']['Row'][]
}

export function useTypingIndicator(channelId: string | null) {
  const { currentUser, channels, typingUsers } = useStore()
  const supabase = createClient()

  // Use our realtime subscription
  useRealtimeSubscription('typing_status', channelId || '')

  const setTyping = useCallback(async () => {
    if (!channelId || !currentUser?.id) return

    // Check if user has access to this channel
    const channel = channels.find(c => c.id === channelId) as Channel
    if (!channel || (channel.is_private && !channel.memberships.some(m => m.user_id === currentUser.id))) {
      return
    }

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
  }, [channelId, currentUser, channels])

  const clearTyping = useCallback(async () => {
    if (!channelId || !currentUser?.id) return

    try {
      const { error } = await supabase
        .from('typing_status')
        .delete()
        .match({
          channel_id: channelId,
          user_id: currentUser.id
        })

      if (error) throw error
    } catch (error) {
      console.error('Error clearing typing status:', error)
    }
  }, [channelId, currentUser])

  return {
    typingUsers: typingUsers[channelId || ''] || {},
    setTyping,
    clearTyping
  }
} 