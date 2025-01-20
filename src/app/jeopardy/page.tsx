'use client'

import { useJeopardyMessages } from '@/hooks/useJeopardyMessages'
import { useAI } from '@/contexts/AIContext'
import { JeopardyMessageList } from '@/components/jeopardy/JeopardyMessageList'
import { JeopardyInput } from '@/components/jeopardy/JeopardyInput'

export default function JeopardyPage() {
  const { messages, loading: messagesLoading, addMessage } = useJeopardyMessages()
  const { askQuestion, isLoading: aiLoading } = useAI()

  const handleSubmit = async (content: string) => {
    // Add user message to the database
    await addMessage(content, 'user')

    // Get AI response
    const response = await askQuestion(content)

    // Add AI response to the database
    if (response) {
      await addMessage(response.answer, 'ai', response.sources)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-none px-8 py-6 border-b border-gray-200/10">
        <h1 className="text-2xl font-semibold mb-4">Alex Trebek Memorial Bot</h1>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <JeopardyMessageList 
          messages={messages} 
          isLoading={aiLoading} 
        />
        <div className="flex-none mt-auto">
          <JeopardyInput 
            onSubmit={handleSubmit}
            disabled={aiLoading || messagesLoading}
          />
        </div>
      </div>
    </div>
  )
} 