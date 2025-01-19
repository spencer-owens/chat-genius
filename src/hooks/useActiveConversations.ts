import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCounts } from '@/hooks/useUnreadCounts'

interface User {
  id: string
  username: string
  profile_picture?: string
}

interface Conversation {
  user: User
  lastMessage: {
    content: string
    created_at: string
  } | null
  unreadCount: number
}

interface MessageWithUsers {
  id: string
  content: string
  created_at: string
  sender: User
  receiver: User
}

export function useActiveConversations(user = null) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuth()
  const { dmUnreadCounts } = useUnreadCounts(user)
  const supabase = createClient()

  useEffect(() => {
    if (!currentUser?.id) {
      setConversations([])
      setLoading(false)
      return
    }

    const userId = currentUser.id
    let mounted = true

    async function fetchConversations() {
      try {
        // Get all DM conversations where the current user is either sender or receiver
        const { data: messages, error } = await supabase
          .from('direct_messages')
          .select(`
            id,
            content,
            created_at,
            sender:users!sender_id(id, username, profile_picture),
            receiver:users!receiver_id(id, username, profile_picture)
          `)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Process messages to get unique conversations with their last message
        const conversationMap = new Map<string, Conversation>()

        const typedMessages = messages as unknown as MessageWithUsers[]
        typedMessages?.forEach(message => {
          const otherUser = message.sender.id === userId ? message.receiver : message.sender
          
          if (!conversationMap.has(otherUser.id)) {
            conversationMap.set(otherUser.id, {
              user: otherUser,
              lastMessage: {
                content: message.content,
                created_at: message.created_at
              },
              unreadCount: dmUnreadCounts[otherUser.id]?.count || 0
            })
          }
        })

        if (mounted) {
          setConversations(Array.from(conversationMap.values()))
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchConversations()

    // Subscribe to new messages
    const channel = supabase
      .channel('active_conversations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`
        },
        async (payload: any) => {
          const newMessage = payload.new

          // Fetch the complete message with user details
          const { data: messageData } = await supabase
            .from('direct_messages')
            .select(`
              id,
              content,
              created_at,
              sender:users!sender_id(id, username, profile_picture),
              receiver:users!receiver_id(id, username, profile_picture)
            `)
            .eq('id', newMessage.id)
            .single()

          if (!messageData || !mounted) return

          const message = messageData as unknown as MessageWithUsers
          const otherUser = message.sender.id === userId ? message.receiver : message.sender

          setConversations(prev => {
            const existing = prev.find(conv => conv.user.id === otherUser.id)
            if (existing) {
              return prev.map(conv => 
                conv.user.id === otherUser.id
                  ? {
                      ...conv,
                      lastMessage: {
                        content: message.content,
                        created_at: message.created_at
                      },
                      unreadCount: dmUnreadCounts[otherUser.id]?.count || 0
                    }
                  : conv
              )
            } else {
              return [{
                user: otherUser,
                lastMessage: {
                  content: message.content,
                  created_at: message.created_at
                },
                unreadCount: dmUnreadCounts[otherUser.id]?.count || 0
              }, ...prev]
            }
          })
        }
      )
      .subscribe()

    return () => {
      mounted = false
      channel.unsubscribe()
    }
  }, [currentUser, dmUnreadCounts])

  return { conversations, loading }
} 