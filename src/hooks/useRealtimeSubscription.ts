import { useEffect } from 'react'
import { realtimeManager } from '@/lib/realtime-manager'

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

export function useRealtimeSubscription(
  type: SubscriptionType, 
  id: string,
  messageType?: 'channel' | 'direct'
) {
  useEffect(() => {
    switch (type) {
      case 'messages':
        realtimeManager.subscribeToMessages(id)
        break
      case 'presence':
        realtimeManager.subscribeToPresence(id)
        break
      case 'threads':
        realtimeManager.subscribeToThreadReplies(id)
        break
      case 'last_read':
        realtimeManager.subscribeToLastRead(id)
        break
      case 'memberships':
        realtimeManager.subscribeToMemberships(id)
        break
      case 'direct_messages':
        realtimeManager.subscribeToDirectMessages(id)
        break
      case 'typing_status':
        realtimeManager.subscribeToTypingStatus(id)
        break
      case 'reactions':
        if (messageType) {
          realtimeManager.subscribeToReactions(id, messageType)
        }
        break
      case 'channels':
        realtimeManager.subscribeToChannels()
        break
      case 'users':
        realtimeManager.subscribeToUsers()
        break
    }

    return () => {
      realtimeManager.unsubscribe(type, id)
    }
  }, [type, id, messageType])
} 