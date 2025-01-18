import { useEffect } from 'react'
import useStore from '@/store'
import { useRealtimeSubscription } from './useRealtimeSubscription'

export function useDMUsers() {
  const { 
    currentUser,
    dmUsers,
    refreshDMUsers
  } = useStore()

  // Use our new realtime subscription
  useRealtimeSubscription('direct_messages', currentUser?.id || '')

  useEffect(() => {
    if (!currentUser?.id) return
    refreshDMUsers()
  }, [currentUser])

  return { dmUsers }
} 