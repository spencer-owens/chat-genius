import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type UserRow = Tables['users']['Row']

export function useChannelMembers(channelId: string | null) {
  const { 
    channels,
    updateChannel
  } = useStore()
  const supabase = createClient()

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

    const channel = supabase
      .channel('memberships')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memberships',
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          // Refetch members on any change
          fetchMembers(channelId)
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Error subscribing to channel members:', err)
          toast.error('Lost connection to channel members')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [channelId])

  if (!channelId) return { members: [] }
  const currentChannel = channels.find(c => c.id === channelId)
  return { members: currentChannel?.memberships || [] }
} 