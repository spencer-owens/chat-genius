import AskAIInput from '@/components/ai/AskAIInput'
import AIResponse from '@/components/ai/AIResponse'
import { Suspense } from 'react'

export default function AskAIPage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-8 py-6 border-b border-gray-200/10">
        <h1 className="text-2xl font-semibold mb-4">Ask AI</h1>
        <AskAIInput />
      </div>
      <Suspense fallback={<div className="p-4">Loading...</div>}>
        <div className="flex-1 overflow-y-auto p-8">
          <AIResponse />
        </div>
      </Suspense>
    </div>
  )
} 