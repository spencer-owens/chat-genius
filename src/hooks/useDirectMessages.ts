import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'
import { useRealtimeSubscription } from './useRealtimeSubscription'

type Tables = Database['public']['Tables']
type DirectMessageRow = Tables['direct_messages']['Row']
type UserRow = Tables['users']['Row']
type FileMetadataRow = Tables['file_metadata']['Row']
type ReactionRow = Tables['reactions']['Row']

type Message = Tables['messages']['Row'] & {
  sender: Tables['users']['Row']
  reactions: Tables['reactions']['Row'][]
  file?: {
    id: string
    url: string
    name: string
    type: string
    size: number
  }
}

export function useDirectMessages(userId: string | null) {
  const { currentUser, messagesByChannel, setChannelMessages } = useStore()
  const supabase = createClient()

  // Use our new realtime subscription
  useRealtimeSubscription('direct_messages', currentUser?.id || '')

  useEffect(() => {
    if (!currentUser?.id || !userId) return

    const channelKey = `dm:${userId}`
    const currentUserId = currentUser.id

    async function fetchMessages() {
      try {
        const { data: messagesData, error } = await supabase
          .from('direct_messages')
          .select(`
            *,
            sender:users!sender_id(
              id,
              username,
              email,
              status,
              profile_picture,
              created_at,
              updated_at,
              is_verified
            ),
            reactions:reactions!message_id(
              id,
              user_id,
              emoji,
              created_at,
              message_id,
              message_type
            ),
            file:file_metadata!file_id(
              id,
              name,
              type,
              size,
              path
            )
          `)
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: true })

        if (error) throw error
        if (messagesData) {
          const messages = messagesData.map(msg => ({
            id: msg.id,
            content: msg.content,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            thread_id: msg.thread_id,
            file_id: msg.file_id,
            sender_id: msg.sender_id,
            channel_id: null,
            reply_count: null,
            sender: msg.sender,
            reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
            file: msg.file ? {
              id: msg.file.id,
              name: msg.file.name,
              type: msg.file.type,
              size: msg.file.size,
              url: supabase.storage.from('public-documents').getPublicUrl(msg.file.path).data.publicUrl
            } : undefined
          })) as Message[]
          
          setChannelMessages(channelKey, messages)
        }
      } catch (error) {
        console.error('Error fetching direct messages:', error)
        toast.error('Failed to load messages')
      }
    }

    fetchMessages()
  }, [userId, currentUser?.id, setChannelMessages])

  const channelKey = userId ? `dm:${userId}` : ''
  return { 
    messages: messagesByChannel[channelKey] || [],
    loading: false
  }
} 