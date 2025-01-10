import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

interface Message {
  id: string
  content: string
  created_at: string
  channel_id: string
  sender: {
    id: string
    username: string
    status: string
    profile_picture?: string
  }
  type: 'channel'
  reactions: Array<{
    emoji: string
    user_id: string
  }>
  file?: {
    id: string
    url: string
    name: string
    type: string
    size: number
  }
}

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  // Debug function
  const logWithTime = (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '')
  }

  useEffect(() => {
    if (!channelId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    logWithTime('Setting up channel messages hook', { channelId })

    async function fetchMessages() {
      try {
        logWithTime('Fetching messages')
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!sender_id(
              id,
              username,
              status,
              profile_picture
            ),
            reactions(*),
            file:file_metadata(
              id,
              name,
              type,
              size,
              path
            )
          `)
          .eq('channel_id', channelId)
          .is('thread_id', null)
          .order('created_at', { ascending: true })

        if (error) throw error

        logWithTime('Messages fetched', { count: data?.length })

        const formattedMessages: Message[] = (data || []).map(msg => ({
          ...msg,
          type: 'channel',
          file: msg.file ? {
            ...msg.file,
            url: supabase.storage.from('public-documents').getPublicUrl(msg.file.path).data.publicUrl
          } : undefined
        }))

        setMessages(formattedMessages)
      } catch (e) {
        setError(e as Error)
        console.error('Error fetching messages:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Set up real-time subscription with improved channel naming
    const channelName = `channel:${channelId}`
    logWithTime('Creating channel subscription', { channelName })

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          if (payload.new.thread_id) {
            return
          }

          logWithTime('Received new message payload', payload)

          // Fetch the complete message to ensure we have all related data
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!sender_id(
                id,
                username,
                status,
                profile_picture
              ),
              reactions(*),
              file:file_metadata(
                id,
                name,
                type,
                size,
                path
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            console.error('Error fetching new message details:', error)
            return
          }

          logWithTime('Adding new message to state', data)
          
          setMessages(prev => {
            // Don't add if we already have this message
            const exists = prev.some(msg => msg.id === data.id)
            if (exists) return prev

            // Ensure we have file data
            const messageWithFile = {
              ...data,
              type: 'channel' as const,
              file: data.file ? {
                id: data.file.id,
                name: data.file.name,
                type: data.file.type,
                size: data.file.size,
                url: supabase.storage.from('public-documents').getPublicUrl(data.file.path).data.publicUrl
              } : undefined
            }

            logWithTime('Formatted message with file:', messageWithFile)
            
            return [...prev, messageWithFile]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          logWithTime('Received message update payload', payload)

          // Fetch updated message with all related data
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!sender_id(
                id,
                username,
                status,
                profile_picture
              ),
              reactions(*),
              file:file_metadata(
                id,
                name,
                type,
                size,
                path
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            console.error('Error fetching updated message details:', error)
            return
          }

          setMessages(prev => 
            prev.map(msg => 
              msg.id === data.id ? {
                ...data,
                type: 'channel' as const,
                file: data.file ? {
                  id: data.file.id,
                  name: data.file.name,
                  type: data.file.type,
                  size: data.file.size,
                  url: supabase.storage.from('public-documents').getPublicUrl(data.file.path).data.publicUrl
                } : undefined
              } : msg
            )
          )
        }
      )
      .subscribe((status, err) => {
        logWithTime('Subscription status changed', { status, error: err })
      })

    return () => {
      logWithTime('Cleaning up subscription', { channelName })
      supabase.removeChannel(channel)
    }
  }, [channelId, currentUser])

  const sendMessage = useCallback(async (
    content: string,
    fileMetadata?: { id: string; url: string; name: string; type: string; size: number }
  ) => {
    if (!currentUser || !channelId) {
      throw new Error('Must be logged in to send messages')
    }

    const newMessage = {
      content,
      channel_id: channelId,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_id: fileMetadata?.id
    }

    logWithTime('Sending message:', newMessage)

    const { error: sendError } = await supabase
      .from('messages')
      .insert([newMessage])

    if (sendError) {
      throw sendError
    }
  }, [currentUser, channelId])

  return {
    messages,
    loading,
    error,
    sendMessage
  }
} 