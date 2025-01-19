import type { User } from './User'

export interface DirectMessage {
  conversation_id: string
  type: 'dm' | 'group'
  name: string | null
  participants: User[]
  unread_count?: number
} 