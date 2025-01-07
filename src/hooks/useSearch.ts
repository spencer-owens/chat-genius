import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type SearchResult = {
  type: 'message' | 'channel' | 'file'
  id: string
  content: string
  created_at: string
  channel?: { id: string; name: string }
  sender?: { username: string; profile_picture?: string }
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const search = async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      // Search messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel:channels(id, name),
          sender:users!sender_id(username, profile_picture)
        `)
        .ilike('content', `%${query}%`)
        .limit(10)

      if (messagesError) throw messagesError

      // Search channels
      const { data: channels, error: channelsError } = await supabase
        .from('channels')
        .select('id, name, description, created_at')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5)

      if (channelsError) throw channelsError

      // Search files
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select(`
          id,
          name,
          created_at,
          channel:channels(id, name),
          uploader:uploaded_by(username, profile_picture)
        `)
        .ilike('name', `%${query}%`)
        .limit(5)

      if (filesError) throw filesError

      // Combine and format results
      const formattedResults: SearchResult[] = [
        ...(messages?.map(msg => ({
          type: 'message' as const,
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          channel: msg.channel,
          sender: msg.sender
        })) || []),
        ...(channels?.map(ch => ({
          type: 'channel' as const,
          id: ch.id,
          content: ch.description || ch.name,
          created_at: ch.created_at,
          channel: { id: ch.id, name: ch.name }
        })) || []),
        ...(files?.map(file => ({
          type: 'file' as const,
          id: file.id,
          content: file.name,
          created_at: file.created_at,
          channel: file.channel,
          sender: file.uploader
        })) || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setResults(formattedResults)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  return { results, loading, error, search }
} 