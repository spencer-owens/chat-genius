'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/app/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notification } from '@/app/components/Notification'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = getSupabase()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    
    console.log('🔑 Login - Starting login attempt', {
      email,
      timestamp: new Date().toISOString()
    })
    
    setError(null)
    setIsLoading(true)

    try {
      console.log('🔑 Login - Calling signInWithPassword')
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('🔑 Login - Sign in response:', {
        success: !!data?.session,
        error: signInError?.message,
        timestamp: new Date().toISOString()
      })

      if (signInError) throw signInError

      if (data?.session) {
        console.log('🔑 Login - Session obtained, let the layout handle redirect')
        // Deliberately do not force redirect here;
        // RootLayout will see the session and router.replace('/')
      }
    } catch (error: any) {
      console.error('🔑 Login - Error during login:', {
        error: error.message,
        timestamp: new Date().toISOString()
      })
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (isLoading) return
    
    console.log('🔑 Login - Attempting to resend confirmation email', {
      email,
      timestamp: new Date().toISOString()
    })

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })
      if (resendError) throw resendError
      toast.success('Confirmation email resent. Please check your inbox.')
      console.log('🔑 Login - Confirmation email resent successfully')
    } catch (error: any) {
      console.error('🔑 Login - Error resending confirmation:', {
        error: error.message,
        timestamp: new Date().toISOString()
      })
      toast.error('Failed to resend confirmation email. Please try again.')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-gray-100">
      <Notification />
      <div className="p-8 bg-white rounded shadow-md w-full max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        {error && (
          <div className="text-red-500 mb-4 text-center">
            <p>{error}</p>
            {error.includes('Email not confirmed') && (
              <Button 
                onClick={handleResendConfirmation} 
                variant="link" 
                className="mt-2"
                disabled={isLoading}
              >
                Resend confirmation email
              </Button>
            )}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="mb-6">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <p className="mt-4 text-center">
          Don't have an account? <Link href="/profile/signup" className="text-blue-500 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
} 