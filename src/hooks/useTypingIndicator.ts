import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

export function useTypingIndicator(channelId: string | null) {
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  useEffect(() => {
    if (!channelId || !currentUser) return

    const channel = supabase
      .channel(`typing_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setTypingUsers(prev => {
              const next = { ...prev }
              delete next[payload.old.user_id]
              return next
            })
          } else {
            setTypingUsers(prev => ({
              ...prev,
              [payload.new.user_id]: true
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId, currentUser])

  const setTyping = useCallback(async () => {
    if (!channelId || !currentUser) return

    try {
      await supabase
        .from('typing_status')
        .upsert({
          user_id: currentUser.id,
          channel_id: channelId,
          last_typed_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }, [channelId, currentUser])

  return {
    typingUsers,
    setTyping
  }
} 