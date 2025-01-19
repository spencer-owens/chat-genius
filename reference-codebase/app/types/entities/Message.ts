import type { Translation } from './Translation'
import type { FileAttachment } from './FileAttachment'
import type { User } from './User'

export interface Message {
  id: string
  content: string
  created_at: string
  sender: User
  files?: FileAttachment[]
  translation: Translation | null
} 