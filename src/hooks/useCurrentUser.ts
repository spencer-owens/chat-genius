import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  email: string
  profile_picture?: string
  status: 'online' | 'offline' | 'away' | 'busy'
  created_at: string
  updated_at: string
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    const retryDelay = 1000 // 1 second

    async function fetchUser(retry = false) {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authUser) {
          setUser(null)
          setLoading(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileError) {
          // If profile doesn't exist and we haven't exceeded retries, try again
          if (profileError.code === 'PGRST116' && retryCount < maxRetries) {
            retryCount++
            console.log(`Profile not found, retrying (${retryCount}/${maxRetries})...`)
            setTimeout(() => fetchUser(true), retryDelay)
            return
          }
          throw profileError
        }

        const userData = { ...authUser, ...profile }
        setUser(userData)
        
        // Update user status to online
        const { error: statusError } = await supabase
          .from('users')
          .update({ status: 'online' })
          .eq('id', userData.id)

        if (statusError) {
          console.error('Error updating user status:', statusError)
        }

      } catch (e) {
        const error = e as Error
        setError(error)
        console.error('Error fetching user:', error)
        if (!retry) {
          toast.error('Error loading user profile')
        }
      } finally {
        if (!retry) {
          setLoading(false)
        }
      }
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    // Set status to offline when the window is closed
    const handleBeforeUnload = async () => {
      if (user) {
        await supabase
          .from('users')
          .update({ status: 'offline' })
          .eq('id', user.id)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Set status to offline when component unmounts
      if (user) {
        supabase
          .from('users')
          .update({ status: 'offline' })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error('Error updating offline status:', error)
          })
      }
    }
  }, [])

  return { user, setUser, loading, error }
} 