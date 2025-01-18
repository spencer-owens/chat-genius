import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']

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

export function useMessages(channelId: string | null) {
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

    const channelIdString = channelId as string

    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users(*),
            reactions(*),
            file:file_metadata(
              id,
              name,
              type,
              size,
              path
            )
          `)
          .eq('channel_id', channelIdString)
          .is('thread_id', null)
          .order('created_at', { ascending: false })

        if (error) throw error

        const messages = data.map(message => ({
          ...message,
          sender: message.sender,
          reactions: message.reactions,
          file: message.file ? {
            ...message.file,
            url: supabase.storage.from('public-documents').getPublicUrl(message.file.path).data.publicUrl
          } : undefined
        })) as Message[]

        setChannelMessages(channelIdString, messages)
      } catch (error) {
        console.error('Error fetching messages:', error)
        toast.error('Error loading messages')
      }
    }

    fetchMessages()

    // Message subscription
    const messageSub = supabase.channel(`messages:${channelIdString}`)
    
    messageSub.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelIdString}` },
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
                file:file_metadata(
                  id,
                  name,
                  type,
                  size,
                  path
                )
              `)
              .eq('id', newMessage.id)
              .single()

            if (error) throw error

            const formattedMessage = {
              ...message,
              sender: message.sender,
              reactions: message.reactions,
              file: message.file ? {
                ...message.file,
                url: supabase.storage.from('public-documents').getPublicUrl(message.file.path).data.publicUrl
              } : undefined
            } as Message

            addMessage(channelIdString, formattedMessage)
          } else if (eventType === 'UPDATE' && newMessage?.id) {
            const { data: message, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users(*),
                reactions(*),
                file:file_metadata(
                  id,
                  name,
                  type,
                  size,
                  path
                )
              `)
              .eq('id', newMessage.id)
              .single()

            if (error) throw error

            const formattedMessage = {
              ...message,
              sender: message.sender,
              reactions: message.reactions,
              file: message.file ? {
                ...message.file,
                url: supabase.storage.from('public-documents').getPublicUrl(message.file.path).data.publicUrl
              } : undefined
            } as Message

            updateMessage(channelIdString, formattedMessage)
          } else if (eventType === 'DELETE' && old?.id) {
            removeMessage(channelIdString, old.id)
          }
        } catch (error) {
          console.error('Error handling message change:', error)
          toast.error('Error updating messages')
        }
      }
    )

    messageSub.subscribe()

    return () => {
      supabase.removeChannel(messageSub)
    }
  }, [channelId])

  return { 
    messages: messagesByChannel[channelId || ''] || [],
    loading: false
  }
} 