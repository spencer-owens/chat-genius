import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

type Status = 'online' | 'offline' | 'away' | 'busy'

interface User {
  id: string
  username: string
  email: string
  profile_picture?: string
  status: Status
  created_at: string
  updated_at: string
}

export function useUserPresence() {
  const supabase = createClient()
  const { user, setUser } = useCurrentUser()
  const [userStatuses, setUserStatuses] = useState<Record<string, Status>>({})

  // Initial fetch of all user statuses
  useEffect(() => {
    if (!user) return

    async function fetchInitialStatuses() {
      const { data, error } = await supabase
        .from('users')
        .select('id, status')
      
      if (error) {
        console.error('Error fetching initial statuses:', error)
        return
      }

      const statusMap = data.reduce((acc, user) => ({
        ...acc,
        [user.id]: user.status
      }), {} as Record<string, Status>)

      setUserStatuses(statusMap)
    }

    fetchInitialStatuses()
  }, [user])

  const updateStatus = async (status: Status) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', user.id)

      if (error) throw error
      
      // Update local state immediately
      setUser((prev: User | null) => prev ? { ...prev, status } : null)
      setUserStatuses(prev => ({
        ...prev,
        [user.id]: status
      }))
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  useEffect(() => {
    if (!user) return

    // Subscribe to real-time status updates
    const channel = supabase.channel('user-presence')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload: { new: User }) => {
          console.log('User status changed:', payload)
          const updatedUser = payload.new
          
          // Update statuses in local state
          setUserStatuses(prev => ({
            ...prev,
            [updatedUser.id]: updatedUser.status
          }))

          // If this is our own status update, update user state too
          if (updatedUser.id === user.id) {
            setUser(prev => prev ? { ...prev, status: updatedUser.status } : null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const getUserStatus = (userId: string): Status => {
    return userStatuses[userId] || 'offline'
  }

  return { updateStatus, getUserStatus }
} 