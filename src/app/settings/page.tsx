'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { supabase } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/client'
import { UserPresenceIndicator } from '@/components/shared/UserPresenceIndicator'
import { NotificationBanner } from '@/components/shared/NotificationBanner'
import { Camera, Loader2, LogOut } from 'lucide-react'

export default function SettingsPage() {
  const { user, loading: userLoading } = useCurrentUser()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    notifications_enabled: false,
    theme: 'dark'
  })

  // Initialize form data when user is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        notifications_enabled: user.notifications_enabled || false,
        theme: user.theme || 'dark'
      })
    }
  }, [user])

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `profile-pictures/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture: filePath })
        .eq('id', user.id)

      if (updateError) throw updateError

      setNotification({ type: 'success', message: 'Profile picture updated successfully' })
    } catch (error) {
      setNotification({ type: 'error', message: 'Error updating profile picture' })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: formData.username,
          notifications_enabled: formData.notifications_enabled,
          theme: formData.theme
        })
        .eq('id', user.id)

      if (error) throw error

      setNotification({ type: 'success', message: 'Settings updated successfully' })
      setIsEditing(false)
    } catch (error) {
      setNotification({ type: 'error', message: 'Error updating settings' })
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
      setNotification({
        type: 'error',
        message: 'Failed to sign out. Please try again.'
      })
    }
  }

  if (userLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">Please sign in to view settings</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </button>
        </div>

        {notification && (
          <NotificationBanner
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
            className="mb-6"
          />
        )}

        <div className="space-y-8">
          {/* Profile Section */}
          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">Profile</h2>

            <div className="flex items-center mb-6">
              <div className="relative mr-4">
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.username || 'Profile'}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-600 flex items-center justify-center">
                    <span className="text-2xl text-white">{(user.username || 'U')[0]}</span>
                  </div>
                )}
                <label className="absolute bottom-0 right-0 p-1 bg-gray-700 rounded-full cursor-pointer hover:bg-gray-600">
                  <Camera className="h-4 w-4 text-white" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div>
                <UserPresenceIndicator status={user.status || 'offline'} className="mb-2" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-transparent focus:border-blue-500 focus:ring-0 text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="mt-1 block w-full rounded-md bg-gray-700 border-transparent text-white opacity-50"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={formData.notifications_enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifications_enabled: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded bg-gray-700 border-transparent focus:ring-blue-500 text-blue-500"
                />
                <label htmlFor="notifications" className="ml-2 text-sm text-gray-200">
                  Enable notifications
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Theme
                </label>
                <select
                  value={formData.theme}
                  onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-transparent focus:border-blue-500 focus:ring-0 text-white disabled:opacity-50"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm text-gray-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-600"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </Layout>
  )
} 