import { useEffect, useRef } from 'react'
import { JeopardyMessage } from './JeopardyMessage'
import type { JeopardyMessage as JeopardyMessageType } from '@/hooks/useJeopardyMessages'

interface Props {
  messages: JeopardyMessageType[]
  isLoading?: boolean
}

export function JeopardyMessageList({ messages, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <JeopardyMessage key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="text-gray-600 dark:text-gray-300 animate-pulse">
          do doo doo do do doooo doo doo doo...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
} 