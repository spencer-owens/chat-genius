import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'

export function useChannels() {
  const { 
    channels,
    setChannels,
    initializeSubscriptions
  } = useStore()
  const supabase = createClient()

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
    const cleanup = initializeSubscriptions()
    
    return cleanup
  }, [])

  return { 
    channels, 
    loading: false // Loading state is now handled by the store
  }
} 