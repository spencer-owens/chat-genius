import type { File } from '../entities/File'
import type { User } from '../entities/User'
import type { Translation } from '../entities/Translation'

export interface MessageDisplayProps {
  id: string
  content: string
  user: User
  files?: File[]
  currentUser: User | null
  onlineUsers?: Set<string>
  messageType: 'post' | 'post_thread' | 'dm' | 'dm_thread'
  threadCount?: number
  onThreadOpen?: (message: any) => void
  onUpdate: (content: string) => void
  tableName: string
  className?: string
  hideActions?: boolean
  translation?: Translation | null
  created_at: string
} 