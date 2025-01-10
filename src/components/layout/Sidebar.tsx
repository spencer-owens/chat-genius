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
  Circle
} from 'lucide-react'
import { ExpandableNavItem } from './ExpandableNavItem'
import { SearchBar } from '../shared/SearchBar'
import { useChannels } from '@/hooks/useChannels'
import { useDirectMessages } from '@/hooks/useDirectMessages'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SkeletonLoader } from '../shared/SkeletonLoader'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { ChannelLink } from '../channels/ChannelLink'
import { useDMUsers } from '@/hooks/useDMUsers'
import { ReactNode } from 'react'

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
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Admin', href: '/admin', icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()
  const { channels, loading: channelsLoading } = useChannels()
  const { user } = useCurrentUser()
  const { channelUnreadCounts, dmUnreadCounts, markAllAsRead } = useUnreadCounts()
  const { users: dmUsers, loading: dmUsersLoading } = useDMUsers()

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
        <SearchBar onSearch={handleSearch} />
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

        {/* Public Channels section */}
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
          ) : publicChannels.length === 0 ? (
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
        </ExpandableNavItem>

        {/* Private Channels section */}
        <ExpandableNavItem
          title="Private Channels"
          linkHref="/channels/private"
          isActive={pathname === '/channels/private'}
          storageKey="sidebar-private-channels-expanded"
        >
          {channelsLoading ? (
            <div className="space-y-2 px-2">
              <SkeletonLoader className="h-6 w-full" />
              <SkeletonLoader className="h-6 w-3/4" />
            </div>
          ) : userPrivateChannels.length === 0 ? (
            <div className="px-2 py-1 text-sm text-gray-400">
              No private channels
            </div>
          ) : (
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
    </div>
  )
} 