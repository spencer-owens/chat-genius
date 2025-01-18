import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export function useUnreadCounts() {
  const { 
    currentUser,
    messagesByChannel,
    channels,
    lastReadByChannel,
    updateLastRead
  } = useStore()
  const supabase = createClient()

  // Use our new realtime subscription
  useRealtimeSubscription('last_read', currentUser?.id || '')

  useEffect(() => {
    if (!currentUser?.id) return

    async function fetchLastRead(userId: string) {
      try {
        const { data: lastReadData, error } = await supabase
          .from('last_read')
          .select('*')
          .eq('user_id', userId)

        if (error) throw error
        if (lastReadData) {
          lastReadData.forEach(row => {
            updateLastRead(row.channel_id, row.last_read_at)
          })
        }
      } catch (error) {
        console.error('Error fetching last read timestamps:', error)
        toast.error('Failed to load unread counts')
      }
    }

    fetchLastRead(currentUser.id)
  }, [currentUser])

  const markAsRead = useCallback(async (channelId: string) => {
    if (!currentUser?.id) return

    try {
      const lastReadAt = new Date().toISOString()
      const { error } = await supabase
        .from('last_read')
        .upsert({
          channel_id: channelId,
          user_id: currentUser.id,
          last_read_at: lastReadAt
        })

      if (error) throw error
      updateLastRead(channelId, lastReadAt)
    } catch (error) {
      console.error('Error updating last read:', error)
      toast.error('Failed to update read status')
    }
  }, [currentUser])

  const unreadCounts = channels.reduce((acc, channel) => {
    const lastReadAt = lastReadByChannel[channel.id]
    const messages = messagesByChannel[channel.id] || []
    
    if (!lastReadAt) {
      acc[channel.id] = messages.length
      return acc
    }

    acc[channel.id] = messages.filter(msg => {
      const messageDate = new Date(msg.created_at || 0)
      const lastReadDate = new Date(lastReadAt)
      return messageDate > lastReadDate
    }).length

    return acc
  }, {} as Record<string, number>)

  return { unreadCounts, markAsRead }
} 