'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useAI } from '@/contexts/AIContext'

export default function AIResponse() {
  const [showSources, setShowSources] = useState(false)
  const { response, error, isLoading } = useAI()

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!response && !isLoading) return null

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="text-gray-600 dark:text-gray-300 animate-pulse">
          Thinking...
        </div>
      )}
      
      {response && (
        <>
          {/* Answer */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <div className="prose dark:prose-invert max-w-none">
              {response.answer}
            </div>
          </div>

          {/* Sources */}
          {response.sources && response.sources.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <span>Sources</span>
                {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showSources && (
                <div className="mt-2 space-y-2">
                  {response.sources.map((source, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                      {source.content}
                      <span className="ml-2 text-gray-400">
                        (Score: {(source.score * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
} 