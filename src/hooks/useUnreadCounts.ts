import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { usePathname } from 'next/navigation'

const supabase = createClient()

// Helper function to log with timestamp
const logWithTime = (message: string, data: unknown = ''): void => {
  console.log(`[${new Date().toISOString()}] ${message}`, data)
}

interface UnreadCount {
  count: number
  lastReadAt: string | null
}

interface Message {
  id: string
  content: string
  created_at: string
  channel_id: string
  sender_id: string
}

interface DirectMessage {
  id: string
  content: string
  created_at: string
  sender_id: string
  receiver_id: string
}

export function useUnreadCounts(user: User | null) {
  const [loading, setLoading] = useState(false)
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, UnreadCount>>({})
  const [dmUnreadCounts, setDmUnreadCounts] = useState<Record<string, UnreadCount>>({})
  const lastReadTimestamps = useRef<Record<string, string>>({})
  const subscriptionsRef = useRef<{ channels?: any; dms?: any }>({})
  const pathname = usePathname()
  const initialLoadDone = useRef(false)

  // Helper functions to fetch unread counts
  const fetchChannelUnreadCount = useCallback(async (channelId: string): Promise<number> => {
    if (!user) return 0

    try {
      const lastReadAt = lastReadTimestamps.current[`channel:${channelId}`] || '1970-01-01'

      // Get the count of messages after the last read timestamp
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .neq('sender_id', user.id)
        .gt('created_at', lastReadAt)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error fetching channel unread count:', error)
      return 0
    }
  }, [user])

  const fetchDMUnreadCount = useCallback(async (senderId: string): Promise<number> => {
    if (!user) return 0

    try {
      const lastReadAt = lastReadTimestamps.current[`dm:${senderId}`] || '1970-01-01'

      // Get the count of messages after the last read timestamp
      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)
        .gt('created_at', lastReadAt)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error fetching DM unread count:', error)
      return 0
    }
  }, [user])

  const markChannelAsRead = useCallback(async (channelId: string) => {
    if (!user?.id) return

    try {
      const now = new Date().toISOString()
      
      // Update the last read timestamp in our ref first for immediate feedback
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
        console.error('Error marking channel as read:', error)
        // If the database update fails, revert the UI and ref
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
    } catch (error) {
      console.error('Error marking channel as read:', error)
      toast.error('Failed to mark channel as read')
    }
  }, [user, fetchChannelUnreadCount])

  const markDmAsRead = useCallback(async (otherUserId: string) => {
    if (!user?.id) return

    try {
      const now = new Date().toISOString()
      
      // Update the last read timestamp in our ref first for immediate feedback
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
        console.error('Error marking DM as read:', error)
        // If the database update fails, revert the UI and ref
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
    } catch (error) {
      console.error('Error marking DM as read:', error)
      toast.error('Failed to mark messages as read')
    }
  }, [user, fetchDMUnreadCount])

  // Cleanup function for subscriptions
  const cleanupSubscriptions = useCallback(() => {
    if (subscriptionsRef.current.channels) {
      subscriptionsRef.current.channels.unsubscribe()
      subscriptionsRef.current.channels = null
    }
    if (subscriptionsRef.current.dms) {
      subscriptionsRef.current.dms.unsubscribe()
      subscriptionsRef.current.dms = null
    }
  }, [])

  // Setup subscriptions
  const setupSubscriptions = useCallback(() => {
    if (!user?.id || subscriptionsRef.current.channels || subscriptionsRef.current.dms) return

    // Subscribe to new messages in channels
    subscriptionsRef.current.channels = supabase
      .channel('unread_counts_channels')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${user.id}`
        },
        async (payload: { new: Message }) => {
          if (!payload.new.channel_id || !user?.id) return
          const channelId = payload.new.channel_id
          
          const isViewingChannel = pathname === `/channels/${channelId}`
          if (isViewingChannel) {
            await markChannelAsRead(channelId)
          } else {
            // Simple state update for unread count
            setChannelUnreadCounts(prev => ({
              ...prev,
              [channelId]: {
                count: (prev[channelId]?.count || 0) + 1,
                lastReadAt: prev[channelId]?.lastReadAt || null
              }
            }))
          }
        }
      )
      .subscribe()

    // Subscribe to new DMs
    subscriptionsRef.current.dms = supabase
      .channel('unread_counts_dms')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload: { new: DirectMessage }) => {
          if (!user?.id) return
          const senderId = payload.new.sender_id
          
          const isViewingDM = pathname === `/dm/${senderId}`
          if (isViewingDM) {
            await markDmAsRead(senderId)
          } else {
            // Simple state update for unread count
            setDmUnreadCounts(prev => ({
              ...prev,
              [senderId]: {
                count: (prev[senderId]?.count || 0) + 1,
                lastReadAt: prev[senderId]?.lastReadAt || null
              }
            }))
          }
        }
      )
      .subscribe()
  }, [user, pathname, markChannelAsRead, markDmAsRead])

  // Effect for initial data load and subscription setup
  useEffect(() => {
    if (!user?.id) {
      setChannelUnreadCounts({})
      setDmUnreadCounts({})
      setLoading(false)
      initialLoadDone.current = false
      cleanupSubscriptions()
      return
    }

    let mounted = true
    setLoading(true)

    // Initial data load
    async function loadInitialData() {
      try {
        const currentChannelId = pathname?.match(/^\/channels\/(.+)$/)?.[1]
        const currentDmId = pathname?.match(/^\/dm\/(.+)$/)?.[1]

        // Fetch last read timestamps
        const [channelLastRead, dmLastRead] = await Promise.all([
          supabase
            .from('last_read')
            .select('channel_id, last_read_at')
            .eq('user_id', user.id),
          supabase
            .from('dm_last_read')
            .select('other_user_id, last_read_at')
            .eq('user_id', user.id)
        ])

        if (!mounted) return

        // Update timestamps
        channelLastRead.data?.forEach(({ channel_id, last_read_at }) => {
          lastReadTimestamps.current[`channel:${channel_id}`] = last_read_at
        })

        dmLastRead.data?.forEach(({ other_user_id, last_read_at }) => {
          lastReadTimestamps.current[`dm:${other_user_id}`] = last_read_at
        })

        // Mark current page as read
        if (currentChannelId) {
          await markChannelAsRead(currentChannelId)
        } else if (currentDmId) {
          await markDmAsRead(currentDmId)
        }

        // Set initial counts
        const [channels, dmSenders] = await Promise.all([
          supabase.from('channels').select('id'),
          supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .neq('sender_id', user.id)
        ])

        if (!mounted) return

        // Calculate initial counts
      const channelCounts: Record<string, UnreadCount> = {}
        const dmCounts: Record<string, UnreadCount> = {}

        await Promise.all([
          ...channels.data!.map(async channel => {
            if (channel.id === currentChannelId) {
              channelCounts[channel.id] = { count: 0, lastReadAt: new Date().toISOString() }
            } else {
        const count = await fetchChannelUnreadCount(channel.id)
        channelCounts[channel.id] = {
          count,
          lastReadAt: lastReadTimestamps.current[`channel:${channel.id}`] || null
        }
            }
          }),
          ...[...new Set(dmSenders.data?.map(dm => dm.sender_id))].map(async senderId => {
            if (senderId === currentDmId) {
              dmCounts[senderId] = { count: 0, lastReadAt: new Date().toISOString() }
            } else {
              const count = await fetchDMUnreadCount(senderId)
              dmCounts[senderId] = {
                count,
                lastReadAt: lastReadTimestamps.current[`dm:${senderId}`] || null
              }
            }
          })
        ])

        if (!mounted) return

      setChannelUnreadCounts(channelCounts)
        setDmUnreadCounts(dmCounts)
        initialLoadDone.current = true
      } catch (error) {
        console.error('Error loading initial data:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadInitialData()
    setupSubscriptions()

    return () => {
      mounted = false
      cleanupSubscriptions()
    }
  }, [user, pathname, cleanupSubscriptions, setupSubscriptions, markChannelAsRead, markDmAsRead])

  // Effect to handle page changes
  useEffect(() => {
    if (!user?.id || !pathname || !initialLoadDone.current) return

    const channelId = pathname.match(/^\/channels\/(.+)$/)?.[1]
    const dmId = pathname.match(/^\/dm\/(.+)$/)?.[1]

    if (channelId) {
      markChannelAsRead(channelId)
    } else if (dmId) {
      markDmAsRead(dmId)
    }
  }, [pathname, user, markChannelAsRead, markDmAsRead])

  return {
    loading,
    channelUnreadCounts,
    dmUnreadCounts,
    markChannelAsRead,
    markDmAsRead
  }
} 