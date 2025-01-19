export interface Conversation {
  id: string
  type: 'dm' | 'group'
  name: string | null
} 