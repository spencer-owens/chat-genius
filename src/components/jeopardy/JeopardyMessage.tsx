import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JeopardyMessage } from '@/hooks/useJeopardyMessages'

interface Props {
  message: JeopardyMessage
}

export function JeopardyMessage({ message }: Props) {
  const [showSources, setShowSources] = useState(false)
  const isAI = message.message_type === 'ai'

  return (
    <div className={cn(
      'flex w-full',
      isAI ? 'justify-start' : 'justify-end'
    )}>
      <div className={cn(
        'max-w-[80%] rounded-lg p-4',
        isAI ? 'bg-gray-700 text-white' : 'bg-blue-600 text-white ml-auto'
      )}>
        <div className="prose prose-invert max-w-none">
          {message.content}
        </div>

        {isAI && message.sources && message.sources.length > 0 && (
          <div className="mt-2 border-t border-gray-600 pt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
            >
              <span>Sources</span>
              {showSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showSources && (
              <div className="mt-2 space-y-4">
                {message.sources.map((source, index) => {
                  // Extract answer from the content string
                  const answerMatch = source.content.match(/Answer: (.+?)(?:\s+Round:|$)/)
                  const answer = answerMatch ? answerMatch[1] : ''
                  
                  return (
                    <div key={index} className="text-sm text-gray-300">
                      <div className="font-medium text-gray-200">
                        {source.metadata.category} - ${source.metadata.value}
                      </div>
                      <div className="mt-1">
                        <span className="text-gray-400">Question: </span>
                        {source.metadata.question}
                      </div>
                      <div className="mt-1">
                        <span className="text-gray-400">Answer: </span>
                        {answer}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Aired: {new Date(source.metadata.air_date).toLocaleDateString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 