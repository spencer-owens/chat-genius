import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'
import { toast } from 'sonner'

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
  const messagesRef = useRef<DirectMessage[]>([])

  // Update ref whenever messages change
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Debug function
  const logWithTime = (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '')
  }

  const sendMessage = useCallback(async (
    content: string,
    fileMetadata?: { id: string; url: string; name: string; type: string; size: number }
  ) => {
    if (!currentUser || !otherUserId) {
      throw new Error('Must be logged in to send messages')
    }

    // Create optimistic message
    const optimisticId = `temp-${Date.now()}`
    const newMessage = {
      id: optimisticId,
      content,
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_id: fileMetadata?.id,
      type: 'dm' as const,
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        status: currentUser.status,
        profile_picture: currentUser.profile_picture
      },
      file: fileMetadata
    }

    logWithTime('Adding optimistic message:', newMessage)

    // Add optimistic message to state
    setMessages(prev => [...prev, newMessage])

    try {
      // Send the message
      const { data, error: sendError } = await supabase
        .from('direct_messages')
        .insert([{
          content,
          sender_id: currentUser.id,
          receiver_id: otherUserId,
          file_id: fileMetadata?.id
        }])
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
        .single()

      if (sendError) throw sendError

      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticId ? {
            ...data,
            type: 'dm' as const,
            file: data.file ? {
              ...data.file,
              url: supabase.storage.from('public-documents').getPublicUrl(data.file.path).data.publicUrl
            } : undefined
          } : msg
        )
      )

      logWithTime('Message sent successfully:', data)
    } catch (error) {
      logWithTime('Error sending message:', error)
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId))
      
      // Show error to user
      toast.error('Failed to send message. Please try again.')
      
      throw error
    }
  }, [currentUser, otherUserId])

  // Deduplicate messages in state
  const deduplicateMessages = useCallback((messages: DirectMessage[]) => {
    const seen = new Set()
    return messages.filter(msg => {
      if (seen.has(msg.id)) return false
      seen.add(msg.id)
      return true
    })
  }, [])

  // Update messages state with deduplication
  const updateMessages = useCallback((newMessages: DirectMessage[]) => {
    setMessages(prev => deduplicateMessages([...prev, ...newMessages]))
  }, [deduplicateMessages])

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
        if (!currentUser) {
          throw new Error('User must be logged in to fetch messages')
        }
        
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
        toast.error('Error loading messages. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Subscribe to new messages with simpler channel naming
    const channelName = `direct_messages_${currentUser.id}_${otherUserId}`
    logWithTime('Creating channel', { channelName })

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',  // Focus on inserts only for now
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${otherUserId}`  // Only listen for messages from the other user
        },
        async (payload: any) => {
          logWithTime('Received DM payload', { payload })

          const newMessage = payload.new
          
          // Don't process if we already have this message
          const isDuplicate = messagesRef.current.some(msg => msg.id === newMessage.id)
          if (isDuplicate) {
            logWithTime('Skipping duplicate message', newMessage)
            return
          }

          // Create a temporary message immediately
          const tempMessage: DirectMessage = {
            ...newMessage,
            type: 'dm',
            sender: {
              username: 'Loading...',
              status: 'online',
            },
            file: undefined
          }
          
          logWithTime('Adding temporary message to state', tempMessage)
          setMessages(prev => [...prev, tempMessage])

          try {
            // Fetch the complete message with all relations
            const { data: messageData, error: messageError } = await supabase
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
              .eq('id', newMessage.id)
              .single()

            if (messageError) throw messageError

            const formattedMessage: DirectMessage = {
              ...messageData,
              type: 'dm',
              file: messageData.file ? {
                ...messageData.file,
                url: supabase.storage.from('public-documents').getPublicUrl(messageData.file.path).data.publicUrl
              } : undefined
            }

            logWithTime('Updating message with complete data', formattedMessage)
            
            setMessages(prev => prev.map(msg => 
              msg.id === newMessage.id ? formattedMessage : msg
            ))
          } catch (error) {
            console.error('Error fetching complete message:', error)
            toast.error('Error receiving new message')
          }
        }
      )
      .subscribe(async (status, err) => {
        logWithTime('Subscription status changed', { status, error: err })
        
        if (err) {
          console.error('Subscription error:', err)
          toast.error('Lost connection to chat. Reconnecting...')
          
          // Attempt to reconnect
          try {
            await channel.unsubscribe()
            await channel.subscribe()
          } catch (reconnectError) {
            console.error('Reconnection failed:', reconnectError)
            toast.error('Failed to reconnect. Please refresh the page.')
          }
        } else if (status === 'SUBSCRIBED') {
          logWithTime('Successfully subscribed to DM channel')
        }
      })

    return () => {
      logWithTime('Cleaning up subscription', { channelName })
      supabase.removeChannel(channel)
    }
  }, [currentUser, otherUserId])

  return {
    messages,
    loading,
    error,
    sendMessage
  }
} 