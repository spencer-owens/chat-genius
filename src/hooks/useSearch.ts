import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type SearchResult = {
  type: 'message'
  id: string
  content: string
  created_at: string
  channel: { id: string; name: string }
  sender: { id: string; username: string; profile_picture: string | null }
}

type MessageResult = {
  id: string
  content: string
  created_at: string
  channel_id: string
  sender_id: string
  channels: {
    id: string
    name: string
  }
  users: {
    id: string
    username: string
    profile_picture: string | null
  }
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentQueryRef = useRef<string>('')

  const executeSearch = async (query: string) => {
    // Don't search if query hasn't changed
    if (query === currentQueryRef.current) {
      console.log('Skipping duplicate search for:', query)
      return
    }

    console.log('Executing search for:', query)
    currentQueryRef.current = query

    try {
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          sender_id,
          channels:channel_id(
            id,
            name
          ),
          users:sender_id(
            id,
            username,
            profile_picture
          )
        `)
        .ilike('content', `%${query}%`)
        .limit(20) as { data: MessageResult[] | null, error: Error | null }

      if (messagesError) {
        console.error('Search query error:', messagesError)
        throw messagesError
      }

      console.log('Search results:', messages)

      // Format results
      const formattedResults: SearchResult[] = messages?.map(msg => ({
        type: 'message' as const,
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        channel: {
          id: msg.channels.id,
          name: msg.channels.name
        },
        sender: {
          id: msg.users.id,
          username: msg.users.username,
          profile_picture: msg.users.profile_picture
        }
      })) || []

      const sortedResults = formattedResults.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      console.log('Formatted results:', sortedResults)
      setResults(sortedResults)
    } catch (e) {
      console.error('Search error:', e)
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  const search = (query: string) => {
    console.log('Search requested for:', query)
    
    if (!query.trim()) {
      console.log('Empty query, clearing results')
      setResults([])
      return
    }

    // Clear any pending search
    if (searchTimeoutRef.current) {
      console.log('Clearing previous search timeout')
      clearTimeout(searchTimeoutRef.current)
    }

    setLoading(true)
    setError(null)
    
    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      console.log('Debounce timer expired, executing search')
      executeSearch(query)
    }, 300)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return { 
    results, 
    loading, 
    error, 
    search
  }
} 