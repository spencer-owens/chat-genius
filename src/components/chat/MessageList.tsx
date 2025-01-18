'use client'

import { useEffect, useRef } from 'react'
import useStore from '@/store'
import MessageItem from './MessageItem'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type Message = Tables['messages']['Row'] & {
  sender: Tables['users']['Row']
  reactions: Tables['reactions']['Row'][]
  file?: {
    id: string
    url: string
    name: string
    type: string
    size: number
  }
}

interface MessageListProps {
  messages: Message[]
  channelId?: string
  threadId?: string
  onUpdateLastRead?: () => void
}

export default function MessageList({ messages, channelId, threadId, onUpdateLastRead }: MessageListProps) {
  const { currentUser } = useStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    if (onUpdateLastRead) {
      onUpdateLastRead()
    }
  }, [messages, onUpdateLastRead])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwnMessage={message.sender_id === currentUser?.id}
          channelId={channelId}
          threadId={threadId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
} 