import { useEffect, useState, useCallback, useRef } from 'react'
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
  const lastReadTimestamps = useRef<Record<string, string>>({})

  // Debug function
  const logWithTime = (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [UnreadCounts] ${message}`, data || '')
  }

  // Function to fetch unread counts for a specific channel
  const fetchChannelUnreadCount = useCallback(async (channelId: string) => {
    if (!user) return 0

    try {
      const lastReadAt = lastReadTimestamps.current[`channel:${channelId}`] || '1970-01-01'

      // First, get the latest last_read timestamp from the database
      const { data: lastRead } = await supabase
        .from('last_read')
        .select('last_read_at')
        .eq('user_id', user.id)
        .eq('channel_id', channelId)
        .single()

      // Use the most recent last_read_at between our ref and the database
      const effectiveLastReadAt = lastRead?.last_read_at 
        ? new Date(Math.max(new Date(lastRead.last_read_at).getTime(), new Date(lastReadAt).getTime())).toISOString()
        : lastReadAt

      // Update our ref with the latest timestamp
      lastReadTimestamps.current[`channel:${channelId}`] = effectiveLastReadAt

      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .neq('sender_id', user.id)
        .gt('created_at', effectiveLastReadAt)

      if (countError) {
        console.error(`Error counting messages for channel ${channelId}:`, countError)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error fetching channel unread count:', error)
      return 0
    }
  }, [user])

  // Function to fetch unread counts for a specific DM conversation
  const fetchDMUnreadCount = useCallback(async (otherUserId: string) => {
    if (!user) return 0

    try {
      const lastReadAt = lastReadTimestamps.current[`dm:${otherUserId}`] || '1970-01-01'

      // First, get the latest last_read timestamp from the database
      const { data: lastRead } = await supabase
        .from('dm_last_read')
        .select('last_read_at')
        .eq('user_id', user.id)
        .eq('other_user_id', otherUserId)
        .single()

      // Use the most recent last_read_at between our ref and the database
      const effectiveLastReadAt = lastRead?.last_read_at 
        ? new Date(Math.max(new Date(lastRead.last_read_at).getTime(), new Date(lastReadAt).getTime())).toISOString()
        : lastReadAt

      // Update our ref with the latest timestamp
      lastReadTimestamps.current[`dm:${otherUserId}`] = effectiveLastReadAt

      const { count, error: countError } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .gt('created_at', effectiveLastReadAt)

      if (countError) {
        console.error(`Error counting DMs from user ${otherUserId}:`, countError)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error fetching DM unread count:', error)
      return 0
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setChannelUnreadCounts({})
      setDmUnreadCounts({})
      setLoading(false)
      return
    }

    async function fetchAllUnreadCounts() {
      try {
        logWithTime('Fetching all unread counts')
        
        // Get last read timestamps for all channels
        const { data: channelLastRead, error: channelLastReadError } = await supabase
          .from('last_read')
          .select('channel_id, last_read_at')
          .eq('user_id', user.id)

        if (channelLastReadError) throw channelLastReadError

        // Update lastReadTimestamps ref for channels
        channelLastRead?.forEach(({ channel_id, last_read_at }) => {
          lastReadTimestamps.current[`channel:${channel_id}`] = last_read_at
        })

        // Get last read timestamps for all DMs
        const { data: dmLastRead, error: dmLastReadError } = await supabase
          .from('dm_last_read')
          .select('other_user_id, last_read_at')
          .eq('user_id', user.id)

        if (dmLastReadError) throw dmLastReadError

        // Update lastReadTimestamps ref for DMs
        dmLastRead?.forEach(({ other_user_id, last_read_at }) => {
          lastReadTimestamps.current[`dm:${other_user_id}`] = last_read_at
        })

        // Get all channels
        const { data: channels } = await supabase
          .from('channels')
          .select('id')

        // Get all DM senders
        const { data: senders } = await supabase
          .from('direct_messages')
          .select('sender_id')
          .eq('receiver_id', user.id)
          .neq('sender_id', user.id)
          .then(result => {
            const uniqueSenders = new Set(result.data?.map(dm => dm.sender_id) || [])
            return { data: Array.from(uniqueSenders).map(id => ({ sender_id: id })) }
          })

        // Fetch unread counts for all channels
        const channelCounts: Record<string, UnreadCount> = {}
        await Promise.all((channels || []).map(async (channel) => {
          const count = await fetchChannelUnreadCount(channel.id)
          if (count > 0) {
            logWithTime(`Found ${count} unread messages in channel ${channel.id}`)
          }
          channelCounts[channel.id] = {
            count,
            lastReadAt: lastReadTimestamps.current[`channel:${channel.id}`] || null
          }
        }))

        // Fetch unread counts for all DMs
        const dmCounts: Record<string, UnreadCount> = {}
        await Promise.all((senders || []).map(async ({ sender_id }) => {
          const count = await fetchDMUnreadCount(sender_id)
          if (count > 0) {
            logWithTime(`Found ${count} unread messages from user ${sender_id}`)
          }
          dmCounts[sender_id] = {
            count,
            lastReadAt: lastReadTimestamps.current[`dm:${sender_id}`] || null
          }
        }))

        setChannelUnreadCounts(channelCounts)
        setDmUnreadCounts(dmCounts)
        logWithTime('All unread counts fetched')

      } catch (error) {
        console.error('Error fetching unread counts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllUnreadCounts()

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
        async (payload) => {
          logWithTime('Received new channel message', payload.new)
          const channelId = payload.new.channel_id

          // Get the last read timestamp from our ref first
          const lastReadAt = lastReadTimestamps.current[`channel:${channelId}`] || '1970-01-01'
          
          // Only fetch from database if we don't have a recent timestamp
          if (!lastReadAt || new Date(lastReadAt).getTime() < Date.now() - 5000) {
            const { data: lastRead } = await supabase
              .from('last_read')
              .select('last_read_at')
              .eq('user_id', user.id)
              .eq('channel_id', channelId)
              .single()

            if (lastRead?.last_read_at) {
              lastReadTimestamps.current[`channel:${channelId}`] = lastRead.last_read_at
            }
          }

          const count = await fetchChannelUnreadCount(channelId)
          logWithTime(`Updated count for channel ${channelId}:`, count)
          
          setChannelUnreadCounts(prev => ({
            ...prev,
            [channelId]: {
              count,
              lastReadAt: lastReadTimestamps.current[`channel:${channelId}`] || null
            }
          }))
        }
      )
      .subscribe()

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
        async (payload) => {
          logWithTime('Received new DM', payload.new)
          const senderId = payload.new.sender_id

          // Get the last read timestamp from our ref first
          const lastReadAt = lastReadTimestamps.current[`dm:${senderId}`] || '1970-01-01'
          
          // Only fetch from database if we don't have a recent timestamp
          if (!lastReadAt || new Date(lastReadAt).getTime() < Date.now() - 5000) {
            const { data: lastRead } = await supabase
              .from('dm_last_read')
              .select('last_read_at')
              .eq('user_id', user.id)
              .eq('other_user_id', senderId)
              .single()

            if (lastRead?.last_read_at) {
              lastReadTimestamps.current[`dm:${senderId}`] = lastRead.last_read_at
            }
          }

          const count = await fetchDMUnreadCount(senderId)
          logWithTime(`Updated count for DM ${senderId}:`, count)
          
          setDmUnreadCounts(prev => ({
            ...prev,
            [senderId]: {
              count,
              lastReadAt: lastReadTimestamps.current[`dm:${senderId}`] || null
            }
          }))
        }
      )
      .subscribe()

    return () => {
      messageSubscription.unsubscribe()
      dmSubscription.unsubscribe()
    }
  }, [user, fetchChannelUnreadCount, fetchDMUnreadCount])

  const markChannelAsRead = useCallback(async (channelId: string) => {
    if (!user) return

    try {
      const now = new Date().toISOString()
      
      // Update the last read timestamp in our ref first
      lastReadTimestamps.current[`channel:${channelId}`] = now

      // Update the UI immediately
      setChannelUnreadCounts(prev => ({
        ...prev,
        [channelId]: {
          count: 0,
          lastReadAt: now
        }
      }))

      // Then update the database
      const { error } = await supabase
        .from('last_read')
        .upsert({
          user_id: user.id,
          channel_id: channelId,
          last_read_at: now
        })

      if (error) {
        // If the database update fails, revert the UI
        const count = await fetchChannelUnreadCount(channelId)
        setChannelUnreadCounts(prev => ({
          ...prev,
          [channelId]: {
            count,
            lastReadAt: lastReadTimestamps.current[`channel:${channelId}`] || null
          }
        }))
        throw error
      }

      logWithTime(`Marked channel ${channelId} as read`)
    } catch (error) {
      console.error('Error marking channel as read:', error)
    }
  }, [user, fetchChannelUnreadCount])

  const markDmAsRead = useCallback(async (otherUserId: string) => {
    if (!user) return

    try {
      const now = new Date().toISOString()
      
      // Update the last read timestamp in our ref first
      lastReadTimestamps.current[`dm:${otherUserId}`] = now

      // Update the UI immediately
      setDmUnreadCounts(prev => ({
        ...prev,
        [otherUserId]: {
          count: 0,
          lastReadAt: now
        }
      }))

      // Then update the database
      const { error } = await supabase
        .from('dm_last_read')
        .upsert({
          user_id: user.id,
          other_user_id: otherUserId,
          last_read_at: now
        })

      if (error) {
        // If the database update fails, revert the UI
        const count = await fetchDMUnreadCount(otherUserId)
        setDmUnreadCounts(prev => ({
          ...prev,
          [otherUserId]: {
            count,
            lastReadAt: lastReadTimestamps.current[`dm:${otherUserId}`] || null
          }
        }))
        throw error
      }

      logWithTime(`Marked DMs from user ${otherUserId} as read`)
    } catch (error) {
      console.error('Error marking DM as read:', error)
    }
  }, [user, fetchDMUnreadCount])

  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      const now = new Date().toISOString()

      // Get all channels and DM senders
      const { data: channels } = await supabase
        .from('channels')
        .select('id')

      const { data: senders } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .neq('sender_id', user.id)
        .then(result => {
          const uniqueSenders = new Set(result.data?.map(dm => dm.sender_id) || [])
          return { data: Array.from(uniqueSenders).map(id => ({ sender_id: id })) }
        })

      // Update all timestamps in our ref
      channels?.forEach(channel => {
        lastReadTimestamps.current[`channel:${channel.id}`] = now
      })
      senders?.forEach(({ sender_id }) => {
        lastReadTimestamps.current[`dm:${sender_id}`] = now
      })

      // Update UI immediately
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

      // Update database
      const channelUpdates = (channels || []).map(channel => ({
        user_id: user.id,
        channel_id: channel.id,
        last_read_at: now
      }))

      const dmUpdates = (senders || []).map(({ sender_id }) => ({
        user_id: user.id,
        other_user_id: sender_id,
        last_read_at: now
      }))

      // Perform updates
      if (channelUpdates.length > 0) {
        const { error: channelError } = await supabase
          .from('last_read')
          .upsert(channelUpdates)

        if (channelError) throw channelError
      }

      if (dmUpdates.length > 0) {
        const { error: dmError } = await supabase
          .from('dm_last_read')
          .upsert(dmUpdates)

        if (dmError) throw dmError
      }

      logWithTime('Marked all messages as read')
    } catch (error) {
      console.error('Error marking all as read:', error)
      // If there's an error, refresh all counts
      const { data: channels } = await supabase.from('channels').select('id')
      const { data: senders } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .neq('sender_id', user.id)
        .then(result => {
          const uniqueSenders = new Set(result.data?.map(dm => dm.sender_id) || [])
          return { data: Array.from(uniqueSenders).map(id => ({ sender_id: id })) }
        })

      // Refresh channel counts
      const channelCounts: Record<string, UnreadCount> = {}
      await Promise.all((channels || []).map(async (channel) => {
        const count = await fetchChannelUnreadCount(channel.id)
        channelCounts[channel.id] = {
          count,
          lastReadAt: lastReadTimestamps.current[`channel:${channel.id}`] || null
        }
      }))
      setChannelUnreadCounts(channelCounts)

      // Refresh DM counts
      const dmCounts: Record<string, UnreadCount> = {}
      await Promise.all((senders || []).map(async ({ sender_id }) => {
        const count = await fetchDMUnreadCount(sender_id)
        dmCounts[sender_id] = {
          count,
          lastReadAt: lastReadTimestamps.current[`dm:${sender_id}`] || null
        }
      }))
      setDmUnreadCounts(dmCounts)
    }
  }, [user, fetchChannelUnreadCount, fetchDMUnreadCount])

  return {
    channelUnreadCounts,
    dmUnreadCounts,
    loading,
    markChannelAsRead,
    markDmAsRead,
    markAllAsRead
  }
} 