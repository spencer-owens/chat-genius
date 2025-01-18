import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'
import { useRealtimeSubscription } from './useRealtimeSubscription'

type Tables = Database['public']['Tables']
type User = Tables['users']['Row']

export function useUsers() {
  const { 
    currentUser,
    userPresence,
    setUserPresence
  } = useStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Use our new realtime subscription
  useRealtimeSubscription('users', 'all')

  useEffect(() => {
    async function fetchUsers() {
      try {
        if (!currentUser) return

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .neq('id', currentUser.id)
          .order('username')

        if (error) throw error

        // Initialize presence for each user
        data.forEach(user => {
          setUserPresence(user.id, user.status)
        })

        setUsers(data)
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [currentUser])

  // Combine full user data with presence status
  const usersWithPresence = users.map(user => ({
    ...user,
    status: userPresence[user.id] || user.status
  }))

  return { users: usersWithPresence, loading }
} 