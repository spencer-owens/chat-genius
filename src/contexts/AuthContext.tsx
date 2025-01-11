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
      
      if (event === 'SIGNED_IN') {
        // Check if user has a profile
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', session!.user.id)
          .single()

        // If no profile exists and user is confirmed, create profile
        if (!profile && session?.user.email_confirmed_at) {
          const { error: profileError } = await supabase
            .from('users')
            .insert([
              {
                id: session.user.id,
                username: session.user.user_metadata.username,
                email: session.user.email,
                status: 'offline'
              },
            ])
          
          if (profileError) {
            console.error('Error creating profile:', profileError)
            toast.error('Error creating user profile')
            await supabase.auth.signOut()
            router.push('/login')
            return
          }
        }

        // Redirect to home page on successful sign in
        router.push('/')
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
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        throw new Error('Username already taken')
      }

      // Sign up the user
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username // Store username in auth metadata
          }
        }
      })
      
      if (signUpError) throw signUpError

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