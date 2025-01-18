import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'

type Tables = Database['public']['Tables']
type DatabaseMessage = {
  id: string
  content: string
  sender_id: string
  channel_id: string
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
    size: string
  }
}

export function useThreadReplies(threadId: string | null) {
  const { 
    messagesByThread,
    setThreadMessages,
    addThreadMessage,
    updateThreadMessage,
    removeThreadMessage,
    sendMessage
  } = useStore()
  const supabase = createClient()

  useEffect(() => {
    if (!threadId) return

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
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })

        if (error) throw error

        const messages = data as DatabaseMessage[]
        setThreadMessages(threadId, messages)
      } catch (error) {
        console.error('Error fetching thread replies:', error)
        toast.error('Error loading replies')
      }
    }

    fetchReplies()

    // Thread replies subscription
    const repliesSub = supabase.channel(`thread:${threadId}`)
    
    repliesSub.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
      async (payload: any) => {
        const { eventType, new: newMessage, old } = payload

        try {
          if (eventType === 'INSERT' && newMessage?.id) {
            const { data: message, error } = await supabase
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
              .eq('id', newMessage.id)
              .single()

            if (error) throw error

            addThreadMessage(threadId, message as DatabaseMessage)
          } else if (eventType === 'UPDATE' && newMessage?.id) {
            const { data: message, error } = await supabase
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
              .eq('id', newMessage.id)
              .single()

            if (error) throw error

            updateThreadMessage(threadId, message as DatabaseMessage)
          } else if (eventType === 'DELETE' && old?.id) {
            removeThreadMessage(threadId, old.id)
          }
        } catch (error) {
          console.error('Error handling thread reply change:', error)
          toast.error('Error updating replies')
        }
      }
    )

    repliesSub.subscribe()

    return () => {
      supabase.removeChannel(repliesSub)
    }
  }, [threadId, setThreadMessages, addThreadMessage, updateThreadMessage, removeThreadMessage])

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