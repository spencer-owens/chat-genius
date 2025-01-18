'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'

type Tables = Database['public']['Tables']
type UserStatus = Tables['users']['Row']['status']

export function useUserPresence() {
  const { 
    currentUser,
    userPresence,
    setUserPresence
  } = useStore()
  const supabase = createClient()

  const getUserStatus = (userId: string): UserStatus => {
    return userPresence[userId] || 'offline'
  }

  useEffect(() => {
    if (!currentUser?.id) return

    // Set initial status to online
    async function updateStatus(status: UserStatus) {
      if (!currentUser?.id) return
      
      try {
        const { error } = await supabase
          .from('users')
          .update({ status })
          .eq('id', currentUser.id)

        if (error) throw error
        setUserPresence(currentUser.id, status)
      } catch (error) {
        console.error('Error updating user status:', error)
        toast.error('Error updating status')
      }
    }

    // Set status to online when component mounts
    updateStatus('online')

    // Set status to offline when window is closed or component unmounts
    const handleBeforeUnload = async () => {
      if (!currentUser?.id) return
      
      try {
        const { error } = await supabase
          .from('users')
          .update({ status: 'offline' })
          .eq('id', currentUser.id)
        
        if (error) {
          console.error('Error updating offline status:', error)
        }
      } catch (error) {
        console.error('Error updating offline status:', error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updateStatus('offline')
    }
  }, [currentUser])

  return { userPresence, getUserStatus }
} 