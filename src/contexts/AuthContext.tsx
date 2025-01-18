'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { toast } from 'sonner'

// Extended user type that includes profile data
interface User extends SupabaseUser {
  username: string
  email: string
  profile_picture?: string
  status: 'online' | 'offline' | 'away' | 'busy'
  is_verified: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()

  // Fetch user profile data
  const fetchUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, username, email, profile_picture, status, is_verified, created_at, updated_at')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        // Only create profile if it truly doesn't exist
        if (profileError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .upsert([
              {
                id: authUser.id,
                email: authUser.email,
                username: authUser.user_metadata?.username || authUser.email?.split('@')[0],
                status: 'online',
                is_verified: authUser.email_confirmed_at ? true : false
              }
            ], {
              onConflict: 'id',
              ignoreDuplicates: true
            })
            .select('id, username, email, profile_picture, status, is_verified, created_at, updated_at')
            .single()

          if (createError) {
            console.error('Error creating user profile:', createError)
            throw createError
          }

          return { ...authUser, ...newProfile }
        }
        throw profileError
      }

      return { ...authUser, ...profile }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  }

  // Update user status
  const updateUserStatus = async (userId: string, status: 'online' | 'offline' | 'away' | 'busy') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  // Refresh user data
  const refreshUser = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authUser) {
        setUser(null)
        return
      }

      const profileUser = await fetchUserProfile(authUser)
      setUser(profileUser)
    } catch (error) {
      console.error('Error refreshing user:', error)
      setError(error as Error)
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check active session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const profileUser = await fetchUserProfile(session.user)
          setUser(profileUser)
          await updateUserStatus(session.user.id, 'online')
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setError(error as Error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const profileUser = await fetchUserProfile(session.user)
          setUser(profileUser)
          await updateUserStatus(session.user.id, 'online')
          router.push('/')
        } catch (error) {
          console.error('Error in auth state change:', error)
          toast.error('Error loading user profile')
          await supabase.auth.signOut()
          router.push('/login')
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/login')
      }
    })

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (user) {
        updateUserStatus(user.id, document.hidden ? 'away' : 'online')
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Handle window close/unload
    const handleBeforeUnload = () => {
      if (user) {
        // Use sync XHR for reliability during page unload
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/user/offline', false) // false makes it synchronous
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.send(JSON.stringify({ userId: user.id }))
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (user) {
        updateUserStatus(user.id, 'offline')
      }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Error signing in')
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const username = email.split('@')[0]

      // Check username availability
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (checkError) throw new Error('Error checking username availability')
      if (existingUser) throw new Error('Username already taken')

      // Sign up user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      })
      
      if (signUpError) throw signUpError

      // Create user profile immediately
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              username,
              status: 'offline',
              is_verified: false
            }
          ])
        
        if (profileError && profileError.code !== '23505') { // Ignore duplicate key errors
          throw profileError
        }
      }

      toast.success('Check your email to confirm your account')
      router.push('/login?message=Check your email to confirm your account')
    } catch (error: any) {
      toast.error(error.message || 'Error signing up')
      throw error
    }
  }

  const signOut = async () => {
    try {
      if (user) {
        await updateUserStatus(user.id, 'offline')
      }
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      router.push('/login')
    } catch (error: any) {
      toast.error(error.message || 'Error signing out')
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error,
      signIn, 
      signUp, 
      signOut,
      refreshUser
    }}>
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