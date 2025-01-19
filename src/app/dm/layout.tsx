'use client'

import { Layout } from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useUserPresence } from '@/hooks/useUserPresence'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'

interface User {
  id: string
  username: string
  profile_picture?: string
}

export default function DMLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const { user: currentUser } = useAuth()
  const pathname = usePathname()
  const { getUserStatus } = useUserPresence()
  const { dmUnreadCounts } = useUnreadCounts(currentUser)
  const supabase = createClient()
  const PAGE_SIZE = 20

  useEffect(() => {
    if (!currentUser?.id) {
      setUsers([])
      setLoading(false)
      return
    }

    const userId = currentUser.id
    let mounted = true

    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, profile_picture')
          .neq('id', userId)
          .order('username')
          .limit(PAGE_SIZE)

        if (error) throw error

        if (mounted) {
          setUsers(data)
          setHasMore(data.length === PAGE_SIZE)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      mounted = false
    }
  }, [currentUser])

  const loadMore = async () => {
    if (!currentUser?.id || !hasMore) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, profile_picture')
        .neq('id', currentUser.id)
        .order('username')
        .limit(PAGE_SIZE)
        .gt('username', users[users.length - 1].username)

      if (error) throw error

      setUsers(prev => [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
    } catch (error) {
      console.error('Error loading more users:', error)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight
    if (bottom && hasMore) {
      loadMore()
    }
  }
  
  return (
    <Layout>
      <div className="flex h-full">
        {/* DM Users Panel */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="flex-none p-4">
            <h2 className="text-lg font-semibold text-white">Direct Messages</h2>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 pb-4" onScroll={handleScroll}>
              <div className="space-y-2">
                {users.map((user) => (
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
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{user.username}</p>
                        {dmUnreadCounts[user.id]?.count > 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white">
                            {dmUnreadCounts[user.id].count}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Circle className={cn(
                          'h-2 w-2',
                          getUserStatus(user.id) === 'online' ? 'text-green-500' : 
                          getUserStatus(user.id) === 'away' ? 'text-yellow-500' :
                          getUserStatus(user.id) === 'offline' ? 'text-gray-500' :
                          'text-red-500'
                        )} />
                        <span className="text-xs text-gray-400 capitalize">
                          {getUserStatus(user.id)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                {hasMore && (
                  <div className="flex justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </Layout>
  )
} 