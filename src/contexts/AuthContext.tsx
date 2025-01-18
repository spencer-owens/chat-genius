'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import useStore from '@/store'
import { Database } from '@/types/supabase'

const supabase = createClient()

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { setCurrentUser, setChannels, setDMUsers } = useStore()

  // Memoize the updateUserProfile function to prevent unnecessary recreations
  const updateUserProfile = useCallback(async (session: { user: User }) => {
    try {
      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // If profile doesn't exist, create it
      if (!profile && profileError?.code === 'PGRST116') {
        // Ensure we have valid values for required fields
        const email = session.user.email
        const username = session.user.user_metadata?.username || session.user.email?.split('@')[0]

        if (!email || !username) {
          console.error('Missing required user data:', { email, username })
          return false
        }

        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email,
            username,
            status: 'online' as Enums['user_status'],
            is_verified: session.user.email_confirmed_at ? true : false
          })
          .select()

        if (createError) {
          console.error('Error creating missing profile:', createError)
          toast.error('Error creating user profile')
          return false
        }
      } else if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError)
        return false
      }

      // Update is_verified if user is confirmed
      if (session.user.email_confirmed_at && profile && !profile.is_verified) {
        const { error: verifyError } = await supabase
          .from('users')
          .update({ is_verified: true })
          .eq('id', session.user.id)

        if (verifyError) {
          console.error('Error updating verification status:', verifyError)
        }
      }

      // Update status to online
      const { error: statusError } = await supabase
        .from('users')
        .update({ status: 'online' as Enums['user_status'] })
        .eq('id', session.user.id)

      if (statusError) {
        console.error('Error updating online status:', statusError)
      }

      return true
    } catch (error) {
      console.error('Error updating user profile:', error)
      return false
    }
  }, [])

  // Memoize the setUserState function to ensure consistent updates
  const setUserState = useCallback((newUser: User | null) => {
    setUser(newUser)
    setCurrentUser(newUser)
  }, [setCurrentUser])

  useEffect(() => {
    let mounted = true

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            setUserState(session.user)
            // Update profile in the background
            updateUserProfile(session)
            
            // Fetch initial data
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

              // Fetch DM users
              const { data: dmData } = await supabase
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
                .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
                .throwOnError()

              if (dmData) {
                // Extract unique users excluding current user
                const uniqueUsers = new Map()
                dmData.forEach(msg => {
                  const otherUser = msg.sender.id === session.user.id ? msg.receiver : msg.sender
                  uniqueUsers.set(otherUser.id, otherUser)
                })
                setDMUsers(Array.from(uniqueUsers.values()))
              }
            } catch (e) {
              console.error('Error fetching initial data:', e)
            }
          } else {
            setUserState(null)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setUserState(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session)
      
      if (!mounted) return

      if (session?.user) {
        setUserState(session.user)
        
        if (event === 'SIGNED_IN') {
          // Update profile in the background
          const success = await updateUserProfile(session)
          if (success) {
            router.push('/')
          } else {
            await supabase.auth.signOut()
            router.push('/login')
          }
        }
      } else {
        setUserState(null)
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [updateUserProfile, setUserState, router, setChannels])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Error signing in')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true)
      // First check if username is available
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking username:', checkError)
        throw new Error('Error checking username availability')
      }

      if (existingUser) {
        throw new Error('Username already taken')
      }

      // Sign up the user
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      })
      
      if (signUpError) throw signUpError

      toast.success('Check your email to confirm your account')
      router.push('/login?message=Check your email to confirm your account')
    } catch (error: any) {
      toast.error(error.message || 'Error signing up')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      // Update status to offline before signing out
      if (user) {
        await supabase
          .from('users')
          .update({ status: 'offline' as Enums['user_status'] })
          .eq('id', user.id)
      }
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Error signing out')
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 