import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type User = Tables['users']['Row']

export function useUsers() {
  const { 
    currentUser,
    userPresence,
    setUserPresence
  } = useStore()
  const supabase = createClient()

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
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    fetchUsers()
  }, [currentUser])

  return { 
    users: Object.entries(userPresence).map(([id, status]) => ({
      id,
      status
    })),
    loading: false
  }
} 