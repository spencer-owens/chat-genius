import { useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'
import { useRealtimeSubscription } from './useRealtimeSubscription'

type Tables = Database['public']['Tables']

export type ReactionEmoji = '👍' | '❤️' | '😄' | '🎉' | '🤔' | '👀'
export type MessageType = 'channel' | 'dm'

const getDbMessageType = (type: MessageType): 'channel' | 'direct' => {
  return type === 'dm' ? 'direct' : 'channel'
}

export const AVAILABLE_REACTIONS: ReactionEmoji[] = ['👍', '❤️', '😄', '🎉', '🤔', '👀']

type Reaction = {
  id: string
  message_id: string
  user_id: string
  emoji: ReactionEmoji
  created_at: string | null
  message_type: 'channel' | 'direct'
  user: {
    username: string
  }
}

interface GroupedReaction {
  emoji: ReactionEmoji
  count: number
  users: { id: string; username: string }[]
}

export function useReactions(messageId: string, messageType: MessageType) {
  const { currentUser, messagesByChannel } = useStore()
  const supabase = createClient()
  const dbMessageType = useMemo(() => getDbMessageType(messageType), [messageType])

  // Use our realtime subscription for reactions
  useRealtimeSubscription('reactions', messageId, dbMessageType)

  // Get reactions from the message in the store
  const reactions = useMemo(() => {
    if (messageType === 'channel') {
      // Find the message in messagesByChannel
      const message = Object.values(messagesByChannel)
        .flat()
        .find(m => m.id === messageId)

      if (message?.reactions) {
        // Map the reactions to include user info
        const reactionsWithUser = message.reactions.map(r => ({
          ...r,
          user: {
            username: message.sender.username
          }
        })) as Reaction[]
        return groupReactions(reactionsWithUser)
      }
    }
    return []
  }, [messageId, messageType, messagesByChannel])

  // Memoize the grouping function
  function groupReactions(reactions: Reaction[]): GroupedReaction[] {
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
  }

  const addReaction = useCallback(async (emoji: ReactionEmoji) => {
    if (!currentUser?.id || !messageId) return

    try {
      const { error } = await supabase
        .from('reactions')
        .insert({
          message_id: messageId,
          user_id: currentUser.id,
          emoji,
          message_type: dbMessageType
        })

      if (error) throw error
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast.error('Failed to add reaction')
    }
  }, [currentUser, messageId, dbMessageType])

  const removeReaction = useCallback(async (emoji: ReactionEmoji) => {
    if (!currentUser?.id || !messageId) return

    try {
      const { error } = await supabase
        .from('reactions')
        .delete()
        .match({
          message_id: messageId,
          user_id: currentUser.id,
          emoji,
          message_type: dbMessageType
        })

      if (error) throw error
    } catch (error) {
      console.error('Error removing reaction:', error)
      toast.error('Failed to remove reaction')
    }
  }, [currentUser, messageId, dbMessageType])

  return {
    reactions,
    addReaction,
    removeReaction,
    loading: false
  }
} 