import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  created_at: string
  channel_id: string
  sender_id: string
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

interface MessagePayload {
  new: {
    id: string
    content: string
    created_at: string
    channel_id: string
    sender_id: string
    file_id?: string
  }
}

interface FileData {
  id: string
  url: string
  name: string
  type: string
  size: number
}

interface FileMetadataResponse {
  id: string
  name: string
  type: string
  size: number
  path: string
}

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user: currentUser } = useAuth()
  const messagesRef = useRef<Message[]>([])

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
    if (!currentUser || !channelId) {
      throw new Error('Must be logged in to send messages')
    }

    // Create optimistic message
    const optimisticId = `temp-${Date.now()}`
    const newMessage = {
      id: optimisticId,
      content,
      channel_id: channelId,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_id: fileMetadata?.id,
      type: 'channel' as const,
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        status: currentUser.status,
        profile_picture: currentUser.profile_picture
      },
      reactions: [],
      file: fileMetadata
    }

    logWithTime('Adding optimistic message:', newMessage)

    // Add optimistic message to state
    setMessages(prev => [...prev, newMessage])

    try {
      // Send the message
      const { data, error: sendError } = await supabase
        .from('messages')
        .insert([{
          content,
          channel_id: channelId,
          sender_id: currentUser.id,
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
          reactions(*),
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
            type: 'channel' as const,
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
  }, [currentUser, channelId])

  // Deduplicate messages in state
  const deduplicateMessages = useCallback((messages: Message[]) => {
    const seen = new Set()
    return messages.filter(msg => {
      if (seen.has(msg.id)) return false
      seen.add(msg.id)
      return true
    })
  }, [])

  // Update messages state with deduplication
  const updateMessages = useCallback((newMessages: Message[]) => {
    setMessages(prev => deduplicateMessages([...prev, ...newMessages]))
  }, [deduplicateMessages])

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
        toast.error('Error loading messages. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    // Fetch initial messages
    fetchMessages()

    // Set up real-time subscription
    const channelName = `messages:${channelId}`
    logWithTime('Creating channel subscription', { channelName })

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen for all events
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload: any) => {
          logWithTime('Received message payload', { type: payload.eventType, payload })

          // Handle different event types
          switch (payload.eventType) {
            case 'INSERT': {
              const newMessage = payload.new
              
              // Don't process if we already have this message
              const isDuplicate = messagesRef.current.some(msg => msg.id === newMessage.id)
              if (isDuplicate) {
                logWithTime('Skipping duplicate message', newMessage)
                return
              }

              // For messages from other users, create a temporary message immediately
              if (newMessage.sender_id !== currentUser?.id) {
                const tempMessage: Message = {
                  ...newMessage,
                  type: 'channel',
                  sender: {
                    id: newMessage.sender_id,
                    username: 'Loading...',
                    status: 'online'
                  },
                  reactions: [],
                  file: undefined
                }
                
                logWithTime('Adding temporary message to state', tempMessage)
                setMessages(prev => [...prev, tempMessage])

                try {
                  // Fetch the complete message with all relations
                  const { data: messageData, error: messageError } = await supabase
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
                    .eq('id', newMessage.id)
                    .single()

                  if (messageError) throw messageError

                  const formattedMessage: Message = {
                    ...messageData,
                    type: 'channel',
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
              break
            }
            // Handle other event types if needed
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
          logWithTime('Successfully subscribed to channel messages')
        }
      })

    return () => {
      logWithTime('Cleaning up subscription', { channelName })
      supabase.removeChannel(channel)
    }
  }, [channelId, currentUser])

  // Helper function to fetch file metadata
  const fetchFileMetadata = async (fileId: string): Promise<FileData | undefined> => {
    const { data, error } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('id', fileId)
      .single()

    if (error) {
      console.error('Error fetching file metadata:', error)
      return undefined
    }

    const fileData = data as FileMetadataResponse
    return {
      id: fileData.id,
      name: fileData.name,
      type: fileData.type,
      size: fileData.size,
      url: supabase.storage.from('public-documents').getPublicUrl(fileData.path).data.publicUrl
    }
  }

  // Add temporary message to state
  const addTemporaryMessage = async (payload: any) => {
    // Create temporary message
    const tempMessage: Message = {
      id: payload.id,
      content: payload.content,
      created_at: payload.created_at,
      sender_id: payload.sender_id,
      channel_id: payload.channel_id,
      sender: {
        id: payload.sender_id,
        username: 'Loading...',
        status: 'offline'
      },
      type: 'channel',
      reactions: [],
      file: payload.file_id ? {
        id: payload.file_id,
        name: 'Loading...',
        type: 'application/octet-stream',
        size: 0,
        url: ''
      } : undefined
    }

    // Add to messages state
    setMessages(prev => {
      // Check if message already exists
      if (prev.some(m => m.id === tempMessage.id)) {
        return prev
      }
      return [...prev, tempMessage]
    })

    // If message has a file, fetch the complete file metadata
    if (payload.file_id) {
      try {
        const { data: fileData, error } = await supabase
          .from('file_metadata')
          .select('*')
          .eq('id', payload.file_id)
          .single()

        if (error) throw error

        // Update message with file data
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id 
            ? {
                ...m,
                file: {
                  id: fileData.id,
                  name: fileData.name,
                  type: fileData.type,
                  size: fileData.size,
                  url: supabase.storage
                    .from('public-documents')
                    .getPublicUrl(fileData.path)
                    .data.publicUrl
                }
              }
            : m
        ))
      } catch (error) {
        console.error('Error fetching file metadata:', error)
      }
    }
  }

  // Update message with complete data
  const updateMessageWithCompleteData = async (messageId: string) => {
    try {
      const { data: messageData, error } = await supabase
        .from('messages')
        .select(`
          *,
          channel:channels(id, name),
          sender:users!sender_id(username, profile_picture),
          file:file_metadata(*)
        `)
        .eq('id', messageId)
        .single()

      if (error) throw error

      const updatedMessage: Message = {
        ...messageData,
        type: 'channel',
        reactions: [],
        sender: {
          id: messageData.sender_id,
          username: messageData.sender?.username || 'Unknown',
          status: 'offline'
        },
        file: messageData.file 
          ? {
              id: messageData.file.id,
              name: messageData.file.name,
              type: messageData.file.type,
              size: messageData.file.size,
              url: supabase.storage
                .from('public-documents')
                .getPublicUrl(messageData.file.path)
                .data.publicUrl
            }
          : undefined
      }

      setMessages(prev => prev.map(m => 
        m.id === messageId ? updatedMessage : m
      ))
    } catch (error) {
      console.error('Error fetching complete message data:', error)
    }
  }

  return {
    messages,
    loading,
    error,
    sendMessage
  }
} 