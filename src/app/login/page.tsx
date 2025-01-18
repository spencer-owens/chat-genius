'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import useStore from '@/store'

const TEST_USERS = [
  { email: 'john@example.com', username: 'john_doe' },
  { email: 'jane@example.com', username: 'jane_smith' },
  { email: 'bob@example.com', username: 'bob_wilson' },
  { email: 'alice@example.com', username: 'alice_johnson' },
  { email: 'sam@example.com', username: 'sam_brown' }
]

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const { signIn, loading } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showTestUsers, setShowTestUsers] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signIn(email, password)
      router.push('/')
    } catch (error) {
      // Error is handled by the store
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold tracking-tight text-white">
            Chat Genius
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold tracking-tight text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-indigo-400 hover:text-indigo-300">
              Create one
            </Link>
          </p>
          {message && (
            <p className="mt-4 text-center text-sm text-green-400">
              {message}
            </p>
          )}
        </div>

        <div className="mt-8">
          <div className="bg-gray-800 px-4 py-8 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-600 bg-gray-700 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-600 bg-gray-700 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>

            {/* Test Users */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowTestUsers(!showTestUsers)}
                className="flex w-full items-center justify-between rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
              >
                <span>Test Users (password: asdf)</span>
                {showTestUsers ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showTestUsers && (
                <div className="mt-2 space-y-2">
                  {TEST_USERS.map((user) => (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => {
                        setEmail(user.email)
                        setPassword('asdf')
                      }}
                      className="flex w-full items-center justify-between rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"
                    >
                      <div>
                        <p className="font-medium text-white">{user.username}</p>
                        <p className="text-gray-400">{user.email}</p>
                      </div>
                      <span className="text-indigo-400">Use</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 