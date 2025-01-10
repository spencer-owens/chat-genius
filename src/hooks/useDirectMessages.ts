import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

interface DirectMessage {
  id: string
  content: string
  created_at: string
  sender_id: string
  receiver_id: string
  sender: {
    username: string
    status: string
    profile_picture?: string
  }
  type: 'dm'
  file?: {
    id: string
    url: string
    name: string
    type: string
    size: number
  }
}

export function useDirectMessages(otherUserId: string | null) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  // Debug function
  const logWithTime = (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '')
  }

  useEffect(() => {
    if (!otherUserId || !currentUser) {
      setMessages([])
      setLoading(false)
      return
    }

    logWithTime('Setting up DM hook', { currentUser: currentUser.id, otherUser: otherUserId })

    async function fetchMessages() {
      try {
        logWithTime('Fetching messages')
        const { data, error } = await supabase
          .from('direct_messages')
          .select(`
            *,
            sender:users!sender_id(
              id,
              username,
              status,
              profile_picture
            ),
            file:file_metadata(
              id,
              name,
              type,
              size,
              path
            )
          `)
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),` +
            `and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
          )
          .order('created_at', { ascending: true })

        if (error) throw error

        logWithTime('Messages fetched', { count: data?.length })

        const formattedMessages: DirectMessage[] = (data || []).map(msg => ({
          ...msg,
          type: 'dm',
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

    // Subscribe to new messages with improved channel naming
    const channelName = `dm:${[currentUser.id, otherUserId].sort().join('_')}`
    logWithTime('Creating channel', { channelName })

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages'
        },
        async (payload) => {
          logWithTime('DEBUG: Received any DM insert', payload)
          
          // Only process messages that are part of this conversation
          if (
            !(
              (payload.new.sender_id === currentUser.id && payload.new.receiver_id === otherUserId) ||
              (payload.new.sender_id === otherUserId && payload.new.receiver_id === currentUser.id)
            )
          ) {
            logWithTime('DEBUG: Skipping DM - not part of this conversation', {
              sender_id: payload.new.sender_id,
              receiver_id: payload.new.receiver_id,
              currentUser: currentUser.id,
              otherUser: otherUserId
            })
            return
          }

          logWithTime('DEBUG: Processing DM for this conversation', payload.new)

          // Fetch the complete message to ensure we have all related data
          const { data, error } = await supabase
            .from('direct_messages')
            .select(`
              *,
              sender:users!sender_id(
                id,
                username,
                status,
                profile_picture
              ),
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
              type: 'dm' as const,
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
      .subscribe((status, err) => {
        logWithTime('Subscription status changed', { status, error: err })
      })

    return () => {
      logWithTime('Cleaning up subscription', { channelName })
      supabase.removeChannel(channel)
    }
  }, [currentUser, otherUserId])

  const sendMessage = useCallback(async (
    content: string,
    fileMetadata?: { id: string; url: string; name: string; type: string; size: number }
  ) => {
    if (!currentUser || !otherUserId) {
      throw new Error('Must be logged in to send messages')
    }

    const newMessage = {
      content,
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_id: fileMetadata?.id
    }

    logWithTime('Sending DM:', newMessage)

    const { error: sendError } = await supabase
      .from('direct_messages')
      .insert([newMessage])

    if (sendError) {
      throw sendError
    }
  }, [currentUser, otherUserId])

  return {
    messages,
    loading,
    error,
    sendMessage
  }
} 