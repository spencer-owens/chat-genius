import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'
import { toast } from 'sonner'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

const supabase = createClient()

// Cache reactions for 30 seconds
const reactionCache = new Map<string, { data: GroupedReaction[], timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconds

export type ReactionEmoji = '👍' | '❤️' | '😄' | '🎉' | '🤔' | '👀'
export type MessageType = 'channel' | 'dm'

const getDbMessageType = (type: MessageType): 'channel' | 'direct' => {
  return type === 'dm' ? 'direct' : 'channel'
}

export const AVAILABLE_REACTIONS: ReactionEmoji[] = ['👍', '❤️', '😄', '🎉', '🤔', '👀']

interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: ReactionEmoji
  message_type: 'channel' | 'direct'
  created_at: string
  user: {
    username: string
  }
}

interface GroupedReaction {
  emoji: ReactionEmoji
  count: number
  users: { id: string; username: string }[]
}

type ReactionPayload = RealtimePostgresChangesPayload<{
  [key: string]: any
}>

export function useReactions(messageId: string, messageType: MessageType) {
  const [reactions, setReactions] = useState<GroupedReaction[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useCurrentUser()
  const mountedRef = useRef(true)
  const dbMessageType = useMemo(() => getDbMessageType(messageType), [messageType])
  const fetchingRef = useRef(false)

  // Skip fetching reactions for optimistic messages
  const shouldFetchReactions = useMemo(() => {
    return !messageId.startsWith('temp-')
  }, [messageId])

  // Memoize the grouping function to avoid recreating it on every render
  const groupReactions = useCallback((reactions: Reaction[]): GroupedReaction[] => {
    const grouped = new Map<ReactionEmoji, GroupedReaction>()
    
    for (const reaction of reactions) {
      const existing = grouped.get(reaction.emoji)
      if (existing) {
        existing.count++
        existing.users.push({ id: reaction.user_id, username: reaction.user.username })
      } else {
        grouped.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [{ id: reaction.user_id, username: reaction.user.username }]
        })
      }
    }
    
    return Array.from(grouped.values())
  }, [])

  // Optimized reaction update function
  const updateReactionsState = useCallback((newReaction: Reaction, type: 'add' | 'remove') => {
    setReactions(prev => {
      const updated = [...prev]
      const existingIndex = updated.findIndex(r => r.emoji === newReaction.emoji)
      
      if (type === 'add') {
        if (existingIndex >= 0) {
          // Check if user already reacted
          if (!updated[existingIndex].users.some(u => u.id === newReaction.user_id)) {
            updated[existingIndex].count++
            updated[existingIndex].users.push({
              id: newReaction.user_id,
              username: newReaction.user.username
            })
          }
        } else {
          updated.push({
            emoji: newReaction.emoji,
            count: 1,
            users: [{
              id: newReaction.user_id,
              username: newReaction.user.username
            }]
          })
        }
      } else if (type === 'remove' && existingIndex >= 0) {
        updated[existingIndex].count--
        updated[existingIndex].users = updated[existingIndex].users.filter(
          u => u.id !== newReaction.user_id
        )
        if (updated[existingIndex].count === 0) {
          updated.splice(existingIndex, 1)
        }
      }
      
      return updated
    })
  }, [])

  const addReaction = useCallback(async (emoji: ReactionEmoji) => {
    if (!user || messageId.startsWith('temp-')) return

    try {
      // Add optimistic reaction
      const optimisticReaction: Reaction = {
        id: `temp-${Date.now()}`,
        message_id: messageId,
        user_id: user.id,
        emoji,
        message_type: dbMessageType,
        created_at: new Date().toISOString(),
        user: {
          username: user.username || ''
        }
      }

      updateReactionsState(optimisticReaction, 'add')

      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('message_type', dbMessageType)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single()

      if (existingReaction) {
        // Remove optimistic reaction if it already exists
        updateReactionsState(optimisticReaction, 'remove')
        return
      }

      const { error } = await supabase
        .from('reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
          message_type: dbMessageType
        })

      if (error) {
        // Remove optimistic reaction on error
        updateReactionsState(optimisticReaction, 'remove')
        throw error
      }

      // Update cache
      const cacheKey = `${messageId}:${dbMessageType}`
      reactionCache.delete(cacheKey)
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast.error('Failed to add reaction. Please try again.')
    }
  }, [user, messageId, dbMessageType, updateReactionsState])

  useEffect(() => {
    if (!shouldFetchReactions) {
      setLoading(false)
      return
    }

    mountedRef.current = true
    const abortController = new AbortController()

    async function fetchReactions() {
      // Prevent concurrent fetches for the same message
      if (fetchingRef.current) return
      fetchingRef.current = true

      try {
        const cacheKey = `${messageId}:${dbMessageType}`
        const now = Date.now()
        const cached = reactionCache.get(cacheKey)

        // Use cached data if available and fresh
        if (cached && now - cached.timestamp < CACHE_TTL) {
          setReactions(cached.data)
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('reactions')
          .select(`
            *,
            user:users(username)
          `)
          .eq('message_id', messageId)
          .eq('message_type', dbMessageType)
          .abortSignal(abortController.signal)

        if (error) {
          if (error.code === 'PGRST116') {
            // This is an abort error, ignore it
            return
          }
          throw error
        }

        if (!data) {
          setReactions([])
          setLoading(false)
          return
        }

        const groupedReactions = groupReactions(data as Reaction[])

        // Update cache
        reactionCache.set(cacheKey, {
          data: groupedReactions,
          timestamp: now
        })

        if (mountedRef.current) {
          setReactions(groupedReactions)
          setLoading(false)
        }
      } catch (error: any) {
        if (error?.code === 'PGRST116' || error?.code === '20') {
          // Ignore abort errors
          return
        }
        console.error('Error fetching reactions:', error)
        if (mountedRef.current) {
          setLoading(false)
          setReactions([])
        }
      } finally {
        fetchingRef.current = false
      }
    }

    fetchReactions()

    // Subscribe to reaction changes
    const channel = supabase.channel(`reactions-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `message_id=eq.${messageId} AND message_type=eq.${dbMessageType}`
        },
        (payload: ReactionPayload) => {
          if (!mountedRef.current) return

          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            const reaction = (payload.new || payload.old) as Reaction
            if (!reaction) return

            // Update cache
            const cacheKey = `${messageId}:${dbMessageType}`
            reactionCache.delete(cacheKey)

            // Use the reaction data directly from the payload
            updateReactionsState(
              reaction,
              payload.eventType === 'INSERT' ? 'add' : 'remove'
            )
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      abortController.abort()
      supabase.removeChannel(channel)
    }
  }, [messageId, dbMessageType, groupReactions, updateReactionsState, shouldFetchReactions])

  return {
    reactions,
    loading,
    addReaction
  }
} 