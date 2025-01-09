import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

export function useUnreadCounts() {
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, number>>({})
  const [dmUnreadCounts, setDmUnreadCounts] = useState<Record<string, number>>({})
  const { user } = useCurrentUser()
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    async function fetchUnreadCounts() {
      try {
        // Get last read timestamps for all channels
        const { data: lastRead, error: lastReadError } = await supabase
          .from('last_read')
          .select('channel_id, last_read_at')
          .eq('user_id', user.id)

        if (lastReadError) throw lastReadError

        const lastReadMap = Object.fromEntries(
          lastRead?.map(({ channel_id, last_read_at }) => [
            channel_id,
            typeof last_read_at === 'string' ? last_read_at : new Date(last_read_at).toISOString()
          ]) || []
        )

        // Get message counts since last read
        const { data: unreadMessages, error: countError } = await supabase
          .from('messages')
          .select('channel_id, id', { count: 'exact' })
          .neq('sender_id', user.id)
          .in('channel_id', Object.keys(lastReadMap))
          .gt('created_at', lastReadMap)

        if (countError) throw countError

        // Count messages per channel
        const counts = unreadMessages?.reduce((acc, msg) => {
          acc[msg.channel_id] = (acc[msg.channel_id] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        setChannelUnreadCounts(counts)
      } catch (error) {
        console.error('Error fetching unread counts:', error)
      }
    }

    fetchUnreadCounts()

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          if (payload.new.sender_id !== user.id) {
            setChannelUnreadCounts(prev => ({
              ...prev,
              [payload.new.channel_id]: (prev[payload.new.channel_id] || 0) + 1
            }))
          }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  // Add DM unread counts
  useEffect(() => {
    if (!user) return

    async function fetchDMUnreadCounts() {
      try {
        const { data: lastRead, error: lastReadError } = await supabase
          .from('dm_last_read')
          .select('other_user_id, last_read_at')
          .eq('user_id', user.id)

        if (lastReadError) throw lastReadError

        const lastReadMap = Object.fromEntries(
          lastRead?.map(({ other_user_id, last_read_at }) => [
            other_user_id,
            typeof last_read_at === 'string' ? last_read_at : new Date(last_read_at).toISOString()
          ]) || []
        )

        const { data: unreadDMs, error: countError } = await supabase
          .from('direct_messages')
          .select('sender_id, id')
          .eq('receiver_id', user.id)
          .in('sender_id', Object.keys(lastReadMap))
          .gt('created_at', lastReadMap)

        if (countError) throw countError

        const counts = unreadDMs?.reduce((acc, msg) => {
          acc[msg.sender_id] = (acc[msg.sender_id] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        setDmUnreadCounts(counts)
      } catch (error) {
        console.error('Error fetching DM unread counts:', error)
      }
    }

    fetchDMUnreadCounts()

    // Subscribe to new DMs
    const subscription = supabase
      .channel('direct_messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload: any) => {
          if (payload.new.receiver_id === user.id) {
            setDmUnreadCounts(prev => ({
              ...prev,
              [payload.new.sender_id]: (prev[payload.new.sender_id] || 0) + 1
            }))
          }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const markChannelAsRead = async (channelId: string) => {
    if (!user) return

    try {
      await supabase
        .from('last_read')
        .upsert({
          user_id: user.id,
          channel_id: channelId,
          last_read_at: new Date().toISOString()
        })

      // Clear unread count for this channel
      setChannelUnreadCounts(prev => ({
        ...prev,
        [channelId]: 0
      }))
    } catch (error) {
      console.error('Error marking channel as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      // Mark all channels as read
      const { data: channels } = await supabase
        .from('channels')
        .select('id')

      const channelUpdates = channels?.map(channel => ({
        user_id: user.id,
        channel_id: channel.id,
        last_read_at: new Date().toISOString()
      })) || []

      await supabase
        .from('last_read')
        .upsert(channelUpdates)

      // Mark all DMs as read
      const { data: dms } = await supabase
        .from('direct_messages')
        .select('DISTINCT sender_id')
        .eq('receiver_id', user.id)

      const dmUpdates = dms?.map(dm => ({
        user_id: user.id,
        other_user_id: dm.sender_id,
        last_read_at: new Date().toISOString()
      })) || []

      await supabase
        .from('dm_last_read')
        .upsert(dmUpdates)

      // Clear all unread counts
      setChannelUnreadCounts({})
      setDmUnreadCounts({})
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  return {
    channelUnreadCounts,
    dmUnreadCounts,
    markChannelAsRead,
    markAllAsRead
  }
} 