import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { User, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']

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
    size: number
  }
}

type Channel = Tables['channels']['Row'] & {
  memberships: Array<{
    user_id: string
    is_admin: boolean
  }>
}

type DMUser = {
  id: string
  username: string
  status: Enums['user_status']
  profile_picture: string | null
  email: string
  created_at: string | null
  updated_at: string | null
  is_verified: boolean | null
}

interface Source {
  content: string
  score: number
}

interface AIResponse {
  answer: string
  sources: Source[]
  cached: boolean
}

interface UnreadCount {
  count: number
  lastReadAt: string | null
}

interface StoreState {
  // Current user
  currentUser: User | null
  setCurrentUser: (user: User | null) => void

  // Channels
  channels: Channel[]
  setChannels: (channels: Channel[]) => void
  addChannel: (channel: Channel) => void
  updateChannel: (channel: Channel) => void
  removeChannel: (channelId: string) => void

  // Messages
  messagesByChannel: Record<string, DatabaseMessage[]>
  setChannelMessages: (channelId: string, messages: DatabaseMessage[]) => void
  addMessage: (channelId: string, message: DatabaseMessage) => void
  updateMessage: (channelId: string, message: DatabaseMessage) => void
  removeMessage: (channelId: string, messageId: string) => void

  // Thread Messages
  messagesByThread: Record<string, DatabaseMessage[]>
  setThreadMessages: (threadId: string, messages: DatabaseMessage[]) => void
  addThreadMessage: (threadId: string, message: DatabaseMessage) => void
  updateThreadMessage: (threadId: string, message: DatabaseMessage) => void
  removeThreadMessage: (threadId: string, messageId: string) => void

  // Message Actions
  sendMessage: (content: string, channelId: string, fileMetadata?: { id: string; url: string; name: string; type: string; size: number }, threadId?: string) => Promise<void>

  // User presence
  userPresence: Record<string, Enums['user_status']>
  setUserPresence: (userId: string, status: Enums['user_status']) => void

  // DM users
  dmUsers: DMUser[]
  setDMUsers: (users: DMUser[]) => void

  // Unread counts
  channelUnreadCounts: Record<string, UnreadCount>
  dmUnreadCounts: Record<string, UnreadCount>
  setChannelUnreadCount: (channelId: string, count: UnreadCount) => void
  setDMUnreadCount: (userId: string, count: UnreadCount) => void
  markChannelAsRead: (channelId: string) => Promise<void>
  markDmAsRead: (otherUserId: string) => Promise<void>

  // Subscriptions
  initializeSubscriptions: () => () => void
  cleanup: () => void

  // AI State
  aiResponse: AIResponse | null
  aiLoading: boolean
  aiError: string | null
  setAIResponse: (response: AIResponse | null) => void
  setAILoading: (loading: boolean) => void
  setAIError: (error: string | null) => void
  askQuestion: (question: string) => Promise<void>
  clearAIResponse: () => void
}

