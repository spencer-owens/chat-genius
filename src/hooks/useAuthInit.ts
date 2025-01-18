import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'

export function useAuthInit() {
  const router = useRouter()
  const { 
    setSession,
    setLoading,
    updateUserProfile,
    setCurrentUser,
    setChannels,
    refreshDMUsers
  } = useStore()

  useEffect(() => {
    let mounted = true

    const fetchInitialData = async () => {
      const supabase = createClient()
      try {
        // Fetch channels
        const { data: channelsData } = await supabase
          .from('channels')
          .select(`
            *,
            memberships(
              user_id,
              is_admin
            )
          `)
          .order('created_at', { ascending: true })
          .throwOnError()

        setChannels(channelsData || [])

        // Refresh DM users
        await refreshDMUsers()
      } catch (e) {
        console.error('Error fetching initial data:', e)
      }
    }

    const initializeAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            setSession(session)
            
            // Fetch database user
            const { data: dbUser } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (dbUser) {
              setCurrentUser(dbUser)
            }
            
            // Update profile in the background
            await updateUserProfile(session)
            
            // Fetch initial data
            await fetchInitialData()
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in auth initialization:', error)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session)
      
      if (!mounted) return

      if (session?.user) {
        setSession(session)
        
        // Fetch database user
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (dbUser) {
          setCurrentUser(dbUser)
        }
        
        if (event === 'SIGNED_IN') {
          // Update profile in the background
          const success = await updateUserProfile(session)
          if (success) {
            // Fetch initial data after successful sign in
            await fetchInitialData()
            router.push('/')
          } else {
            await supabase.auth.signOut()
            router.push('/login')
          }
        }
      } else {
        setSession(null)
        setCurrentUser(null)
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, setSession, setLoading, updateUserProfile, setCurrentUser, setChannels, refreshDMUsers])
} 