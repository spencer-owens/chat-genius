import { useUserMessages } from '@/contexts/DirectMessageContext'

export function useDirectMessages(otherUserId: string | null) {
  return useUserMessages(otherUserId)
} 