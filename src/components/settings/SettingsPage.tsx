import { useState } from 'react'
import { UserPresenceIndicator } from '../shared/UserPresenceIndicator'

interface SettingsPageProps {
  user: {
    username: string
    email: string
    profile_picture?: string
    status: 'online' | 'offline' | 'away' | 'busy'
  }
  onUpdateProfile: (data: any) => Promise<void>
  onUpdateStatus: (status: 'online' | 'offline' | 'away' | 'busy') => Promise<void>
}

export function SettingsPage({
  user,
  onUpdateProfile,
  onUpdateStatus
}: SettingsPageProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onUpdateProfile({ username, email })
    setIsEditing(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>
      
      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">Profile</h2>
          
          <div className="flex items-center mb-6">
            <div className="mr-4">
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.username}
                  className="h-20 w-20 rounded-full"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-2xl text-white">{user.username[0]}</span>
                </div>
              )}
            </div>
            
            <div>
              <UserPresenceIndicator status={user.status} className="mb-2" />
              <div className="flex space-x-2">
                {['online', 'away', 'busy', 'offline'].map((status) => (
                  <button
                    key={status}
                    onClick={() => onUpdateStatus(status as any)}
                    className="px-3 py-1 text-sm rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600"
                  >
                    Set {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3">
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
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400">
                  Username
                </label>
                <p className="mt-1 text-white">{user.username}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400">
                  Email
                </label>
                <p className="mt-1 text-white">{user.email}</p>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Edit Profile
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
} 