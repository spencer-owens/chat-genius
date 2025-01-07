import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { X } from 'lucide-react'

interface MessageThreadProps {
  parentMessage: any // Replace with proper type
  replies: any[] // Replace with proper type
  onClose: () => void
  onReply: (content: string) => void
}

export function MessageThread({
  parentMessage,
  replies,
  onClose,
  onReply
}: MessageThreadProps) {
  return (
    <div className="w-96 border-l border-gray-700 bg-gray-900 flex flex-col">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Thread</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <MessageList
            messages={[parentMessage]}
            onReaction={() => {}}
            onThreadClick={() => {}}
          />
        </div>
        
        <MessageList
          messages={replies}
          onReaction={() => {}}
          onThreadClick={() => {}}
        />
      </div>
      
      <MessageInput
        onSend={onReply}
        onFileUpload={() => {}}
      />
    </div>
  )
} 