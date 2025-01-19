import { useState, useEffect } from 'react'
import { getSupabase } from '../../auth'
import { useUser } from '../../hooks/useUser'
import { usePresence } from '../../hooks/usePresence'
import { Button } from '@/components/ui/button'
import MessageDisplay from '../../components/MessageDisplay'
import { MessageSquare, Pencil, Trash2, Paperclip } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import type { Post } from '@/app/types/entities/Post'
import type { PostItemProps } from '@/app/types/props/PostItemProps'
import type { FileAttachment } from '@/app/types/entities/FileAttachment'
import VoiceMessage from '../../components/VoiceMessage'

export default function PostItem({ post, onPostUpdate, onThreadOpen }: PostItemProps) {
  const [threadCount, setThreadCount] = useState(0)
  const { onlineUsers } = usePresence()
  const { user: currentUser } = useUser()
  const [currentPost, setCurrentPost] = useState(post)

  useEffect(() => {
    setCurrentPost(post)
  }, [post])

  useEffect(() => {
    fetchThreadCount()
    const cleanup = setupTranslationSubscription()
    return () => {
      cleanup()
    }
  }, [])

  const setupTranslationSubscription = () => {
    const supabase = getSupabase()
    const channel = supabase.channel(`post-translations:${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translations',
          filter: `post_id=eq.${post.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch the updated post with the new translation
            const { data: updatedPost, error } = await supabase
              .from('posts')
              .select(`
                id,
                user_id,
                channel_id,
                content,
                created_at,
                translations (
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
              .eq('id', post.id)
              .single()

            if (!error && updatedPost) {
              setCurrentPost({
                ...currentPost,
                translation: updatedPost.translations?.[0] || null
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const fetchThreadCount = async () => {
    try {
      const supabase = getSupabase()
      const { count, error } = await supabase
        .from('post_thread_comments')
        .select('id', { count: 'exact' })
        .eq('post_id', post.id)

      if (error) throw error
      setThreadCount(count || 0)
    } catch (error) {
      console.error('Error fetching thread count:', error)
    }
  }

  const handleUpdate = (updatedContent: string) => {
    const updatedPost = { ...currentPost, content: updatedContent };
    setCurrentPost(updatedPost);
    onPostUpdate(updatedPost);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderFileAttachments = () => {
    if (!post.files || post.files.length === 0) return null

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {post.files.map((file: FileAttachment) => {
          if (file.file_type === 'audio/mp3') {
            return (
              <VoiceMessage
                key={file.id}
                bucket={file.bucket}
                path={file.path}
                fileName={file.file_name}
                duration={file.duration_seconds || 0}
              />
            )
          }

          // Handle other file types as before...
          return (
            <a
              key={file.id}
              href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/file-uploads/${file.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors"
            >
              <Paperclip className="h-3 w-3" />
              <span className="text-sm truncate max-w-[200px]">
                {file.file_name}
              </span>
              <span className="text-xs text-muted-foreground">
                ({formatFileSize(file.file_size)})
              </span>
            </a>
          )
        })}
      </div>
    )
  }

  return (
    <MessageDisplay
      id={currentPost.id}
      content={currentPost.content}
      user={currentPost.user}
      files={currentPost.files}
      currentUser={currentUser}
      onlineUsers={onlineUsers}
      messageType="post"
      threadCount={threadCount}
      onThreadOpen={() => onThreadOpen(currentPost)}
      onUpdate={handleUpdate}
      tableName="posts"
      className="mb-4"
      created_at={currentPost.created_at}
      translation={currentPost.translation}
    />
  )
} 