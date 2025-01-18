import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import useStore from '@/store'
import { Database } from '@/types/supabase'

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

type SubscriptionType = 
  | 'messages' 
  | 'presence' 
  | 'threads'
  | 'last_read'
  | 'memberships'
  | 'direct_messages'
  | 'typing_status'
  | 'reactions'
  | 'channels'
  | 'users'

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  
  private getChannelKey(type: SubscriptionType, id: string) {
    return `${type}:${id}`
  }

  private async fetchFullMessage(messageId: string): Promise<DatabaseMessage> {
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
      .eq('id', messageId)
      .single()

    if (error) throw error
    return data as DatabaseMessage
  }

  subscribeToMessages(channelId: string) {
    const key = this.getChannelKey('messages', channelId)
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, async (payload) => {
        const { new: newRecord, old: oldRecord, eventType } = payload
        const store = useStore.getState()
        
        try {
          switch (eventType) {
            case 'INSERT':
              if (newRecord?.id) {
                const message = await this.fetchFullMessage(newRecord.id)
                store.addMessage(channelId, message)
              }
              break
            case 'UPDATE':
              if (newRecord?.id) {
                const message = await this.fetchFullMessage(newRecord.id)
                store.updateMessage(channelId, message)
              }
              break
            case 'DELETE':
              if (oldRecord?.id) {
                store.deleteMessage(channelId, oldRecord.id)
              }
              break
          }
        } catch (error) {
          console.error('Error handling message change:', error)
        }
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  subscribeToThreadReplies(threadId: string) {
    const key = this.getChannelKey('threads', threadId)
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      }, async (payload) => {
        const { new: newRecord, old: oldRecord, eventType } = payload
        const store = useStore.getState()
        
        try {
          switch (eventType) {
            case 'INSERT':
              if (newRecord?.id) {
                const message = await this.fetchFullMessage(newRecord.id)
                store.addThreadReply(threadId, message)
              }
              break
            case 'UPDATE':
              if (newRecord?.id) {
                const message = await this.fetchFullMessage(newRecord.id)
                store.updateThreadReply(threadId, message)
              }
              break
            case 'DELETE':
              if (oldRecord?.id) {
                store.deleteThreadReply(threadId, oldRecord.id)
              }
              break
          }
        } catch (error) {
          console.error('Error handling thread reply change:', error)
        }
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  subscribeToPresence(channelId: string) {
    const key = this.getChannelKey('presence', channelId)
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('presence', { event: 'sync' }, () => {
        const store = useStore.getState()
        const state = channel.presenceState()
        store.updatePresence(channelId, state)
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  subscribeToLastRead(userId: string) {
    const key = this.getChannelKey('last_read', userId)
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'last_read',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const store = useStore.getState()
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new
          store.updateLastRead(row.channel_id, row.last_read_at)
        }
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  subscribeToMemberships(channelId: string) {
    const key = this.getChannelKey('memberships', channelId)
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'memberships',
        filter: `channel_id=eq.${channelId}`
      }, async () => {
        // Fetch updated channel data
        const { data: channel, error } = await supabase
          .from('channels')
          .select(`
            *,
            memberships(user_id, is_admin)
          `)
          .eq('id', channelId)
          .single()

        if (!error && channel) {
          const store = useStore.getState()
          store.updateChannel(channel)
        }
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  subscribeToDirectMessages(userId: string) {
    const key = this.getChannelKey('direct_messages', userId)
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
        filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`
      }, () => {
        // Trigger a refresh of DM users
        const store = useStore.getState()
        store.refreshDMUsers()
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  subscribeToTypingStatus(channelId: string) {
    const key = this.getChannelKey('typing_status', channelId)
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_status',
        filter: `channel_id=eq.${channelId}`
      }, async (payload) => {
        const store = useStore.getState()
        if (payload.eventType === 'DELETE' && payload.old?.user_id) {
          store.removeTypingUser(channelId, payload.old.user_id)
        } else {
          // Fetch updated typing users
          const { data: typingData } = await supabase
            .from('typing_status')
            .select(`
              user:users!user_id(
                id,
                username,
                email,
                status,
                profile_picture,
                created_at,
                updated_at,
                is_verified
              )
            `)
            .eq('channel_id', channelId)
            .gt('last_typed_at', new Date(Date.now() - 10000).toISOString())

          if (typingData) {
            const users = typingData.reduce((acc, data) => {
              const user = data.user as Tables['users']['Row']
              if (user) {
                acc[user.id] = user
              }
              return acc
            }, {} as Record<string, Tables['users']['Row']>)
            store.updateTypingUsers(channelId, users)
          }
        }
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  subscribeToReactions(messageId: string, messageType: 'channel' | 'direct') {
    const key = this.getChannelKey('reactions', messageId)
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reactions',
        filter: `message_id=eq.${messageId}`
      }, async (payload) => {
        const store = useStore.getState()
        if (messageType === 'channel') {
          // Fetch updated message data with reactions
          const { data: message } = await supabase
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
            .eq('id', messageId)
            .single()

          if (message) {
            const channelId = message.channel_id
            if (channelId) {
              store.updateMessage(channelId, message)
            }
          }
        }
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  subscribeToChannels() {
    const key = this.getChannelKey('channels', 'all')
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'channels'
      }, async (payload) => {
        const store = useStore.getState()
        
        if (payload.eventType === 'INSERT' && payload.new) {
          // Fetch full channel data with memberships
          const { data: channel, error } = await supabase
            .from('channels')
            .select(`
              *,
              memberships(user_id, is_admin)
            `)
            .eq('id', payload.new.id)
            .single()

          if (!error && channel) {
            store.addChannel(channel)
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          // Fetch updated channel data with memberships
          const { data: channel, error } = await supabase
            .from('channels')
            .select(`
              *,
              memberships(user_id, is_admin)
            `)
            .eq('id', payload.new.id)
            .single()

          if (!error && channel) {
            store.updateChannel(channel)
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          store.removeChannel(payload.old.id)
        }
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  subscribeToUsers() {
    const key = this.getChannelKey('users', 'all')
    
    if (this.channels.has(key)) {
      return this.channels.get(key)!
    }

    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, async (payload) => {
        const store = useStore.getState()
        if (payload.eventType === 'UPDATE' && payload.new) {
          store.setUserPresence(payload.new.id, payload.new.status)
        }
      })
      .subscribe()

    this.channels.set(key, channel)
    return channel
  }

  unsubscribe(type: SubscriptionType, id: string) {
    const key = this.getChannelKey(type, id)
    const channel = this.channels.get(key)
    
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(key)
    }
  }

  unsubscribeAll() {
    this.channels.forEach(channel => channel.unsubscribe())
    this.channels.clear()
  }
}

export const realtimeManager = new RealtimeManager() 