const useStore = create<StoreState>((set, get) => ({
  // Current user
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Channels
  channels: [],
  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set((state) => ({ 
    channels: [...state.channels, channel] 
  })),
  updateChannel: (channel) => set((state) => ({
    channels: state.channels.map((c) => (c.id === channel.id ? channel : c))
  })),
  removeChannel: (channelId) => set((state) => ({
    channels: state.channels.filter((c) => c.id !== channelId)
  })),

  // Messages
  messagesByChannel: {},
  setChannelMessages: (channelId, messages) => set((state) => ({
    messagesByChannel: {
      ...state.messagesByChannel,
      [channelId]: messages
    }
  })),
  addMessage: (channelId, message) => set((state) => ({
    messagesByChannel: {
      ...state.messagesByChannel,
      [channelId]: [message, ...(state.messagesByChannel[channelId] || [])]
    }
  })),
  updateMessage: (channelId, message) => set((state) => ({
    messagesByChannel: {
      ...state.messagesByChannel,
      [channelId]: state.messagesByChannel[channelId]?.map((m) => 
        m.id === message.id ? message : m
      ) || []
    }
  })),
  removeMessage: (channelId, messageId) => set((state) => ({
    messagesByChannel: {
      ...state.messagesByChannel,
      [channelId]: state.messagesByChannel[channelId]?.filter((m) => m.id !== messageId) || []
    }
  })),

  // Thread Messages
  messagesByThread: {},
  setThreadMessages: (threadId, messages) => set((state) => ({
    messagesByThread: {
      ...state.messagesByThread,
      [threadId]: messages
    }
  })),
  addThreadMessage: (threadId, message) => set((state) => ({
    messagesByThread: {
      ...state.messagesByThread,
      [threadId]: [...(state.messagesByThread[threadId] || []), message]
    }
  })),
  updateThreadMessage: (threadId, message) => set((state) => ({
    messagesByThread: {
      ...state.messagesByThread,
      [threadId]: state.messagesByThread[threadId]?.map((m) => 
        m.id === message.id ? message : m
      ) || []
    }
  })),
  removeThreadMessage: (threadId, messageId) => set((state) => ({
    messagesByThread: {
      ...state.messagesByThread,
      [threadId]: state.messagesByThread[threadId]?.filter((m) => m.id !== messageId) || []
    }
  })),

  // Message Actions
  sendMessage: async (content, channelId, fileMetadata, threadId) => {
    const { currentUser } = get()
    if (!currentUser) return

    const supabase = createClient()
    try {
      const messageData = {
        content,
        channel_id: channelId,
        sender_id: currentUser.id,
        thread_id: threadId || null
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert(messageData)
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
        .single()

      if (error) throw error

      // If there's a file, upload it and link to the message
      if (fileMetadata) {
        // Create a File object from the metadata
        const file = new File(
          [await (await fetch(fileMetadata.url)).blob()],
          fileMetadata.name,
          { type: fileMetadata.type }
        )

        // Upload the actual file first
        const { error: uploadError } = await supabase.storage
          .from('public-documents')
          .upload(`${message.id}/${fileMetadata.name}`, file)

        if (uploadError) throw uploadError

        // Then create the metadata record
        const fileMetadataInsert: Tables['file_metadata']['Insert'] = {
          bucket: 'public-documents',
          path: `${message.id}/${fileMetadata.name}`,
          name: fileMetadata.name,
          type: fileMetadata.type,
          size: fileMetadata.size,
          user_id: currentUser.id,
          channel_id: channelId,
          message_id: message.id
        }

        const { error: fileError } = await supabase
          .from('file_metadata')
          .insert(fileMetadataInsert)

        if (fileError) throw fileError
      }

      // Ensure we have non-null values for required fields
      if (!message.sender_id || !message.channel_id) {
        throw new Error('Missing required message fields')
      }

      // Transform the message to match our DatabaseMessage type
      const formattedMessage: DatabaseMessage = {
        id: message.id,
        content: message.content,
        sender_id: message.sender_id,
        channel_id: message.channel_id,
        thread_id: message.thread_id,
        created_at: message.created_at,
        updated_at: message.updated_at,
        file_id: message.file_id,
        reply_count: message.reply_count,
        sender: message.sender,
        reactions: message.reactions || [],
        file_metadata: message.file_metadata ? {
          message_id: message.id,
          bucket: message.file_metadata.bucket,
          path: message.file_metadata.path,
          name: message.file_metadata.name,
          type: message.file_metadata.type,
          size: message.file_metadata.size
        } : undefined
      }

      // Add message to the appropriate store
      if (threadId) {
        get().addThreadMessage(threadId, formattedMessage)
      } else {
        get().addMessage(channelId, formattedMessage)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  },

  // User presence
  userPresence: {},
  setUserPresence: (userId, status) => set((state) => ({
    userPresence: { ...state.userPresence, [userId]: status }
  })),

  // DM users
  dmUsers: [],
  setDMUsers: (users) => set({ dmUsers: users }),

  // Unread counts
  channelUnreadCounts: {},
  dmUnreadCounts: {},
  setChannelUnreadCount: (channelId, count) => set((state) => ({
    channelUnreadCounts: { ...state.channelUnreadCounts, [channelId]: count }
  })),
  setDMUnreadCount: (userId, count) => set((state) => ({
    dmUnreadCounts: { ...state.dmUnreadCounts, [userId]: count }
  })),
  markChannelAsRead: async (channelId) => {
    const { currentUser } = get()
    if (!currentUser?.id) return

    const supabase = createClient()
    try {
      const now = new Date().toISOString()
      await supabase
        .from('last_read')
        .upsert({
          user_id: currentUser.id,
          channel_id: channelId,
          last_read_at: now
        })

      set((state) => ({
        channelUnreadCounts: {
          ...state.channelUnreadCounts,
          [channelId]: { count: 0, lastReadAt: now }
        }
      }))
    } catch (error) {
      console.error('Error marking channel as read:', error)
      toast.error('Failed to mark channel as read')
    }
  },
  markDmAsRead: async (otherUserId) => {
    const { currentUser } = get()
    if (!currentUser?.id) return

    const supabase = createClient()
    try {
      const now = new Date().toISOString()
      await supabase
        .from('dm_last_read')
        .upsert({
          user_id: currentUser.id,
          other_user_id: otherUserId,
          last_read_at: now
        })

      set((state) => ({
        dmUnreadCounts: {
          ...state.dmUnreadCounts,
          [otherUserId]: { count: 0, lastReadAt: now }
        }
      }))
    } catch (error) {
      console.error('Error marking DM as read:', error)
      toast.error('Failed to mark messages as read')
    }
  },

  // Subscriptions
  initializeSubscriptions: () => {
    // Implementation
    return () => {}
  },
  cleanup: () => {},

  // AI State
  aiResponse: null,
  aiLoading: false,
  aiError: null,
  setAIResponse: (response) => set({ aiResponse: response }),
  setAILoading: (loading) => set({ aiLoading: loading }),
  setAIError: (error) => set({ aiError: error }),
  askQuestion: async (question) => {
    set({ aiLoading: true, aiError: null })
    
    try {
      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      set({ aiResponse: data, aiLoading: false })
    } catch (error) {
      console.error('Error asking question:', error)
      set({ 
        aiError: error instanceof Error ? error.message : 'Failed to get AI response',
        aiLoading: false 
      })
    }
  },
  clearAIResponse: () => set({ aiResponse: null, aiError: null })
}))

export default useStore 