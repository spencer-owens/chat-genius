import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'
import { useRealtimeSubscription } from './useRealtimeSubscription'

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
    setChannelMessages
  } = useStore()
  const supabase = createClient()

  // Use our new realtime subscription
  useRealtimeSubscription('messages', channelId || '')

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
  }, [channelId])

  return { 
    messages: messagesByChannel[channelId || ''] || [],
    loading: false
  }
} 