import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useChannels() {
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

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
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchChannels()

    // Set up real-time subscription
    const channelsSubscription = supabase
      .channel('channels')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'channels' },
        (payload) => {
          console.log('Channels change received:', payload)
          fetchChannels() // Refetch channels when changes occur
      })
      .subscribe()

    return () => {
      channelsSubscription.unsubscribe()
    }
  }, [])

  return { channels, loading, error }
} 