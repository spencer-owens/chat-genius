import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export function useChannels() {
  const { 
    channels,
    setChannels
  } = useStore()
  const supabase = createClient()

  // Use our new realtime subscription
  useRealtimeSubscription('channels', 'all')

  useEffect(() => {
    async function fetchChannels() {
      try {
        const { data, error } = await supabase
          .from('channels')
          .select(`
            *,
            memberships(
              user_id,
              is_admin
            )
          `)
          .order('created_at', { ascending: true })

        if (error) throw error
        setChannels(data || [])
      } catch (e) {
        console.error('Error fetching channels:', e)
      }
    }

    fetchChannels()
  }, [])

  return { 
    channels, 
    loading: false
  }
} 