import { useState, useEffect } from 'react'
import { getSupabase } from '../auth'
import { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import { useUser } from './useUser'

export interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
}

type DatabasePresencePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<UserPresence>;
  old: Partial<UserPresence> | null;
};

export function usePresence() {
  const { user } = useUser()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    
    const supabase = getSupabase()

    const updatePresence = async () => {
      await supabase
        .from('presence')
        .upsert({
          user_id: user.id,
          is_online: true,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
    }

    // Subscribe to presence changes
    const channel = supabase
      .channel('presence_changes')
      .on<DatabasePresencePayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presence',
          filter: 'is_online=eq.true'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (payload.new.is_online) {
              setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.add(payload.new.user_id!);
                return newSet;
              });
            }
          } else if (payload.eventType === 'DELETE' || 
            (payload.eventType === 'UPDATE' && !payload.new.is_online)) {
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              const userId = payload.old?.user_id || payload.new.user_id;
              if (userId) {
                newSet.delete(userId);
              }
              return newSet;
            });
          }
        }
      )
      .subscribe()

    // Initial fetch of online users
    const fetchOnlineUsers = async () => {
      const { data } = await supabase
        .from('presence')
        .select('user_id')
        .eq('is_online', true)

      if (data) {
        setOnlineUsers(new Set(data.map(u => u.user_id)))
      }
    }

    // Set up cleanup for when user leaves
    const handleBeforeUnload = async () => {
      await supabase
        .from('presence')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id)
    }

    // Set up periodic presence updates to keep the connection alive
    const presenceInterval = setInterval(updatePresence, 30000) // Update every 30 seconds

    // Initialize
    updatePresence()
    fetchOnlineUsers()
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      handleBeforeUnload()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearInterval(presenceInterval)
      supabase.removeChannel(channel)
    }
  }, [user])

  return { onlineUsers }
} 