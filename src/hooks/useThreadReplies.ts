import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'
import { useRealtimeSubscription } from './useRealtimeSubscription'

type Tables = Database['public']['Tables']
type DatabaseMessage = {
  id: string
  content: string
  sender_id: string
  channel_id: string | null
  thread_id: string | null
  created_at: string | null
  updated_at: string | null
  file_id: string | null
  reply_count: number | null
  sender: Tables['users']['Row']
  reactions: Tables['reactions']['Row'][]
  file_metadata?: {
    message_id: string
    bucket: string
    path: string
    name: string
    type: string
    size: number
  }
}

export function useThreadReplies(threadId: string | null) {
  const { 
    messagesByThread,
    setThreadMessages,
    sendMessage
  } = useStore()
  const supabase = createClient()

  // Use our new realtime subscription
  useRealtimeSubscription('threads', threadId || '')

  useEffect(() => {
    if (!threadId) return

    const threadIdString = threadId

    async function fetchReplies() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users(*),
            reactions(*),
            file_metadata:file_metadata(
              message_id,
              bucket,
              path,
              name,
              type,
              size
            )
          `)
          .eq('thread_id', threadIdString)
          .order('created_at', { ascending: true })

        if (error) throw error

        setThreadMessages(threadIdString, data as DatabaseMessage[])
      } catch (error) {
        console.error('Error fetching thread replies:', error)
        toast.error('Error loading replies')
      }
    }

    fetchReplies()
  }, [threadId])

  const sendReply = async (content: string, channelId: string, fileMetadata?: { id: string; url: string; name: string; type: string; size: number }) => {
    if (!threadId) return
    await sendMessage(content, channelId, fileMetadata, threadId)
  }

  return { 
    replies: messagesByThread[threadId || ''] || [],
    loading: false,
    error: null,
    sendReply
  }
} 