import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function useDMUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  useEffect(() => {
    if (!currentUser) {
      setUsers([])
      setLoading(false)
      return
    }

    async function fetchDMUsers() {
      try {
        const { data, error } = await supabase
          .from('direct_messages')
          .select(`
            sender:users!sender_id(
              id, 
              username, 
              status, 
              profile_picture
            ),
            receiver:users!receiver_id(
              id, 
              username, 
              status, 
              profile_picture
            )
          `)
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)

        if (error) throw error

        // Extract unique users excluding current user
        const uniqueUsers = new Map()
        data?.forEach(msg => {
          const otherUser = msg.sender.id === currentUser.id ? msg.receiver : msg.sender
          uniqueUsers.set(otherUser.id, otherUser)
        })

        setUsers(Array.from(uniqueUsers.values()))
      } catch (error) {
        console.error('Error fetching DM users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDMUsers()
  }, [currentUser])

  return { users, loading }
} 