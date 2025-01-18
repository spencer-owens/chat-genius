'use client'

import { format } from 'date-fns'
import useStore from '@/store'
import { UserPresenceIndicator } from '../shared/UserPresenceIndicator'
import { FileAttachment } from './FileAttachment'
import { MessageReactions } from './MessageReactions'
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

interface MessageItemProps {
  message: Message
  isOwnMessage: boolean
  channelId?: string
  threadId?: string
}

export default function MessageItem({ message, isOwnMessage, channelId, threadId }: MessageItemProps) {
  const { updateMessage } = useStore()

  const handleThreadClick = () => {
    if (!threadId && channelId) {
      updateMessage(channelId, {
        ...message,
        thread_id: message.id
      })
    }
  }

  const formattedTime = message.created_at 
    ? format(new Date(message.created_at), 'HH:mm')
    : ''

  return (
    <div className="message-item">
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
              <span className="text-white">
                {message.sender.username[0]}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-white">
              {message.sender.username}
            </p>
            <UserPresenceIndicator userId={message.sender.id} />
            <span className="text-xs text-gray-400">
              {formattedTime}
            </span>
          </div>
          {message.content && (
            <p className="text-sm text-gray-300 mt-1">{message.content}</p>
          )}
          {message.file && (
            <div className="mt-2">
              <FileAttachment fileId={message.file.id} />
            </div>
          )}
          
          {channelId && !threadId && (
            <div className="mt-2 flex items-center space-x-4">
              <button
                onClick={handleThreadClick}
                className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
              >
                <span>Reply in thread</span>
                {message.reply_count && message.reply_count > 0 && (
                  <span className="text-xs text-gray-500">
                    ({message.reply_count})
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <MessageReactions 
        messageId={message.id}
        messageType={channelId ? 'channel' : 'dm'}
      />
    </div>
  )
} 