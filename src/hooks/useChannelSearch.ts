import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type Channel = Tables['channels']['Row']

interface SearchResults {
  channels: Channel[]
  loading: boolean
  error: string | null
}

export function useChannelSearch() {
  const { 
    currentUser,
    channels,
    setChannels
  } = useStore()
  const [results, setResults] = useState<SearchResults>({
    channels: [],
    loading: false,
    error: null
  })
  const supabase = createClient()

  const searchChannels = useCallback(async (query: string) => {
    if (!currentUser?.id) return

    setResults(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { data: searchResults, error } = await supabase
        .from('channels')
        .select('*, memberships(user_id, is_admin)')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .is('is_private', false)
        .order('name')

      if (error) throw error

      setResults({
        channels: searchResults,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error searching channels:', error)
      setResults(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to search channels'
      }))
      toast.error('Failed to search channels')
    }
  }, [currentUser])

  const joinChannel = useCallback(async (channelId: string) => {
    if (!currentUser?.id) return

    try {
      const { data: membership, error } = await supabase
        .from('memberships')
        .insert({
          channel_id: channelId,
          user_id: currentUser.id,
          is_admin: false
        })
        .select('*, channel:channels(*, memberships(user_id, is_admin))')
        .single()

      if (error) throw error
      if (membership.channel) {
        setChannels([...channels, membership.channel])
        toast.success('Joined channel successfully')
      }
    } catch (error) {
      console.error('Error joining channel:', error)
      toast.error('Failed to join channel')
    }
  }, [currentUser, channels])

  return { 
    ...results,
    searchChannels,
    joinChannel
  }
} 