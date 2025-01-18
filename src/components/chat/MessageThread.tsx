'use client'

import MessageList from './MessageList'
import { MessageInput } from './MessageInput'
import { X, Loader2 } from 'lucide-react'
import { useThreadReplies } from '@/hooks/useThreadReplies'
import { ChannelMessage } from '@/types/messages'
import { createClient } from '@/lib/supabase/client'

interface MessageThreadProps {
  parentMessage: ChannelMessage
  onClose: () => void
}

export function MessageThread({
  parentMessage,
  onClose
}: MessageThreadProps) {
  const { replies, loading, error, sendReply } = useThreadReplies(parentMessage.id)
  const supabase = createClient()

  const handleSendReply = async (
    content: string,
    fileMetadata?: { id: string; url: string; name: string; type: string; size: number }
  ) => {
    try {
      await sendReply(content, parentMessage.channel_id, fileMetadata)
    } catch (error) {
      console.error('Error sending reply:', error)
    }
  }

  return (
    <div className="w-96 border-l border-gray-700 bg-gray-900 flex flex-col">
      <div className="flex-none p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Thread</h3>
        <button
          onClick={onClose}
          className="px-3 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md flex items-center gap-1"
        >
          <X className="h-4 w-4" />
          <span className="text-sm">Close</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex-1 h-full flex flex-col justify-end">
            <MessageList
              messages={[parentMessage, ...replies]}
              threadId={parentMessage.id}
              channelId={parentMessage.channel_id}
            />
          </div>
        )}
      </div>
      
      <div className="flex-none p-4 border-t border-gray-700 bg-gray-900">
        <MessageInput
          onSend={handleSendReply}
          channelId={parentMessage.channel_id}
          placeholder="Reply in thread..."
        />
      </div>
    </div>
  )
} 