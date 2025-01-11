'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const TEST_USERS = [
  { email: 'john@example.com', username: 'john_doe' },
  { email: 'jane@example.com', username: 'jane_smith' },
  { email: 'bob@example.com', username: 'bob_wilson' },
  { email: 'alice@example.com', username: 'alice_johnson' },
  { email: 'sam@example.com', username: 'sam_brown' },
]

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await signIn(email, password)
      router.push('/')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Error signing in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          {message && (
            <p className="mt-2 text-center text-sm text-green-500">{message}</p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/signup"
              className="text-sm text-blue-500 hover:text-blue-400"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>

      {/* Test Users Panel */}
      <div className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Test Users</h3>
        <p className="text-gray-400 text-sm mb-4">All users have password: <code className="bg-gray-700 px-2 py-1 rounded">asdf</code></p>
        <div className="space-y-2">
          {TEST_USERS.map((user) => (
            <div 
              key={user.email} 
              className="text-sm text-gray-300 hover:text-white cursor-pointer"
              onClick={() => {
                setEmail(user.email)
                setPassword('asdf')
              }}
            >
              <div className="font-medium">{user.username}</div>
              <div className="text-gray-500">{user.email}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
} 