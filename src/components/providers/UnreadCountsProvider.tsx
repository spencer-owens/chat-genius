'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { User } from '@supabase/supabase-js'

interface UnreadCountsContextType {
  channelUnreadCounts: Record<string, { count: number; lastReadAt: string | null }>
  dmUnreadCounts: Record<string, { count: number; lastReadAt: string | null }>
  markChannelAsRead: (channelId: string) => Promise<void>
  markDmAsRead: (otherUserId: string) => Promise<void>
  loading: boolean
}

const UnreadCountsContext = createContext<UnreadCountsContextType | null>(null)

export function UnreadCountsProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser()
  const unreadCounts = useUnreadCounts(user as User | null)

  return (
    <UnreadCountsContext.Provider value={unreadCounts}>
      {children}
    </UnreadCountsContext.Provider>
  )
}

export function useUnreadCountsContext() {
  const context = useContext(UnreadCountsContext)
  if (!context) {
    throw new Error('useUnreadCountsContext must be used within an UnreadCountsProvider')
  }
  return context
} 