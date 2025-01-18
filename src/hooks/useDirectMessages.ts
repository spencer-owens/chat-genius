import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'
import { Status } from '@/types/status'

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

const supabase = createClient()

export function useDirectMessages(userId: string | null) {
  const { currentUser, messagesByChannel, setChannelMessages, addMessage, updateMessage, removeMessage } = useStore()

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

    const channel = supabase
      .channel('direct_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId}))`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            // Fetch full message data with relations
            const { data: messageData, error } = await supabase
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
              .eq('id', payload.new.id)
              .single()

            if (!error && messageData) {
              const message = {
                id: messageData.id,
                content: messageData.content,
                created_at: messageData.created_at,
                updated_at: messageData.updated_at,
                thread_id: messageData.thread_id,
                file_id: messageData.file_id,
                sender_id: messageData.sender_id,
                channel_id: null,
                reply_count: null,
                sender: messageData.sender,
                reactions: Array.isArray(messageData.reactions) ? messageData.reactions : [],
                file: messageData.file ? {
                  id: messageData.file.id,
                  name: messageData.file.name,
                  type: messageData.file.type,
                  size: messageData.file.size,
                  url: supabase.storage.from('public-documents').getPublicUrl(messageData.file.path).data.publicUrl
                } : undefined
              } as Message
              
              addMessage(channelKey, message)
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            // Fetch updated message data with relations
            const { data: messageData, error } = await supabase
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
              .eq('id', payload.new.id)
              .single()

            if (!error && messageData) {
              const message = {
                id: messageData.id,
                content: messageData.content,
                created_at: messageData.created_at,
                updated_at: messageData.updated_at,
                thread_id: messageData.thread_id,
                file_id: messageData.file_id,
                sender_id: messageData.sender_id,
                channel_id: null,
                reply_count: null,
                sender: messageData.sender,
                reactions: Array.isArray(messageData.reactions) ? messageData.reactions : [],
                file: messageData.file ? {
                  id: messageData.file.id,
                  name: messageData.file.name,
                  type: messageData.file.type,
                  size: messageData.file.size,
                  url: supabase.storage.from('public-documents').getPublicUrl(messageData.file.path).data.publicUrl
                } : undefined
              } as Message
              
              updateMessage(channelKey, message)
            }
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            removeMessage(channelKey, payload.old.id)
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Error subscribing to direct messages:', err)
          toast.error('Lost connection to messages')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId, currentUser?.id, setChannelMessages, addMessage, updateMessage, removeMessage])

  const channelKey = userId ? `dm:${userId}` : ''
  return { 
    messages: messagesByChannel[channelKey] || [],
    loading: false
  }
} 