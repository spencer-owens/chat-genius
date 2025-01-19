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

const API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8000'

export function AIProvider({ children }: { children: ReactNode }) {
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const askQuestion = async (question: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (response.status === 0) {
          throw new Error('Network error - This might be a CORS issue. Please check if the API is accessible and CORS is properly configured.')
        }
        throw new Error(
          errorData?.error || 
          `Request failed with status ${response.status}: ${response.statusText}`
        )
      }

      const data = await response.json()
      setResponse(data)
      
    } catch (error) {
      console.error('Error in askQuestion:', error)
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