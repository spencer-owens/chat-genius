'use client'

import { useEffect, useRef } from 'react'
import { UserPresenceIndicator } from '../shared/UserPresenceIndicator'
import { format } from 'date-fns'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { FileAttachment } from './FileAttachment'
import { Message, ChannelMessage } from '@/types/messages'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  onReaction?: (messageId: string, emoji: string) => void
  onThreadClick?: (messageId: string) => void
  type: 'channel' | 'dm'
}

export function MessageList({ messages, onReaction, onThreadClick, type }: MessageListProps) {
  const { user: currentUser } = useCurrentUser()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView()
  }, [messages])

  if (!messages || messages.length === 0) {
    return (
      <div className="h-full flex items-end">
        <p className="text-gray-400 w-full text-center pb-4">No messages yet</p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "h-full overflow-y-auto",
        type === 'dm' && "flex-1"
      )}
    >
      <div className="flex flex-col justify-end min-h-full p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="message-item">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {message.sender.profile_picture ? (
                    <img
                      src={message.sender.profile_picture}
                      alt={message.sender.username}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-white">{message.sender.username[0]}</span>
                    </div>
                  )}
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
                  {message.content && (
                    <p className="text-sm text-gray-300 mt-1">{message.content}</p>
                  )}
                  {message.file && (
                    <div className="mt-2">
                      <FileAttachment
                        name={message.file.name}
                        type={message.file.type}
                        size={message.file.size}
                        url={message.file.url}
                      />
                    </div>
                  )}
                  
                  {type === 'channel' && message.type === 'channel' && !message.thread_id && (
                    <div className="mt-2 flex items-center space-x-4">
                      {onThreadClick && (
                        <button
                          onClick={() => onThreadClick(message.id)}
                          className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
                        >
                          <span>Reply in thread</span>
                          {message.reply_count > 0 && (
                            <span className="text-xs text-gray-500">
                              ({message.reply_count})
                            </span>
                          )}
                        </button>
                      )}
                      {onReaction && (
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
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  )
} 