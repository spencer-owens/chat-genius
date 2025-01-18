import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type MessageRow = Tables['messages']['Row']
type UserRow = Tables['users']['Row']
type FileRow = Tables['files']['Row']
type ReactionRow = Tables['reactions']['Row']

interface Message extends MessageRow {
  sender: UserRow
  reactions: ReactionRow[]
  file?: {
    id: string
    url: string
    name: string
    type: string
    size: number
  }
}

export function useChannelMessages(channelId: string | null) {
  const { 
    messagesByChannel,
    setChannelMessages,
    addMessage,
    updateMessage,
    removeMessage
  } = useStore()
  const supabase = createClient()

  useEffect(() => {
    if (!channelId) return

    async function fetchMessages(id: string) {
      try {
        const { data: messagesData, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users(*),
            reactions(*),
            file:files(*)
          `)
          .eq('channel_id', id)
          .order('created_at', { ascending: true })

        if (error) throw error
        if (messagesData) {
          const messages = messagesData.map(msg => ({
            ...msg,
            file: msg.file?.[0] ? {
              id: msg.file[0].id,
              url: msg.file[0].url,
              name: msg.file[0].name,
              type: 'file', // Default type since it's not in the schema
              size: 0 // Default size since it's not in the schema
            } : undefined
          }))
          
          setChannelMessages(id, messages)
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
        toast.error('Failed to load messages')
      }
    }

    fetchMessages(channelId)

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          if (!channelId) return

          if (payload.eventType === 'INSERT' && payload.new) {
            // Fetch full message data with relations
            const { data: messageData, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users(*),
                reactions(*),
                file:files(*)
              `)
              .eq('id', payload.new.id)
              .single()

            if (!error && messageData) {
              const message = {
                ...messageData,
                file: messageData.file?.[0] ? {
                  id: messageData.file[0].id,
                  url: messageData.file[0].url,
                  name: messageData.file[0].name,
                  type: 'file',
                  size: 0
                } : undefined
              }
              
              addMessage(channelId, message)
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            // Fetch updated message data with relations
            const { data: messageData, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users(*),
                reactions(*),
                file:files(*)
              `)
              .eq('id', payload.new.id)
              .single()

            if (!error && messageData) {
              const message = {
                ...messageData,
                file: messageData.file?.[0] ? {
                  id: messageData.file[0].id,
                  url: messageData.file[0].url,
                  name: messageData.file[0].name,
                  type: 'file',
                  size: 0
                } : undefined
              }
              
              updateMessage(channelId, message)
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            removeMessage(channelId, payload.old.id)
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Error subscribing to messages:', err)
          toast.error('Lost connection to messages')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [channelId])

  if (!channelId) return { messages: [] }
  return { messages: messagesByChannel[channelId] || [] }
} 