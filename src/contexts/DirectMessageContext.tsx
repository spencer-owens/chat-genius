import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

// Types
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

interface DirectMessageContextType {
  messages: Record<string, DirectMessage[]>
  loading: boolean
  error: Error | null
  sendMessage: (otherUserId: string, content: string, fileMetadata?: any) => Promise<void>
  subscribeToUser: (otherUserId: string) => Promise<void>
}

const DirectMessageContext = createContext<DirectMessageContextType | null>(null)

// Debug helper
const logWithTime = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] DM: ${message}`, data || '')
}

export function DirectMessageProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Record<string, DirectMessage[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user: currentUser } = useAuth()
  const messagesRef = useRef<Record<string, DirectMessage[]>>({})
  const activeSubscriptions = useRef<Record<string, any>>({})

  // Update ref whenever messages change
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Deduplicate messages
  const deduplicateMessages = (messages: DirectMessage[]) => {
    const seen = new Set()
    return messages.filter(msg => {
      if (seen.has(msg.id)) return false
      seen.add(msg.id)
      return true
    })
  }

  // Send message function
  const sendMessage = async (otherUserId: string, content: string, fileMetadata?: any) => {
    if (!currentUser) {
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
      type: 'dm' as const,
      sender: {
        username: currentUser.username,
        status: currentUser.status,
        profile_picture: currentUser.profile_picture
      },
      file: fileMetadata
    }

    // Add optimistic message
    setMessages(prev => ({
      ...prev,
      [otherUserId]: [...(prev[otherUserId] || []), newMessage]
    }))

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
      setMessages(prev => ({
        ...prev,
        [otherUserId]: prev[otherUserId].map(msg =>
          msg.id === optimisticId ? {
            ...data,
            type: 'dm' as const,
            file: data.file ? {
              ...data.file,
              url: supabase.storage.from('public-documents').getPublicUrl(data.file.path).data.publicUrl
            } : undefined
          } : msg
        )
      }))
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => ({
        ...prev,
        [otherUserId]: prev[otherUserId].filter(msg => msg.id !== optimisticId)
      }))
      toast.error('Failed to send message. Please try again.')
      throw error
    }
  }

  // Subscribe to messages for a specific user
  const subscribeToUser = async (otherUserId: string) => {
    if (!currentUser || activeSubscriptions.current[otherUserId]) return

    // Fetch initial messages
    try {
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

      const formattedMessages = (data || []).map(msg => ({
        ...msg,
        type: 'dm' as const,
        file: msg.file ? {
          ...msg.file,
          url: supabase.storage.from('public-documents').getPublicUrl(msg.file.path).data.publicUrl
        } : undefined
      }))

      setMessages(prev => ({
        ...prev,
        [otherUserId]: formattedMessages
      }))
    } catch (e) {
      console.error('Error fetching messages:', e)
      return
    }

    // Set up subscription
    const channelName = `direct_messages_${currentUser.id}_${otherUserId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${otherUserId}`
        },
        async (payload: any) => {
          const newMessage = payload.new

          // Don't process if we already have this message
          if (messagesRef.current[otherUserId]?.some(msg => msg.id === newMessage.id)) {
            return
          }

          try {
            // Fetch the complete message
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

            setMessages(prev => ({
              ...prev,
              [otherUserId]: [...(prev[otherUserId] || []), formattedMessage]
            }))
          } catch (error) {
            console.error('Error fetching complete message:', error)
          }
        }
      )
      .subscribe()

    activeSubscriptions.current[otherUserId] = channel
  }

  // Cleanup subscriptions when component unmounts
  useEffect(() => {
    return () => {
      Object.values(activeSubscriptions.current).forEach(channel => {
        supabase.removeChannel(channel)
      })
      activeSubscriptions.current = {}
    }
  }, [])

  // Subscribe to user when currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setMessages({})
      setLoading(false)
      return
    }

    setLoading(false)
  }, [currentUser])

  return (
    <DirectMessageContext.Provider value={{ messages, loading, error, sendMessage, subscribeToUser }}>
      {children}
    </DirectMessageContext.Provider>
  )
}

export function useDirectMessageContext() {
  const context = useContext(DirectMessageContext)
  if (!context) {
    throw new Error('useDirectMessageContext must be used within a DirectMessageProvider')
  }
  return context
}

// Hook to use messages for a specific user
export function useUserMessages(otherUserId: string | null) {
  const context = useDirectMessageContext()
  const { user: currentUser } = useAuth()

  useEffect(() => {
    if (currentUser && otherUserId) {
      context.subscribeToUser(otherUserId)
    }
  }, [currentUser, otherUserId, context.subscribeToUser])

  return {
    messages: otherUserId ? context.messages[otherUserId] || [] : [],
    loading: context.loading,
    error: context.error,
    sendMessage: (content: string, fileMetadata?: any) => {
      if (!otherUserId) throw new Error('No user selected')
      return context.sendMessage(otherUserId, content, fileMetadata)
    }
  }
} 