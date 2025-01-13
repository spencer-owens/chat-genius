'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'

const supabase = createClient()

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

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for changes in auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          // Check if user has a profile
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          // If profile doesn't exist, create it
          if (!profile && profileError?.code === 'PGRST116') {
            const { error: createError } = await supabase
              .from('users')
              .insert([
                {
                  id: session.user.id,
                  email: session.user.email,
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0],
                  status: 'online',
                  is_verified: session.user.email_confirmed_at ? true : false
                }
              ])
              .select()

            if (createError) {
              console.error('Error creating missing profile:', createError)
              toast.error('Error creating user profile')
              await supabase.auth.signOut()
              router.push('/login')
              return
            }
          } else if (profileError) {
            throw profileError
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
            .update({ status: 'online' })
            .eq('id', session.user.id)

          if (statusError) {
            console.error('Error updating online status:', statusError)
          }

          // Redirect to home page on successful sign in
          router.push('/')
        } catch (error) {
          console.error('Error in auth state change:', error)
          toast.error('Error loading user profile')
          await supabase.auth.signOut()
          router.push('/login')
          return
        }
      } else if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
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

  const signUp = async (email: string, password: string, username: string) => {
    try {
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
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (signUpError) throw signUpError

      // Create user profile using service role client
      if (authData.user) {
        // Use a delay to ensure auth is properly set up
        await new Promise(resolve => setTimeout(resolve, 1000))

        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              username,
              email,
              status: 'offline',
              is_verified: false
            }
          ])
          .select()

        if (profileError) {
          console.error('Error creating profile:', profileError)
          // Log additional details for debugging
          console.log('Auth user:', authData.user)
          console.log('Attempted profile creation with:', {
            id: authData.user.id,
            username,
            email
          })
          // Continue anyway - we'll handle profile creation on first login if needed
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
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Error signing out')
      throw error
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