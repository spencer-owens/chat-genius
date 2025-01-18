import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'

export function useCurrentUser() {
  const { 
    currentUser,
    setCurrentUser
  } = useStore()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error fetching session:', error)
        return
      }
      if (session?.user) {
        setCurrentUser(session.user)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user)
      } else {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { 
    user: currentUser,
    loading: false // Loading state is now handled by the store
  }
} 