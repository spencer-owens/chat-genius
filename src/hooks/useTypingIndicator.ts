import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']

export function useTypingIndicator(channelId: string) {
  const supabase = createClient()
  const { currentUser, typingUsers, updateTypingUsers, removeTypingUser } = useStore()

  const handleTypingStart = useCallback(async () => {
    if (!currentUser) return

    const { error } = await supabase
      .from('typing_status')
      .upsert({
        channel_id: channelId,
        user_id: currentUser.id,
        is_typing: true
      })

    if (error) {
      console.error('Error updating typing status:', error)
    }
  }, [channelId, currentUser])

  const handleTypingStop = useCallback(async () => {
    if (!currentUser) return

    const { error } = await supabase
      .from('typing_status')
      .delete()
      .match({
        channel_id: channelId,
        user_id: currentUser.id
      })

    if (error) {
      console.error('Error clearing typing status:', error)
    }
  }, [channelId, currentUser])

  useEffect(() => {
    if (!currentUser) return

    const channel = supabase
      .channel(`typing:${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_status',
        filter: `channel_id=eq.${channelId}`
      }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          const userId = payload.old.user_id
          removeTypingUser(channelId, userId)
        } else {
          // Fetch user info for typing indicator
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', payload.new.user_id)
            .single()

          if (user) {
            updateTypingUsers(channelId, {
              [user.id]: user
            })
          }
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      handleTypingStop()
    }
  }, [channelId, currentUser])

  return {
    typingUsers: typingUsers[channelId] || {},
    handleTypingStart,
    handleTypingStop
  }
} 