import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']

type DMUser = {
  id: string
  username: string
  status: Enums['user_status']
  profile_picture: string | null
  email: string
  created_at: string | null
  updated_at: string | null
  is_verified: boolean | null
}

export function useDMUsers() {
  const { currentUser, dmUsers, setDMUsers } = useStore()
  const supabase = createClient()

  useEffect(() => {
    if (!currentUser?.id) {
      setDMUsers([])
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
              profile_picture,
              email,
              created_at,
              updated_at,
              is_verified
            ),
            receiver:users!receiver_id(
              id, 
              username, 
              status, 
              profile_picture,
              email,
              created_at,
              updated_at,
              is_verified
            )
          `)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

        if (error) {
          toast.error('Failed to fetch DM users')
          throw error
        }

        // Extract unique users excluding current user
        const uniqueUsers = new Map<string, DMUser>()
        data?.forEach(msg => {
          const otherUser = msg.sender.id === userId ? msg.receiver : msg.sender
          uniqueUsers.set(otherUser.id, otherUser as DMUser)
        })

        setDMUsers(Array.from(uniqueUsers.values()))
      } catch (error) {
        console.error('Error fetching DM users:', error)
      }
    }

    fetchDMUsers()

    // Subscribe to changes in direct_messages table
    const subscription = supabase
      .channel('direct_messages_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'direct_messages'
      }, () => {
        // Refetch DM users when there are changes
        fetchDMUsers()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [currentUser, setDMUsers])

  return { users: dmUsers || [], loading: false }
} 