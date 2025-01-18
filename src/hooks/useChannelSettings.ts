import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type Channel = Tables['channels']['Row']

export function useChannelSettings(channelId: string | null) {
  const { 
    currentUser,
    channels,
    updateChannel,
    removeChannel
  } = useStore()
  const supabase = createClient()

  const updateSettings = useCallback(async (settings: Partial<Channel>) => {
    if (!channelId || !currentUser?.id) return

    try {
      const { data: channel, error } = await supabase
        .from('channels')
        .update(settings)
        .eq('id', channelId)
        .select('*, memberships(user_id, is_admin)')
        .single()

      if (error) throw error
      if (channel) {
        updateChannel(channel)
      }
    } catch (error) {
      console.error('Error updating channel settings:', error)
      toast.error('Failed to update channel settings')
    }
  }, [channelId, currentUser])

  const deleteChannel = useCallback(async () => {
    if (!channelId || !currentUser?.id) return

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId)

      if (error) throw error
      removeChannel(channelId)
    } catch (error) {
      console.error('Error deleting channel:', error)
      toast.error('Failed to delete channel')
    }
  }, [channelId, currentUser])

  const currentChannel = channelId ? channels.find(c => c.id === channelId) : null
  const isAdmin = currentChannel?.memberships.some(m => 
    m.user_id === currentUser?.id && m.is_admin
  ) || false

  return { 
    channel: currentChannel,
    isAdmin,
    updateSettings,
    deleteChannel
  }
} 