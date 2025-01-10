'use client'

import { Layout } from '@/components/layout/Layout'
import { useUsers } from '@/hooks/useUsers'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import Link from 'next/link'
import { Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useUserPresence } from '@/hooks/useUserPresence'

export default function DMLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { users, loading: usersLoading } = useUsers()
  const { user: currentUser } = useCurrentUser()
  const pathname = usePathname()
  const { getUserStatus } = useUserPresence()
  
  const otherUsers = users.filter(u => u.id !== currentUser?.id)

  return (
    <Layout>
      <div className="flex h-full">
        {/* DM Users Panel */}
        <div className="w-64 bg-gray-800 border-r border-gray-700">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Direct Messages</h2>
            {usersLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
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
                          <span className="text-white">{user.username[0]}</span>
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
            )}
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