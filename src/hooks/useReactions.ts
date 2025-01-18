import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']

// Cache reactions for 30 seconds
const reactionCache = new Map<string, { data: GroupedReaction[], timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconds

export type ReactionEmoji = '👍' | '❤️' | '😄' | '🎉' | '🤔' | '👀'
export type MessageType = 'channel' | 'dm'

const getDbMessageType = (type: MessageType): 'channel' | 'direct' => {
  return type === 'dm' ? 'direct' : 'channel'
}

export const AVAILABLE_REACTIONS: ReactionEmoji[] = ['👍', '❤️', '😄', '🎉', '🤔', '👀']

type Reaction = Tables['reactions']['Row'] & {
  user: Pick<Tables['users']['Row'], 'username'>
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
  const { currentUser, messagesByChannel, updateMessage } = useStore()
  const mountedRef = useRef(true)
  const dbMessageType = useMemo(() => getDbMessageType(messageType), [messageType])
  const fetchingRef = useRef(false)
  const supabase = createClient()

  // Skip fetching reactions for optimistic messages
  const shouldFetchReactions = useMemo(() => {
    return !messageId.startsWith('temp-')
  }, [messageId])

  // Memoize the grouping function to avoid recreating it on every render
  const groupReactions = useCallback((reactions: Reaction[]): GroupedReaction[] => {
    const grouped = new Map<ReactionEmoji, GroupedReaction>()
    
    for (const reaction of reactions) {
      const existing = grouped.get(reaction.emoji as ReactionEmoji)
      if (existing) {
        existing.count++
        existing.users.push({ id: reaction.user_id, username: reaction.user.username })
      } else {
        grouped.set(reaction.emoji as ReactionEmoji, {
          emoji: reaction.emoji as ReactionEmoji,
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
            emoji: newReaction.emoji as ReactionEmoji,
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

    // Update message reactions in the store if it's a channel message
    if (messageType === 'channel') {
      const channelId = messageId.split('-')[0]
      const message = messagesByChannel[channelId]?.find(m => m.id === messageId)
      if (message) {
        const updatedMessage = {
          ...message,
          reactions: type === 'add' 
            ? [...(message.reactions || []), newReaction]
            : (message.reactions || []).filter(r => r.id !== newReaction.id)
        }
        updateMessage(channelId, updatedMessage)
      }
    }
  }, [messageType, messageId, messagesByChannel, updateMessage])

  const addReaction = useCallback(async (emoji: ReactionEmoji) => {
    if (!currentUser?.id || messageId.startsWith('temp-')) {
      toast.error('Cannot add reaction at this time')
      return
    }

    try {
      // Add optimistic reaction
      const optimisticReaction: Reaction = {
        id: `temp-${Date.now()}`,
        message_id: messageId,
        user_id: currentUser.id,
        emoji,
        message_type: dbMessageType,
        created_at: new Date().toISOString(),
        user: {
          username: currentUser.user_metadata?.username || ''
        }
      }

      updateReactionsState(optimisticReaction, 'add')

      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('message_type', dbMessageType)
        .eq('user_id', currentUser.id)
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
          user_id: currentUser.id,
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
  }, [currentUser, messageId, dbMessageType, updateReactionsState])

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
          toast.error('Failed to load reactions')
        }
      } finally {
        fetchingRef.current = false
      }
    }

    fetchReactions()

    // Subscribe to reaction changes
    const subscription = supabase
      .channel(`reactions:${messageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reactions',
        filter: `message_id=eq.${messageId}`
      }, async (payload: ReactionPayload) => {
        if (!mountedRef.current) return

        // Refetch reactions to ensure consistency
        fetchReactions()
      })
      .subscribe()

    return () => {
      mountedRef.current = false
      abortController.abort()
      subscription.unsubscribe()
    }
  }, [messageId, dbMessageType, shouldFetchReactions, groupReactions])

  return {
    reactions,
    loading,
    addReaction
  }
} 