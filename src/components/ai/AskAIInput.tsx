'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useAI } from '@/contexts/AIContext'

export default function AskAIInput() {
  const [question, setQuestion] = useState('')
  const { askQuestion, isLoading } = useAI()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isLoading) return
    await askQuestion(question.trim())
    setQuestion('')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask me anything... about parkour, of course"
          className="w-full pl-12 pr-4 py-2.5 bg-gray-700/50 text-white placeholder-gray-400 rounded-lg border border-gray-600/50 focus:outline-none focus:border-gray-500"
          disabled={isLoading}
        />
      </div>
    </form>
  )
} 