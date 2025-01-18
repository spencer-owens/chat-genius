'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { currentUser, loading, signOut } = useStore()
  const [username, setUsername] = useState(currentUser?.username || '')
  const [updating, setUpdating] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    setUpdating(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({ username })
        .eq('id', currentUser.id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Please sign in to view settings</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-white">Settings</h1>

      <div className="space-y-6 rounded-lg bg-gray-800 p-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Profile</h2>
          <p className="text-sm text-gray-400">Update your profile information</p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-white">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Email</label>
            <p className="mt-1 text-sm text-gray-400">{currentUser.email}</p>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="submit"
              disabled={updating}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Profile'}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 