import { useEffect, useRef } from 'react'
import { UserPresenceIndicator } from '../shared/UserPresenceIndicator'
import { MessageThread } from './MessageThread'
import { format } from 'date-fns'

interface Message {
  id: string
  content: string
  created_at: string
  sender: {
    username: string
    status: 'online' | 'offline' | 'away' | 'busy'
  }
  reactions: Array<{
    emoji: string
    user_id: string
  }>
}

interface MessageListProps {
  messages: Message[]
  onReaction: (messageId: string, emoji: string) => void
  onThreadClick: (messageId: string) => void
}

export function MessageList({ messages, onReaction, onThreadClick }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) => (
        <div key={message.id} className="mb-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-white">{message.sender.username[0]}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-white">
                  {message.sender.username}
                </p>
                <UserPresenceIndicator status={message.sender.status} />
                <span className="text-xs text-gray-400">
                  {format(new Date(message.created_at), 'HH:mm')}
                </span>
              </div>
              <p className="text-sm text-gray-300 mt-1">{message.content}</p>
              
              <div className="mt-2 flex items-center space-x-2">
                <button
                  onClick={() => onThreadClick(message.id)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Reply in thread
                </button>
                <div className="flex space-x-1">
                  {message.reactions.map((reaction, idx) => (
                    <button
                      key={`${reaction.emoji}-${idx}`}
                      onClick={() => onReaction(message.id, reaction.emoji)}
                      className="px-2 py-1 rounded bg-gray-700 text-xs hover:bg-gray-600"
                    >
                      {reaction.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
} 