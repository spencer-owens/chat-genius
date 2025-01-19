import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabase } from '../auth'
import { useUser } from '../hooks/useUser'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { X, Paperclip, Mic } from 'lucide-react'
import ConversationThreadCommentItem from '../dm/ConversationThreadCommentItem'
import { useToast } from '@/components/ui/use-toast'
import { themes } from '../config/themes'
import { usePresence } from '../hooks/usePresence'
import MessageDisplay from '../components/MessageDisplay'
import VoiceRecorder from '../components/VoiceRecorder'
import MessageInput from '../components/MessageInput'
import type { Translation } from '../types/entities/Translation'
import type { FileAttachment } from '../types/entities/FileAttachment'

interface ThreadComment {
  id: string
  user_id: string
  message_id: string
  conversation_id: string
  content: string
  created_at: string
  user: {
    id: string
    email: string
    display_name?: string | null
    native_language?: string | null
  }
  files?: FileAttachment[]
  translation: Translation | null
}

interface ConversationThreadCommentsProps {
  messageId: string
  conversationId: string
  onClose: () => void
  originalMessage: {
    id: string
    content: string
    created_at: string
    sender: {
      id: string
      email: string
      display_name?: string | null
    }
    files?: FileAttachment[]
  }
}

export default function ConversationThreadComments({ messageId, conversationId, onClose, originalMessage }: ConversationThreadCommentsProps) {
  const [comments, setComments] = useState<ThreadComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { onlineUsers } = usePresence()
  const { user: currentUser } = useUser()
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return themes.find(t => t.id === localStorage.getItem('slack-clone-theme')) || themes[0]
    }
    return themes[0]
  })
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)

  useEffect(() => {
    const handleStorageChange = () => {
      const themeId = localStorage.getItem('slack-clone-theme')
      setTheme(themes.find(t => t.id === themeId) || themes[0])
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    fetchComments()
    setupRealtimeSubscription()
  }, [messageId])

  const fetchComments = async () => {
    try {
      const supabase = getSupabase()

      type DbComment = {
        id: string
        user_id: string
        message_id: string
        conversation_id: string
        content: string
        created_at: string
        user: {
          id: string
          email: string
          display_name: string | null
          native_language: string | null
        }
        files: {
          file: {
            id: string
            file_name: string
            file_type: string
            file_size: number
            path: string
            bucket: string
            duration_seconds: number | null
          }
        }[] | null
        translations: {
          id: string
          message_id: string | null
          conversation_thread_comment_id: string | null
          post_id: string | null
          post_thread_comment_id: string | null
          mandarin_chinese_translation: string | null
          spanish_translation: string | null
          english_translation: string | null
          hindi_translation: string | null
          arabic_translation: string | null
          bengali_translation: string | null
          portuguese_translation: string | null
          russian_translation: string | null
          japanese_translation: string | null
          western_punjabi_translation: string | null
        }[] | null
      }

      const { data: comments, error: commentsError } = await supabase
        .from('conversation_thread_comments')
        .select(`
          id,
          user_id,
          message_id,
          conversation_id,
          content,
          created_at,
          user:user_id(
            id,
            email,
            display_name,
            native_language
          ),
          files:file_attachments(
            file:file_id(
              id,
              file_name,
              file_type,
              file_size,
              path,
              bucket,
              duration_seconds
            )
          ),
          translations(
            id,
            message_id,
            conversation_thread_comment_id,
            post_id,
            post_thread_comment_id,
            mandarin_chinese_translation,
            spanish_translation,
            english_translation,
            hindi_translation,
            arabic_translation,
            bengali_translation,
            portuguese_translation,
            russian_translation,
            japanese_translation,
            western_punjabi_translation
          )
        `)
        .eq('message_id', messageId)
        .order('created_at', { ascending: true })

      if (commentsError) throw commentsError

      // Transform the data to match our ThreadComment type
      const transformedComments: ThreadComment[] = (comments as unknown as DbComment[]).map(comment => ({
        id: comment.id,
        user_id: comment.user_id,
        message_id: comment.message_id,
        conversation_id: comment.conversation_id,
        content: comment.content,
        created_at: comment.created_at,
        user: comment.user,
        files: comment.files?.map(f => ({
          id: f.file.id,
          file_name: f.file.file_name,
          file_type: f.file.file_type,
          file_size: f.file.file_size,
          path: f.file.path,
          bucket: f.file.bucket,
          duration_seconds: f.file.duration_seconds || undefined
        })) || [],
        translation: comment.translations?.[0] || null
      }))

      setComments(transformedComments)
    } catch (error) {
      console.error('Error fetching comments:', error)
      setError('Failed to fetch comments')
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const supabase = getSupabase()
    let channel = supabase.channel(`thread-comments:${messageId}`)

    // Listen for comment changes
    channel = channel.on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'conversation_thread_comments', 
        filter: `message_id=eq.${messageId}` 
      }, 
      (payload: RealtimePostgresChangesPayload<ThreadComment>) => {
        if (payload.eventType === 'INSERT') {
          fetchComments()
        } else if (payload.eventType === 'UPDATE') {
          setComments(prevComments => 
            prevComments.map(comment => 
              comment.id === payload.new.id ? { ...comment, ...payload.new } : comment
            )
          )
        } else if (payload.eventType === 'DELETE') {
          setComments(prevComments => 
            prevComments.filter(comment => comment.id !== payload.old?.id)
          )
        }
      }
    )

    // Listen for file attachment changes
    if (comments.length > 0) {
      channel = channel.on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'file_attachments',
          filter: `conversation_thread_comment_id=in.(${comments.map(c => c.id).join(',')})`
        },
        () => {
          fetchComments()
        }
      )
    }

    // Listen for file changes
    channel = channel.on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'files'
      },
      () => {
        fetchComments()
      }
    )

    // Listen for translation changes
    if (comments.length > 0) {
      channel = channel.on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translations',
          filter: `conversation_thread_comment_id=in.(${comments.map(c => c.id).join(',')})`
        },
        () => {
          fetchComments()
        }
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  // Re-subscribe when comments change to update the file_attachments filter
  useEffect(() => {
    const cleanup = setupRealtimeSubscription()
    return () => {
      cleanup()
    }
  }, [comments.length])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() && selectedFiles.length === 0) return

    try {
      const supabase = getSupabase()
      if (!currentUser) throw new Error('User not authenticated')

      // First, upload any files
      const filePromises = selectedFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${currentUser.id}/${fileName}`

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('file-uploads')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Create file record
        const { data: fileData, error: fileRecordError } = await supabase
          .from('files')
          .insert({
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            bucket: 'file-uploads',
            path: filePath,
            uploaded_by: currentUser.id
          })
          .select()
          .single()

        if (fileRecordError) throw fileRecordError

        return fileData
      })

      const uploadedFiles = await Promise.all(filePromises)

      // Create thread comment
      const { data: commentData, error: commentError } = await supabase
        .from('conversation_thread_comments')
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          user_id: currentUser.id,
          content: newComment.trim()
        })
        .select()
        .single()

      if (commentError) throw commentError

      // Create file attachments
      if (uploadedFiles.length > 0) {
        const { error: attachmentError } = await supabase
          .from('file_attachments')
          .insert(
            uploadedFiles.map(file => ({
              file_id: file.id,
              conversation_thread_comment_id: commentData.id
            }))
          )

        if (attachmentError) throw attachmentError
      }

      setNewComment('')
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      toast({
        title: "Comment sent",
        description: "Your comment has been sent successfully."
      })

      // Trigger translation in the background
      const triggerTranslation = async () => {
        try {
          await fetch('/api/translations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationThreadCommentId: commentData.id,
              senderId: currentUser.id
            }),
          })
        } catch (translationError) {
          console.error('Translation error:', translationError)
        }
      }

      // Don't await the translation
      triggerTranslation()

    } catch (error) {
      console.error('Error sending comment:', error)
      toast({
        variant: "destructive",
        title: "Error sending comment",
        description: "There was an error sending your comment. Please try again."
      })
    }
  }

  const handleVoiceRecordingComplete = async (audioBlob: Blob, duration: number) => {
    try {
      const supabase = getSupabase()
      if (!currentUser) throw new Error('User not authenticated')

      // Generate unique filename for the audio file
      const fileName = `${Math.random().toString(36).substring(2)}.mp3`
      const filePath = `${currentUser.id}/${fileName}`

      // Upload audio file to storage
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, audioBlob)

      if (uploadError) throw uploadError

      // Create file record with duration
      const { data: fileData, error: fileRecordError } = await supabase
        .from('files')
        .insert({
          file_name: fileName,
          file_type: 'audio/mp3',
          file_size: audioBlob.size,
          bucket: 'voice-messages',
          path: filePath,
          uploaded_by: currentUser.id,
          duration_seconds: duration
        })
        .select()
        .single()

      if (fileRecordError) throw fileRecordError

      // Create thread comment with empty content (since it's a voice message)
      const { data: commentData, error: commentError } = await supabase
        .from('conversation_thread_comments')
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          user_id: currentUser.id,
          content: ''
        })
        .select()
        .single()

      if (commentError) throw commentError

      // Create file attachment
      const { error: attachmentError } = await supabase
        .from('file_attachments')
        .insert({
          file_id: fileData.id,
          conversation_thread_comment_id: commentData.id
        })

      if (attachmentError) throw attachmentError

      // Hide voice recorder and show success message
      setShowVoiceRecorder(false)
      toast({
        title: "Voice message sent",
        description: "Your voice message has been sent successfully."
      })

      // Trigger translation in the background
      const triggerTranslation = async () => {
        try {
          await fetch('/api/translations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationThreadCommentId: commentData.id,
              senderId: currentUser.id
            }),
          })
        } catch (translationError) {
          console.error('Translation error:', translationError)
        }
      }

      // Don't await the translation
      triggerTranslation()

    } catch (error) {
      console.error('Error sending voice message:', error)
      toast({
        variant: "destructive",
        title: "Error sending voice message",
        description: "There was an error sending your voice message. Please try again."
      })
    }
  }

  if (loading) return <div className="w-[400px] border-l p-4">Loading comments...</div>
  if (error) return <div className="w-[400px] border-l p-4 text-red-500">{error}</div>

  return (
    <div className="w-[400px] border-l flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">Thread</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b">
        <MessageDisplay
          id={originalMessage.id}
          content={originalMessage.content}
          user={originalMessage.sender}
          currentUser={currentUser}
          onlineUsers={onlineUsers}
          messageType="dm_thread"
          onUpdate={() => {}}
          tableName="messages"
          created_at={originalMessage.created_at}
          files={originalMessage.files}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.map((comment) => (
          <ConversationThreadCommentItem
            key={comment.id}
            comment={comment}
            onCommentUpdate={fetchComments}
          />
        ))}
      </div>

      <div className="p-4 border-t">
        <MessageInput
          messageType="dm_thread"
          parentId={messageId}
          secondaryId={conversationId}
          placeholder="Reply to thread..."
        />
      </div>
    </div>
  )
}