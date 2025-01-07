import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data: currentUser } = await supabase.auth.getUser()
        if (!currentUser.user) return

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .neq('id', currentUser.user.id)
          .order('username')

        if (error) throw error
        setUsers(data || [])
      } catch (e) {
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return { users, loading, error }
} 