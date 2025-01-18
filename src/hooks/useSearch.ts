import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import useStore from '@/store'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'

type Tables = Database['public']['Tables']

type SearchResult = {
  type: 'message'
  id: string
  content: string
  created_at: string
  channel: {
    id: string
    name: string
  }
  sender: {
    id: string
    username: string
    profile_picture: string | null
  }
}

type MessageResult = Tables['messages']['Row'] & {
  channels: Pick<Tables['channels']['Row'], 'id' | 'name'>
  users: Pick<Tables['users']['Row'], 'id' | 'username' | 'profile_picture'>
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentQueryRef = useRef<string>('')
  const { currentUser, channels } = useStore()
  const supabase = createClient()

  const executeSearch = async (query: string) => {
    // Don't search if query hasn't changed or user is not logged in
    if (query === currentQueryRef.current || !currentUser?.id) {
      return
    }

    currentQueryRef.current = query

    try {
      // Get list of channel IDs the user has access to
      const userChannelIds = channels
        .filter(channel => !channel.is_private || channel.memberships.some(m => m.user_id === currentUser.id))
        .map(channel => channel.id)

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
        .in('channel_id', userChannelIds)
        .limit(20)

      if (messagesError) {
        toast.error('Failed to search messages')
        throw messagesError
      }

      // Format results
      const formattedResults: SearchResult[] = (messages as MessageResult[] || [])
        .filter(msg => msg.created_at !== null) // Filter out messages with null created_at
        .map(msg => ({
          type: 'message',
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at as string, // We know it's not null due to filter
          channel: {
            id: msg.channels.id,
            name: msg.channels.name
          },
          sender: {
            id: msg.users.id,
            username: msg.users.username,
            profile_picture: msg.users.profile_picture
          }
        }))

      const sortedResults = formattedResults.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setResults(sortedResults)
    } catch (error) {
      console.error('Search error:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to search messages')
      }
    } finally {
      setLoading(false)
    }
  }

  const search = (query: string) => {
    if (!currentUser?.id) {
      toast.error('Must be logged in to search')
      return
    }
    
    if (!query.trim()) {
      setResults([])
      return
    }

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    setLoading(true)
    
    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
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
    search
  }
} 