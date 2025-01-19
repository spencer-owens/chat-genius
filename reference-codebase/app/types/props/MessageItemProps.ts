import type { Message } from '../entities/Message'
import type { User } from '../entities/User'

export interface MessageItemProps {
  message: Message
  currentUser: User | null
  onlineUsers: Set<string>
  onThreadOpen?: (message: Message) => void
} 