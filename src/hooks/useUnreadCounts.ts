import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type LastReadRow = Tables['last_read']['Row']

export function useUnreadCounts() {
  const { 
    currentUser,
    messagesByChannel,
    channels
  } = useStore()
  const [lastReadByChannel, setLastReadByChannel] = useState<Record<string, string>>({})
  const supabase = createClient()

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
          const lastRead = lastReadData.reduce((acc, row) => {
            acc[row.channel_id] = row.last_read_at
            return acc
          }, {} as Record<string, string>)
          setLastReadByChannel(lastRead)
        }
      } catch (error) {
        console.error('Error fetching last read timestamps:', error)
        toast.error('Failed to load unread counts')
      }
    }

    fetchLastRead(currentUser.id)

    const channel = supabase
      .channel('last_read')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'last_read',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as LastReadRow
            setLastReadByChannel(prev => ({
              ...prev,
              [row.channel_id]: row.last_read_at
            }))
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Error subscribing to last read:', err)
          toast.error('Lost connection to unread counts')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [currentUser])

  const updateLastRead = useCallback(async (channelId: string) => {
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
      
      setLastReadByChannel(prev => ({
        ...prev,
        [channelId]: lastReadAt
      }))
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

  return { unreadCounts, updateLastRead }
} 