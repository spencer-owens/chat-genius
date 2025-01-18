import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export function useChannelMembers(channelId: string | null) {
  const { 
    channels,
    updateChannel
  } = useStore()
  const supabase = createClient()

  // Use our new realtime subscription
  useRealtimeSubscription('memberships', channelId || '')

  useEffect(() => {
    if (!channelId) return

    async function fetchMembers(id: string) {
      try {
        const { data: channel, error } = await supabase
          .from('channels')
          .select(`
            *,
            memberships(user_id, is_admin)
          `)
          .eq('id', id)
          .single()

        if (error) throw error
        if (channel) {
          updateChannel(channel)
        }
      } catch (error) {
        console.error('Error fetching channel members:', error)
        toast.error('Failed to load channel members')
      }
    }

    fetchMembers(channelId)
  }, [channelId])

  if (!channelId) return { members: [] }
  const currentChannel = channels.find(c => c.id === channelId)
  return { members: currentChannel?.memberships || [] }
} 