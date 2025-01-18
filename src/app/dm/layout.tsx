'use client'

import { Layout } from '@/components/layout/Layout'
import { useUsers } from '@/hooks/useUsers'
import useStore from '@/store'
import Link from 'next/link'
import { Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useUserPresence } from '@/hooks/useUserPresence'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']

type DMUser = {
  id: string
  username: string
  status: Enums['user_status']
  profile_picture: string | null
  email: string
  created_at: string | null
  updated_at: string | null
  is_verified: boolean | null
}

interface DMLayoutProps {
  children: React.ReactNode
}

export default function DMLayout({ children }: DMLayoutProps) {
  const { users, loading } = useUsers()
  const { currentUser } = useStore()
  const pathname = usePathname()
  const { getUserStatus } = useUserPresence()
  
  if (loading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </Layout>
    )
  }

  if (!currentUser) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-400">Please sign in to view messages</p>
        </div>
      </Layout>
    )
  }

  const otherUsers = (users as DMUser[]).filter(u => u.id !== currentUser?.id)

  return (
    <Layout>
      <div className="flex h-full">
        {/* DM Users Panel */}
        <div className="w-64 bg-gray-800 border-r border-gray-700">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Direct Messages</h2>
            <div className="space-y-2">
              {otherUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/dm/${user.id}`}
                  className={cn(
                    "flex items-center p-2 rounded-md hover:bg-gray-700",
                    pathname === `/dm/${user.id}` && "bg-gray-700"
                  )}
                >
                  <div className="flex-shrink-0">
                    {user.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.username}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white">
                          {user.username ? user.username[0].toUpperCase() : '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">{user.username}</p>
                    <div className="flex items-center space-x-1">
                      <Circle className={cn(
                        'h-2 w-2',
                        getUserStatus(user.id) === 'online' ? 'text-green-500' : 
                        getUserStatus(user.id) === 'away' ? 'text-yellow-500' :
                        getUserStatus(user.id) === 'busy' ? 'text-red-500' :
                        'text-gray-500'
                      )} />
                      <span className="text-xs text-gray-400 capitalize">
                        {getUserStatus(user.id)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </Layout>
  )
} 