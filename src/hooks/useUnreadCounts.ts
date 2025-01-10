import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

interface UnreadCount {
  count: number
  lastReadAt: string | null
}

interface DirectMessageSender {
  sender_id: string
}

export function useUnreadCounts() {
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, UnreadCount>>({})
  const [dmUnreadCounts, setDmUnreadCounts] = useState<Record<string, UnreadCount>>({})
  const [loading, setLoading] = useState(true)
  const { user } = useCurrentUser()
  const supabase = createClient()

  // Debug function
  const logWithTime = (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [UnreadCounts] ${message}`, data || '')
  }

  useEffect(() => {
    if (!user) {
      setChannelUnreadCounts({})
      setDmUnreadCounts({})
      setLoading(false)
      return
    }

    async function fetchUnreadCounts() {
      try {
        logWithTime('Fetching channel unread counts')
        
        // Get last read timestamps for all channels
        const { data: lastRead, error: lastReadError } = await supabase
          .from('last_read')
          .select('channel_id, last_read_at')
          .eq('user_id', user.id)

        if (lastReadError) throw lastReadError

        // Create a map of channel_id to last_read_at
        const lastReadMap = Object.fromEntries(
          (lastRead || []).map(({ channel_id, last_read_at }) => [
            channel_id,
            last_read_at
          ])
        )

        // For each channel, count messages since last read
        const { data: channels } = await supabase
          .from('channels')
          .select('id')

        const unreadCounts: Record<string, UnreadCount> = {}

        await Promise.all((channels || []).map(async (channel) => {
          const lastReadAt = lastReadMap[channel.id] || null

          const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id)
            .neq('sender_id', user.id)
            .gt('created_at', lastReadAt || '1970-01-01')

          if (countError) {
            console.error(`Error counting messages for channel ${channel.id}:`, countError)
            return
          }

          if (count && count > 0) {
            logWithTime(`Found ${count} unread messages in channel ${channel.id}`)
          }

          unreadCounts[channel.id] = {
            count: count || 0,
            lastReadAt
          }
        }))

        setChannelUnreadCounts(unreadCounts)
        logWithTime('Channel unread counts fetched', unreadCounts)

      } catch (error) {
        console.error('Error fetching channel unread counts:', error)
      }
    }

    async function fetchDMUnreadCounts() {
      try {
        logWithTime('Fetching DM unread counts')
        
        // Get last read timestamps for all DM conversations
        const { data: lastRead, error: lastReadError } = await supabase
          .from('dm_last_read')
          .select('other_user_id, last_read_at')
          .eq('user_id', user.id)

        if (lastReadError) throw lastReadError

        // Create a map of other_user_id to last_read_at
        const lastReadMap = Object.fromEntries(
          (lastRead || []).map(({ other_user_id, last_read_at }) => [
            other_user_id,
            last_read_at
          ])
        )

        // Get all unique sender IDs who have sent DMs to the current user
        const { data: senders } = await supabase
          .from('direct_messages')
          .select('sender_id')
          .eq('receiver_id', user.id)
          .neq('sender_id', user.id)
          .limit(1000) // Add reasonable limit
          .then(result => {
            // Manually get unique sender IDs
            const uniqueSenders = new Set(result.data?.map(dm => dm.sender_id) || [])
            return { data: Array.from(uniqueSenders).map(id => ({ sender_id: id })) }
          })

        const unreadCounts: Record<string, UnreadCount> = {}

        await Promise.all((senders || []).map(async ({ sender_id }: DirectMessageSender) => {
          const lastReadAt = lastReadMap[sender_id] || null

          const { count, error: countError } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', sender_id)
            .eq('receiver_id', user.id)
            .gt('created_at', lastReadAt || '1970-01-01')

          if (countError) {
            console.error(`Error counting DMs from user ${sender_id}:`, countError)
            return
          }

          if (count && count > 0) {
            logWithTime(`Found ${count} unread messages from user ${sender_id}`)
          }

          unreadCounts[sender_id] = {
            count: count || 0,
            lastReadAt
          }
        }))

        setDmUnreadCounts(unreadCounts)
        logWithTime('DM unread counts fetched', unreadCounts)

      } catch (error) {
        console.error('Error fetching DM unread counts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUnreadCounts()
    fetchDMUnreadCounts()

    // Subscribe to new messages for unread count updates
    const messageSubscription = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${user.id}`
        },
        (payload) => {
          logWithTime('Received new channel message', payload.new)
          setChannelUnreadCounts(prev => ({
            ...prev,
            [payload.new.channel_id]: {
              count: (prev[payload.new.channel_id]?.count || 0) + 1,
              lastReadAt: prev[payload.new.channel_id]?.lastReadAt || null
            }
          }))
        }
      )
      .subscribe((status, err) => {
        logWithTime('Channel subscription status changed', { status, error: err })
      })

    // Subscribe to new DMs for unread count updates
    const dmSubscription = supabase
      .channel('unread_dms')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          logWithTime('Received new DM', payload.new)
          setDmUnreadCounts(prev => ({
            ...prev,
            [payload.new.sender_id]: {
              count: (prev[payload.new.sender_id]?.count || 0) + 1,
              lastReadAt: prev[payload.new.sender_id]?.lastReadAt || null
            }
          }))
        }
      )
      .subscribe((status, err) => {
        logWithTime('DM subscription status changed', { status, error: err })
      })

    return () => {
      logWithTime('Cleaning up subscriptions')
      messageSubscription.unsubscribe()
      dmSubscription.unsubscribe()
    }
  }, [user])

  const markChannelAsRead = useCallback(async (channelId: string) => {
    if (!user) return

    try {
      const now = new Date().toISOString()
      
      await supabase
        .from('last_read')
        .upsert({
          user_id: user.id,
          channel_id: channelId,
          last_read_at: now
        })

      setChannelUnreadCounts(prev => ({
        ...prev,
        [channelId]: {
          count: 0,
          lastReadAt: now
        }
      }))

      logWithTime(`Marked channel ${channelId} as read`)
    } catch (error) {
      console.error('Error marking channel as read:', error)
    }
  }, [user])

  const markDmAsRead = useCallback(async (otherUserId: string) => {
    if (!user) return

    try {
      const now = new Date().toISOString()
      
      await supabase
        .from('dm_last_read')
        .upsert({
          user_id: user.id,
          other_user_id: otherUserId,
          last_read_at: now
        })

      setDmUnreadCounts(prev => ({
        ...prev,
        [otherUserId]: {
          count: 0,
          lastReadAt: now
        }
      }))

      logWithTime(`Marked DMs from user ${otherUserId} as read`)
    } catch (error) {
      console.error('Error marking DM as read:', error)
    }
  }, [user])

  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      const now = new Date().toISOString()

      // Mark all channels as read
      const { data: channels } = await supabase
        .from('channels')
        .select('id')

      const channelUpdates = (channels || []).map(channel => ({
        user_id: user.id,
        channel_id: channel.id,
        last_read_at: now
      }))

      if (channelUpdates.length > 0) {
        await supabase
          .from('last_read')
          .upsert(channelUpdates)
      }

      // Mark all DMs as read
      const { data: dms } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .neq('sender_id', user.id)
        .limit(1000) // Add reasonable limit
        .then(result => {
          // Manually get unique sender IDs
          const uniqueSenders = new Set(result.data?.map(dm => dm.sender_id) || [])
          return { data: Array.from(uniqueSenders).map(id => ({ sender_id: id })) }
        })

      const dmUpdates = (dms || []).map(dm => ({
        user_id: user.id,
        other_user_id: dm.sender_id,
        last_read_at: now
      }))

      if (dmUpdates.length > 0) {
        await supabase
          .from('dm_last_read')
          .upsert(dmUpdates)
      }

      // Reset all unread counts
      setChannelUnreadCounts(prev => {
        const reset: Record<string, UnreadCount> = {}
        Object.keys(prev).forEach(channelId => {
          reset[channelId] = { count: 0, lastReadAt: now }
        })
        return reset
      })

      setDmUnreadCounts(prev => {
        const reset: Record<string, UnreadCount> = {}
        Object.keys(prev).forEach(userId => {
          reset[userId] = { count: 0, lastReadAt: now }
        })
        return reset
      })

      logWithTime('Marked all messages as read')
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }, [user])

  return {
    channelUnreadCounts,
    dmUnreadCounts,
    loading,
    markChannelAsRead,
    markDmAsRead,
    markAllAsRead
  }
} 