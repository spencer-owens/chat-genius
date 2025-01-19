'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface Source {
  content: string
  score: number
}

interface AIResponse {
  answer: string
  sources: Source[]
  cached: boolean
}

interface AIContextType {
  response: AIResponse | null
  isLoading: boolean
  error: string | null
  askQuestion: (question: string) => Promise<void>
  clearResponse: () => void
}

const AIContext = createContext<AIContextType | undefined>(undefined)

export function AIProvider({ children }: { children: ReactNode }) {
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const askQuestion = async (question: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('https://simple-rag-production.up.railway.app/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get answer')
      }

      const data = await response.json()
      setResponse(data)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setResponse(null)
    } finally {
      setIsLoading(false)
    }
  }

  const clearResponse = () => {
    setResponse(null)
    setError(null)
  }

  return (
    <AIContext.Provider
      value={{
        response,
        isLoading,
        error,
        askQuestion,
        clearResponse,
      }}
    >
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const context = useContext(AIContext)
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider')
  }
  return context
} 