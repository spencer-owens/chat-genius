import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ChannelMessage } from '@/types/messages'

export function useThreadReplies(parentMessageId: string | null) {
  const [replies, setReplies] = useState<ChannelMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user: currentUser } = useAuth()

  // Debug function
  const logWithTime = (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [Thread] ${message}`, data || '')
  }

  useEffect(() => {
    if (!parentMessageId || !currentUser) {
      setReplies([])
      setLoading(false)
      return
    }

    logWithTime('Setting up thread replies hook', { parentMessageId })

    async function fetchReplies() {
      try {
        logWithTime('Fetching replies')
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!sender_id(
              id,
              username,
              status,
              profile_picture
            ),
            reactions(*),
            file:file_metadata(
              id,
              name,
              type,
              size,
              path
            )
          `)
          .eq('thread_id', parentMessageId)
          .order('created_at', { ascending: true })

        if (error) throw error

        logWithTime('Replies fetched', { count: data?.length })

        const formattedReplies = (data || []).map(reply => ({
          ...reply,
          type: 'channel' as const,
          reply_count: 0, // Thread replies can't have their own threads
          file: reply.file ? {
            ...reply.file,
            url: supabase.storage.from('public-documents').getPublicUrl(reply.file.path).data.publicUrl
          } : undefined
        }))

        setReplies(formattedReplies)
      } catch (e) {
        setError(e as Error)
        console.error('Error fetching thread replies:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchReplies()

    // Set up real-time subscription for thread replies
    const channel = supabase
      .channel(`thread:${parentMessageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${parentMessageId}`
        },
        async (payload) => {
          logWithTime('Received new reply payload', payload)

          // Fetch the complete reply to ensure we have all related data
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!sender_id(
                id,
                username,
                status,
                profile_picture
              ),
              reactions(*),
              file:file_metadata(
                id,
                name,
                type,
                size,
                path
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            console.error('Error fetching new reply details:', error)
            return
          }

          logWithTime('Adding new reply to state', data)
          
          setReplies(prev => {
            // Don't add if we already have this reply
            const exists = prev.some(reply => reply.id === data.id)
            if (exists) return prev

            return [...prev, {
              ...data,
              type: 'channel' as const,
              reply_count: 0, // Thread replies can't have their own threads
              file: data.file ? {
                ...data.file,
                url: supabase.storage.from('public-documents').getPublicUrl(data.file.path).data.publicUrl
              } : undefined
            }]
          })
        }
      )
      .subscribe((status, err) => {
        logWithTime('Subscription status changed', { status, error: err })
      })

    return () => {
      logWithTime('Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [parentMessageId, currentUser])

  const sendReply = useCallback(async (
    content: string,
    channelId: string,
    fileMetadata?: { id: string; url: string; name: string; type: string; size: number }
  ) => {
    if (!currentUser || !parentMessageId) {
      throw new Error('Must be logged in to send replies')
    }

    const newReply = {
      content,
      channel_id: channelId,
      thread_id: parentMessageId,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_id: fileMetadata?.id
    }

    logWithTime('Sending reply:', newReply)

    const { error: sendError } = await supabase
      .from('messages')
      .insert([newReply])

    if (sendError) {
      throw sendError
    }
  }, [currentUser, parentMessageId])

  return {
    replies,
    loading,
    error,
    sendReply
  }
} 