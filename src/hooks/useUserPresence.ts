'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Status } from '@/types/status'

// Debug function
const logWithTime = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [UserPresence] ${message}`, data || '')
}

interface UserPresenceRecord {
  id: string
  status: Status
  last_seen: string
}

interface UserStatusMap {
  [userId: string]: Status
}

export function useUserPresence() {
  const [userStatuses, setUserStatuses] = useState<UserStatusMap>({})
  const lastStatusUpdate = useRef<number>(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updateStatus = (status: Status) => {
    const now = Date.now()
    // Debounce status updates to prevent excessive database calls
    if (now - lastStatusUpdate.current < 5000) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateStatus(status)
      }, 5000 - (now - lastStatusUpdate.current))
      return
    }

    lastStatusUpdate.current = now
    const userId = supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        return supabase
          .from('users')
          .update({ 
            status,
            last_seen: new Date().toISOString()
          })
          .eq('id', data.user.id)
          .then(({ error }) => {
            if (error) {
              console.error('Error updating status:', error)
              toast.error('Failed to update status')
            }
          })
      }
    })
  }

  const getUserStatus = (userId: string): Status => {
    return userStatuses[userId] || 'offline'
  }

  useEffect(() => {
    let isMounted = true

    // Set up visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus('online')
      } else {
        updateStatus('away')
      }
    }

    // Set up beforeunload handler
    const handleBeforeUnload = () => {
      const xhr = new XMLHttpRequest()
      const userId = supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          xhr.open('POST', '/api/offline-status', false) // Synchronous request
          xhr.setRequestHeader('Content-Type', 'application/json')
          xhr.send(JSON.stringify({ userId: data.session.user.id }))
        }
      })
    }

    // Set up real-time subscription for other users' status changes
    const channel = supabase
      .channel('user-presence')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: 'status=neq.unchanged'
        },
        (payload) => {
          const oldStatus = payload.old?.status
          const newStatus = payload.new?.status as Status
          const userId = payload.new?.id

          if (userId && oldStatus !== newStatus) {
            logWithTime('User status changed', { userId, oldStatus, newStatus })
            setUserStatuses(prev => ({
              ...prev,
              [userId]: newStatus
            }))
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Error subscribing to presence changes:', err)
          toast.error('Lost connection to presence system')
        }
      })

    // Set initial online status
    updateStatus('online')

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', handleBeforeUnload)
      channel.unsubscribe()
      
      // Set status to offline
      updateStatus('offline')
    }
  }, [])

  return {
    updateStatus,
    getUserStatus,
    userStatuses
  }
} 