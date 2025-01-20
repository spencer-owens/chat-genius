'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Search,
  Settings,
  Shield,
  Hash,
  Circle,
  Menu,
  Brain
} from 'lucide-react'
import { ExpandableNavItem } from './ExpandableNavItem'
import { SearchBar } from '../shared/SearchBar'
import { useChannels } from '@/hooks/useChannels'
import { useDirectMessages } from '@/hooks/useDirectMessages'
import { useAuth } from '@/contexts/AuthContext'
import { SkeletonLoader } from '../shared/SkeletonLoader'
import { useUnreadCountsContext } from '@/components/providers/UnreadCountsProvider'
import { ChannelLink } from '../channels/ChannelLink'
import { useDMUsers } from '@/hooks/useDMUsers'
import { ReactNode, useCallback } from 'react'
import { useUserPresence } from '@/hooks/useUserPresence'

type Status = 'online' | 'offline' | 'away'

interface User {
  id: string
  username: string
  profile_picture?: string
  status: Status
}

const statusColors: Record<Status, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  away: 'bg-yellow-500'
} as const

interface Channel {
  id: string
  name: string
  is_private: boolean
  memberships?: Array<{
    user_id: string
  }>
}

interface UnreadCount {
  count: number
  lastReadAt: string | null
}

interface ExpandableNavItemProps {
  title: ReactNode
  linkHref: string
  isActive: boolean
  storageKey: string
  children: ReactNode
}

const topNavItems = [
  { name: 'Home', href: '/', icon: Home },
]

