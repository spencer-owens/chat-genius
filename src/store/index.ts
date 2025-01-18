import { create } from 'zustand'
import { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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

interface StoreState {
  // Existing state
  currentUser: Tables['users']['Row'] | null
  setCurrentUser: (user: Tables['users']['Row'] | null) => void
  
  // Channels
  channels: Tables['channels']['Row'][]
  setChannels: (channels: Tables['channels']['Row'][]) => void
  addChannel: (channel: Tables['channels']['Row']) => void
  updateChannel: (channel: Tables['channels']['Row']) => void
  removeChannel: (channelId: string) => void
  
  // Messages
  messagesByChannel: Record<string, DatabaseMessage[]>
  setChannelMessages: (channelId: string, messages: DatabaseMessage[]) => void
  addMessage: (channelId: string, message: DatabaseMessage) => void
  updateMessage: (channelId: string, message: DatabaseMessage) => void
  deleteMessage: (channelId: string, messageId: string) => void
  
  // Thread Messages
  messagesByThread: Record<string, DatabaseMessage[]>
  setThreadMessages: (threadId: string, messages: DatabaseMessage[]) => void
  addThreadReply: (threadId: string, message: DatabaseMessage) => void
  updateThreadReply: (threadId: string, message: DatabaseMessage) => void
  deleteThreadReply: (threadId: string, messageId: string) => void
  
  // Message Actions
  sendMessage: (
    content: string, 
    channelId: string, 
    fileMetadata?: { 
      id: string; 
      url: string; 
      name: string; 
      type: string; 
      size: number 
    }, 
    threadId?: string | null
  ) => Promise<void>
  
  // User presence
  userPresence: Record<string, any>
  updatePresence: (channelId: string, state: any) => void
  setUserPresence: (userId: string, status: Tables['users']['Row']['status']) => void

  // Last Read
  lastReadByChannel: Record<string, string>
  updateLastRead: (channelId: string, lastReadAt: string) => void

  // DM Users
  dmUsers: Tables['users']['Row'][]
  refreshDMUsers: () => Promise<void>

  // Typing Status
  typingUsers: Record<string, Record<string, Tables['users']['Row']>>
  updateTypingUsers: (channelId: string, users: Record<string, Tables['users']['Row']>) => void
  removeTypingUser: (channelId: string, userId: string) => void

  // Unread Counts
  channelUnreadCounts: Record<string, { count: number; lastReadAt: string | null }>
  dmUnreadCounts: Record<string, { count: number; lastReadAt: string | null }>
  markChannelAsRead: (channelId: string) => Promise<void>
  markDmAsRead: (userId: string) => Promise<void>
}

const useStore = create<StoreState>((set, get) => ({
  // Existing state
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  // Channels
  channels: [],
  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set((state) => ({ channels: [...state.channels, channel] })),
  updateChannel: (channel) => set((state) => ({
    channels: state.channels.map(c => c.id === channel.id ? channel : c)
  })),
  removeChannel: (channelId) => set((state) => ({
    channels: state.channels.filter(c => c.id !== channelId)
  })),
  
  // Messages
  messagesByChannel: {},
  setChannelMessages: (channelId, messages) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: messages
      }
    })),
    
  addMessage: (channelId, message) => 
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: [message, ...(state.messagesByChannel[channelId] || [])]
      }
    })),
    
  updateMessage: (channelId, message) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: state.messagesByChannel[channelId]?.map(m => 
          m.id === message.id ? message : m
        ) || []
      }
    })),
    
  deleteMessage: (channelId, messageId) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: state.messagesByChannel[channelId]?.filter(m => m.id !== messageId) || []
      }
    })),
  
  // Thread Messages
  messagesByThread: {},
  setThreadMessages: (threadId, messages) =>
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: messages
      }
    })),
    
  addThreadReply: (threadId, message) =>
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] || []), message]
      }
    })),
    
  updateThreadReply: (threadId, message) =>
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: state.messagesByThread[threadId]?.map(m => 
          m.id === message.id ? message : m
        ) || []
      }
    })),
    
  deleteThreadReply: (threadId, messageId) =>
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: state.messagesByThread[threadId]?.filter(m => m.id !== messageId) || []
      }
    })),
  
  // User presence
  userPresence: {},
  updatePresence: (channelId, state) =>
    set((prev) => ({
      userPresence: {
        ...prev.userPresence,
        [channelId]: state
      }
    })),
  setUserPresence: (userId, status) =>
    set((prev) => ({
      userPresence: {
        ...prev.userPresence,
        [userId]: status
      }
    })),

  // Last Read
  lastReadByChannel: {},
  updateLastRead: (channelId, lastReadAt) =>
    set((state) => ({
      lastReadByChannel: {
        ...state.lastReadByChannel,
        [channelId]: lastReadAt
      }
    })),

  // DM Users
  dmUsers: [],
  refreshDMUsers: async () => {
    const { currentUser } = get()
    if (!currentUser?.id) return

    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', (
          await supabase
            .from('direct_messages')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        ).data?.reduce((acc: string[], msg) => {
          if (msg.sender_id === currentUser.id) {
            acc.push(msg.receiver_id)
          } else {
            acc.push(msg.sender_id)
          }
          return acc
        }, []) || [])

      if (error) throw error
      set({ dmUsers: data || [] })
    } catch (error) {
      console.error('Error refreshing DM users:', error)
      toast.error('Failed to refresh DM users')
    }
  },

  // Typing Status
  typingUsers: {},
  updateTypingUsers: (channelId, users) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: users
      }
    })),
  removeTypingUser: (channelId, userId) =>
    set((state) => {
      const channelTypingUsers = state.typingUsers[channelId] || {}
      const { [userId]: _, ...rest } = channelTypingUsers
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: rest
        }
      }
    }),

  // Unread Counts
  channelUnreadCounts: {},
  dmUnreadCounts: {},
  markChannelAsRead: async (channelId: string) => {
    const { currentUser } = get()
    if (!currentUser?.id) return

    const supabase = createClient()
    try {
      const lastReadAt = new Date().toISOString()
      const { error } = await supabase
        .from('last_read')
        .upsert({
          channel_id: channelId,
          user_id: currentUser.id,
          last_read_at: lastReadAt
        })

      if (error) throw error
      set((state) => ({
        channelUnreadCounts: {
          ...state.channelUnreadCounts,
          [channelId]: { count: 0, lastReadAt }
        }
      }))
    } catch (error) {
      console.error('Error marking channel as read:', error)
      toast.error('Failed to update read status')
    }
  },
  markDmAsRead: async (userId: string) => {
    const { currentUser } = get()
    if (!currentUser?.id) return

    const supabase = createClient()
    try {
      const lastReadAt = new Date().toISOString()
      const { error } = await supabase
        .from('dm_last_read')
        .upsert({
          user_id: currentUser.id,
          other_user_id: userId,
          last_read_at: lastReadAt
        })

      if (error) throw error
      set((state) => ({
        dmUnreadCounts: {
          ...state.dmUnreadCounts,
          [userId]: { count: 0, lastReadAt }
        }
      }))
    } catch (error) {
      console.error('Error marking DM as read:', error)
      toast.error('Failed to update read status')
    }
  },

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
        const fileMetadataInsert = {
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
        get().addThreadReply(threadId, formattedMessage)
      } else {
        get().addMessage(channelId, formattedMessage)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }
}))

export default useStore 