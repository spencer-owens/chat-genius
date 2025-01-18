import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type Channel = Tables['channels']['Row']
type UserRow = Tables['users']['Row']

export function useChannelInvites(channelId: string | null) {
  const { 
    currentUser,
    channels,
    updateChannel
  } = useStore()
  const supabase = createClient()

  const inviteUser = useCallback(async (userId: string, isAdmin: boolean = false) => {
    if (!channelId || !currentUser?.id) return

    try {
      const { data: membership, error } = await supabase
        .from('memberships')
        .insert({
          channel_id: channelId,
          user_id: userId,
          is_admin: isAdmin
        })
        .select('*, channel:channels(*, memberships(user_id, is_admin))')
        .single()

      if (error) throw error
      if (membership.channel) {
        updateChannel(membership.channel)
        toast.success('User invited successfully')
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      toast.error('Failed to invite user')
    }
  }, [channelId, currentUser])

  const removeUser = useCallback(async (userId: string) => {
    if (!channelId || !currentUser?.id) return

    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .match({
          channel_id: channelId,
          user_id: userId
        })

      if (error) throw error

      // Fetch updated channel data
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('*, memberships(user_id, is_admin)')
        .eq('id', channelId)
        .single()

      if (channelError) throw channelError
      if (channel) {
        updateChannel(channel)
        toast.success('User removed successfully')
      }
    } catch (error) {
      console.error('Error removing user:', error)
      toast.error('Failed to remove user')
    }
  }, [channelId, currentUser])

  const updateUserRole = useCallback(async (userId: string, isAdmin: boolean) => {
    if (!channelId || !currentUser?.id) return

    try {
      const { error } = await supabase
        .from('memberships')
        .update({ is_admin: isAdmin })
        .match({
          channel_id: channelId,
          user_id: userId
        })

      if (error) throw error

      // Fetch updated channel data
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('*, memberships(user_id, is_admin)')
        .eq('id', channelId)
        .single()

      if (channelError) throw channelError
      if (channel) {
        updateChannel(channel)
        toast.success('User role updated successfully')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Failed to update user role')
    }
  }, [channelId, currentUser])

  const currentChannel = channelId ? channels.find(c => c.id === channelId) : null
  const isAdmin = currentChannel?.memberships.some(m => 
    m.user_id === currentUser?.id && m.is_admin
  ) || false

  return { 
    channel: currentChannel,
    isAdmin,
    inviteUser,
    removeUser,
    updateUserRole
  }
} 