const bottomNavItems = [
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Jeopardy Bot', href: '/jeopardy', icon: Brain },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin', href: '/admin', icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()
  const { channels, loading: channelsLoading } = useChannels()
  const { user } = useAuth()
  const { channelUnreadCounts, dmUnreadCounts, markChannelAsRead, markDmAsRead } = useUnreadCountsContext()
  const { users: dmUsers, loading: dmUsersLoading } = useDMUsers()
  const { updateStatus, getUserStatus } = useUserPresence()

  const markAllAsRead = useCallback(async () => {
    if (!user) return

    // Mark all channels as read
    await Promise.all(
      Object.keys(channelUnreadCounts)
        .filter(channelId => channelUnreadCounts[channelId]?.count > 0)
        .map(channelId => markChannelAsRead(channelId))
    )

    // Mark all DMs as read
    await Promise.all(
      Object.keys(dmUnreadCounts)
        .filter(userId => dmUnreadCounts[userId]?.count > 0)
        .map(userId => markDmAsRead(userId))
    )
  }, [user, channelUnreadCounts, dmUnreadCounts, markChannelAsRead, markDmAsRead])

  // Return null if user is not authenticated
  if (!user) return null

  const handleSearch = (query: string) => {
    // Implement search functionality
  }

  const isChannelActive = (channelId: string) => 
    pathname === `/channels/${channelId}`

  const isDMActive = (userId: string) =>
    pathname === `/dm/${userId}`

  const publicChannels = channels.filter(c => !c.is_private)
  const privateChannels = channels.filter(c => c.is_private)
  const userPrivateChannels = privateChannels.filter(
    c => c.memberships?.some((m: { user_id: string }) => m.user_id === user?.id)
  )

  const totalUnreadDMs = Object.values(dmUnreadCounts).reduce((a, b) => a + (b?.count || 0), 0)

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-between px-4">
        <h1 className="text-xl font-bold text-white">Chat Genius</h1>
        {(Object.values(channelUnreadCounts).some(c => (c?.count || 0) > 0) ||
         Object.values(dmUnreadCounts).some(c => (c?.count || 0) > 0)) && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-gray-400 hover:text-white"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="px-4 mb-4">
        <SearchBar 
          onSearch={handleSearch} 
          shouldNavigate={true}
          placeholder="Search messages and channels..."
        />
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {/* Top nav items */}
        {topNavItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                pathname === item.href
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        {/* Channels section with public and private subsections */}
        <ExpandableNavItem
          title="Channels"
          linkHref="/channels"
          isActive={pathname === '/channels'}
          storageKey="sidebar-channels-expanded"
        >
          {channelsLoading ? (
            <div className="space-y-2 px-2">
              <SkeletonLoader className="h-6 w-full" />
              <SkeletonLoader className="h-6 w-3/4" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Public Channels */}
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-medium text-gray-400">Public</div>
                {publicChannels.length === 0 ? (
                  <div className="px-2 py-1 text-sm text-gray-400">
                    No channels available
                  </div>
                ) : (
                  <div className="space-y-1">
                    {publicChannels.map((channel) => (
                      <ChannelLink
                        key={channel.id}
                        channel={channel}
                        isActive={isChannelActive(channel.id)}
                        unreadCount={channelUnreadCounts[channel.id]?.count || 0}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Private Channels - only show if user has access to any */}
              {userPrivateChannels.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-xs font-medium text-gray-400">Private</div>
                  <div className="space-y-1">
                    {userPrivateChannels.map((channel) => (
                      <ChannelLink
                        key={channel.id}
                        channel={channel}
                        isActive={isChannelActive(channel.id)}
                        unreadCount={channelUnreadCounts[channel.id]?.count || 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ExpandableNavItem>

        {/* Direct Messages section */}
        <ExpandableNavItem
          title={
            <div className="flex items-center justify-between w-full">
              <span>Direct Messages</span>
              {totalUnreadDMs > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {totalUnreadDMs}
                </span>
              )}
            </div>
          }
          linkHref="/dm"
          isActive={pathname === '/dm'}
          storageKey="sidebar-dms-expanded"
        >
          {dmUsersLoading ? (
            <div className="space-y-2 px-2">
              <SkeletonLoader className="h-6 w-full" />
              <SkeletonLoader className="h-6 w-3/4" />
            </div>
          ) : dmUsers.length === 0 ? (
            <div className="px-2 py-1 text-sm text-gray-400">
              No direct messages yet
            </div>
          ) : (
            dmUsers.map((user) => (
              <Link
                key={user.id}
                href={`/dm/${user.id}`}
                className={cn(
                  'flex items-center px-2 py-1 text-sm rounded-md',
                  isDMActive(user.id)
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )}
              >
                <Circle className={cn(
                  'h-2 w-2 mr-2',
                  user.status === 'online' ? 'text-green-500' : 'text-gray-500'
                )} />
                <span className="flex-1">{user.username}</span>
                {dmUnreadCounts[user.id]?.count > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {dmUnreadCounts[user.id].count}
                  </span>
                )}
              </Link>
            ))
          )}
        </ExpandableNavItem>

        {/* Bottom nav items */}
        {bottomNavItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                pathname === item.href
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Profile Section */}
      {user && (
        <div className="flex-none p-4 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="relative flex-shrink-0 group">
              {/* Invisible extended hover area */}
              <div className="absolute -inset-2" />
              
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.username}
                  className="h-8 w-8 rounded-full cursor-pointer relative"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center cursor-pointer relative">
                  <span className="text-white">{user.username[0]}</span>
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5">
                <div className={cn(
                  'h-3 w-3 rounded-full border-2 border-gray-900 cursor-pointer relative',
                  statusColors[getUserStatus(user.id)]
                )} />
              </div>

              {/* Status Menu */}
              <div 
                className="absolute left-0 top-0 -translate-y-full hidden group-hover:block w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 [transition:opacity_0.15s_ease] opacity-0 group-hover:opacity-100"
                style={{ 
                  filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))',
                }}
              >
                {Object.keys(statusColors).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(status as Status)}
                    className={cn(
                      'w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-2',
                      getUserStatus(user.id) === status && 'bg-gray-700'
                    )}
                  >
                    <div className={cn('h-2 w-2 rounded-full', statusColors[status as Status])} />
                    <span className="capitalize">{status}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.username}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {getUserStatus(user.id)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 