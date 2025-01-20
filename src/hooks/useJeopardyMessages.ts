import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface Source {
  content: string
  metadata: {
    air_date: string
    category: string
    value: string
    question: string
  }
}

export interface JeopardyMessage {
  id: string
  content: string
  user_id: string
  message_type: 'user' | 'ai'
  sources: Source[] | null
  created_at: string
}

export function useJeopardyMessages(limit = 25) {
  const [messages, setMessages] = useState<JeopardyMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()

  const fetchMessages = useCallback(async () => {
    if (!user) return

    try {
      const { data, error: fetchError } = await supabase
        .from('jeopardy_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      setMessages(data.reverse()) // Reverse to show oldest first
    } catch (e) {
      setError(e as Error)
      toast.error('Error loading messages. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [user, limit])

  const addMessage = useCallback(async (
    content: string,
    messageType: 'user' | 'ai',
    sources: Source[] | null = null
  ) => {
    if (!user) {
      throw new Error('Must be logged in to send messages')
    }

    // Create optimistic message
    const optimisticId = `temp-${Date.now()}`
    const newMessage = {
      id: optimisticId,
      content,
      user_id: user.id,
      message_type: messageType,
      sources,
      created_at: new Date().toISOString()
    }

    // Add optimistic message to state
    setMessages(prev => [...prev, newMessage])

    try {
      const { data, error: sendError } = await supabase
        .from('jeopardy_messages')
        .insert([{
          content,
          user_id: user.id,
          message_type: messageType,
          sources
        }])
        .select()
        .single()

      if (sendError) throw sendError

      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(msg => msg.id === optimisticId ? data : msg)
      )
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId))
      toast.error('Failed to send message. Please try again.')
      throw error
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setMessages([])
      setLoading(false)
      return
    }

    fetchMessages()

    // Set up real-time subscription
    const channel = supabase
      .channel('jeopardy_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jeopardy_messages',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as JeopardyMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchMessages])

  return {
    messages,
    loading,
    error,
    addMessage
  }
} 