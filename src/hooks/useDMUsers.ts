import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface DMUser {
  id: string
  username: string
  status: string
  profile_picture?: string
}

type MessageWithUsers = {
  sender: DMUser
  receiver: DMUser
}

export function useDMUsers() {
  const [users, setUsers] = useState<DMUser[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuth()

  useEffect(() => {
    if (!currentUser) {
      setUsers([])
      setLoading(false)
      return
    }

    const userId = currentUser.id

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
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

        if (error) throw error

        // Extract unique users excluding current user
        const uniqueUsers = new Map<string, DMUser>()
        if (data) {
          const messages = data as unknown as MessageWithUsers[]
          messages.forEach(msg => {
            const otherUser = msg.sender.id === userId ? msg.receiver : msg.sender
            uniqueUsers.set(otherUser.id, otherUser)
          })
        }

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