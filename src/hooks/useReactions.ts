import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

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
  [key: string]: Reaction
}>

export function useReactions(messageId: string, messageType: MessageType) {
  const [reactions, setReactions] = useState<GroupedReaction[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useCurrentUser()
  const supabase = createClient()
  const dbMessageType = useMemo(() => getDbMessageType(messageType), [messageType])

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
    if (!user) return

    try {
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('message_type', dbMessageType)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single()

      if (existingReaction) {
        // User already reacted with this emoji
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

      if (error) throw error
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }, [user, messageId, dbMessageType])

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchReactions() {
      try {
        const { data, error } = await supabase
          .from('reactions')
          .select(`
            *,
            user:users(username)
          `)
          .eq('message_id', messageId)
          .eq('message_type', dbMessageType)

        if (error) throw error
        if (mounted) {
          setReactions(groupReactions(data as Reaction[]))
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching reactions:', error)
        if (mounted) setLoading(false)
      }
    }

    fetchReactions()

    // Subscribe to reaction changes
    const channel = supabase.channel(`reactions-${messageId}-${dbMessageType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `message_id=eq.${messageId} AND message_type=eq.${dbMessageType}`
        },
        async (payload: ReactionPayload) => {
          if (!mounted) return

          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            const reaction = (payload.new || payload.old) as Reaction
            if (!reaction) return

            const { data: userData } = await supabase
              .from('users')
              .select('username')
              .eq('id', reaction.user_id)
              .abortSignal(abortController.signal)
              .single()

            if (userData && mounted) {
              const fullReaction: Reaction = {
                ...reaction,
                user: { username: userData.username }
              }
              updateReactionsState(
                fullReaction,
                payload.eventType === 'INSERT' ? 'add' : 'remove'
              )
            }
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      abortController.abort()
      supabase.removeChannel(channel)
    }
  }, [messageId, dbMessageType, groupReactions, updateReactionsState])

  return {
    reactions,
    loading,
    addReaction
  }
} 