import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'

type Tables = Database['public']['Tables']

interface TypingStatus {
  user_id: string
  channel_id: string
  last_typed_at: string
}

export function useTypingIndicator(channelId: string | null) {
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const { currentUser, channels } = useStore()
  const supabase = createClient()

  useEffect(() => {
    if (!channelId || !currentUser?.id) return

    // Check if user has access to this channel
    const channel = channels.find(c => c.id === channelId)
    if (!channel || (channel.is_private && !channel.memberships.some(m => m.user_id === currentUser.id))) {
      return
    }

    const subscription = supabase
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

    // Cleanup old typing statuses periodically
    const cleanupInterval = setInterval(async () => {
      try {
        const { error } = await supabase
          .from('typing_status')
          .delete()
          .eq('channel_id', channelId)
          .lt('last_typed_at', new Date(Date.now() - 10000).toISOString()) // Remove statuses older than 10 seconds

        if (error) throw error
      } catch (error) {
        console.error('Error cleaning up typing statuses:', error)
      }
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearInterval(cleanupInterval)
    }
  }, [channelId, currentUser, channels])

  const setTyping = useCallback(async () => {
    if (!channelId || !currentUser?.id) {
      return
    }

    // Check if user has access to this channel
    const channel = channels.find(c => c.id === channelId)
    if (!channel || (channel.is_private && !channel.memberships.some(m => m.user_id === currentUser.id))) {
      return
    }

    try {
      const typingStatus: TypingStatus = {
        user_id: currentUser.id,
        channel_id: channelId,
        last_typed_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('typing_status')
        .upsert(typingStatus)

      if (error) throw error
    } catch (error) {
      console.error('Error updating typing status:', error)
      toast.error('Failed to update typing status')
    }
  }, [channelId, currentUser, channels])

  return {
    typingUsers,
    setTyping
  }
} 