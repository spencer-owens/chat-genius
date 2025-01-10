import { useState } from 'react'
import { useReactions, AVAILABLE_REACTIONS, type ReactionEmoji, type MessageType } from '@/hooks/useReactions'
import { cn } from '@/lib/utils'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Smile } from 'lucide-react'

interface MessageReactionsProps {
  messageId: string
  messageType: MessageType
}

export function MessageReactions({ messageId, messageType }: MessageReactionsProps) {
  const { reactions, addReaction } = useReactions(messageId, messageType)
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="flex items-center gap-2 mt-1">
      {/* Existing reactions */}
      {reactions.map((reaction) => (
        <Tooltip.Provider key={reaction.emoji}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className={cn(
                  'px-2 py-1 rounded bg-gray-700/50 text-xs hover:bg-gray-700 transition-colors',
                  'flex items-center gap-1'
                )}
              >
                <span>{reaction.emoji}</span>
                <span className="text-gray-400">{reaction.count}</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-gray-800 text-white text-xs px-2 py-1 rounded"
                sideOffset={5}
              >
                {reaction.users.map(u => u.username).join(', ')}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
        >
          <Smile className="h-4 w-4" />
        </button>

        {/* Reaction picker */}
        {showPicker && (
          <div 
            className="absolute bottom-full left-0 mb-1 bg-gray-800 rounded-md shadow-lg p-2 flex gap-1 z-50"
            style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}
          >
            {AVAILABLE_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  addReaction(emoji)
                  setShowPicker(false)
                }}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 