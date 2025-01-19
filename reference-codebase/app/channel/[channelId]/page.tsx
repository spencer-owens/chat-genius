'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '../../auth'
import { useUser } from '../../hooks/useUser'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LogOut, Paperclip, X, Mic } from 'lucide-react'
import PostItem from './PostItem'
import ThreadComments from './ThreadComments'
import { useToast } from "@/components/ui/use-toast"
import type { Channel } from '@/app/types/entities/Channel'
import type { Post } from '@/app/types/entities/Post'
import VoiceRecorder from '../../components/VoiceRecorder'
import VoiceMessage from '../../components/VoiceMessage'
import MessageInput from '../../components/MessageInput'
import type { FileAttachment } from '@/app/types/entities/FileAttachment'

type DbPost = {
  id: string;
  user_id: string;
  channel_id: string;
  content: string;
  created_at: string;
  files: {
    id: string;
    file: FileAttachment;
  }[] | null;
  translations: {
    id: string;
    message_id: string | null;
    conversation_thread_comment_id: string | null;
    post_id: string | null;
    post_thread_comment_id: string | null;
    mandarin_chinese_translation: string | null;
    spanish_translation: string | null;
    english_translation: string | null;
    hindi_translation: string | null;
    arabic_translation: string | null;
    bengali_translation: string | null;
    portuguese_translation: string | null;
    russian_translation: string | null;
    japanese_translation: string | null;
    western_punjabi_translation: string | null;
  }[] | null;
}

export default function Channel() {
  const { channelId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: currentUser } = useUser()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [activeThread, setActiveThread] = useState<{
    postId: string;
    content: string;
    created_at: string;
    user: {
      id: string;
      email: string;
      display_name?: string | null;
      native_language?: string | null;
    };
    translation?: {
      id: string;
      message_id: string | null;
      conversation_thread_comment_id: string | null;
      post_id: string | null;
      post_thread_comment_id: string | null;
      mandarin_chinese_translation: string | null;
      spanish_translation: string | null;
      english_translation: string | null;
      hindi_translation: string | null;
      arabic_translation: string | null;
      bengali_translation: string | null;
      portuguese_translation: string | null;
      russian_translation: string | null;
      japanese_translation: string | null;
      western_punjabi_translation: string | null;
    } | null;
  } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const tourStep = Number(searchParams.get('tourStep')) || 0
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)

  useEffect(() => {
    fetchChannel()
    fetchPosts()
    const cleanup = setupRealtimeSubscription()
    return () => {
      cleanup()
    }
  }, [channelId])

  useEffect(() => {
    scrollToBottom()
  }, [posts])

  useEffect(() => {
    const threadId = searchParams.get('thread')
    if (threadId && posts.length > 0) {
      const post = posts.find(p => p.id === threadId)
      if (post) {
        setActiveThread({
          postId: post.id,
          content: post.content,
          created_at: post.created_at,
          user: post.user,
          translation: post.translation
        })
      }
    }
  }, [searchParams, posts])

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabase()

      type DbPost = {
        id: string;
        content: string;
        created_at: string;
        user_id: string;
        channel_id: string;
        files: {
          id: string;
          file: {
            id: string;
            file_name: string;
            file_type: string;
            file_size: number;
            path: string;
            bucket: string;
            duration_seconds: number;
          };
        }[] | null;
        translations: {
          id: string;
          message_id: string | null;
          conversation_thread_comment_id: string | null;
          post_id: string | null;
          post_thread_comment_id: string | null;
          mandarin_chinese_translation: string | null;
          spanish_translation: string | null;
          english_translation: string | null;
          hindi_translation: string | null;
          arabic_translation: string | null;
          bengali_translation: string | null;
          portuguese_translation: string | null;
          russian_translation: string | null;
          japanese_translation: string | null;
          western_punjabi_translation: string | null;
        }[] | null;
      }

      // Fetch posts with file attachments and translations
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id, 
          user_id,
          channel_id,
          content, 
          created_at,
          files:file_attachments(
            id,
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
          translations (
            id,
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
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })

      if (postsError) throw postsError

      // Fetch user data
      const userIds = [...new Set(posts.map(post => post.user_id))]
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, display_name, native_language')
        .in('id', userIds)

      if (usersError) throw usersError

      // Transform posts to include files array and user info
      const postsWithUserInfo = (posts as unknown as DbPost[])?.map(post => ({
        ...post,
        user: users?.find(user => user.id === post.user_id) || { id: post.user_id, email: 'Unknown User', display_name: null },
        files: post.files?.map(f => ({
          ...f.file
        })) || [],
        translation: post.translations?.[0] || null
      }))

      setPosts(postsWithUserInfo)
    } catch (error) {
      console.error('Error fetching posts:', error)
      setError('Failed to fetch posts')
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const supabase = getSupabase()
    const postIds = posts.map(p => p.id)
    const fileIds = posts.flatMap(p => p.files || []).map(f => f.id)

    let channel = supabase.channel(`posts:${channelId}`)

    // Listen for post changes
    channel = channel.on(
      'postgres_changes' as any,
      { 
        event: '*', 
        schema: 'public', 
        table: 'posts', 
        filter: `channel_id=eq.${channelId}` 
      }, 
      async (payload) => {
        if (payload.eventType === 'INSERT') {
          type DbPost = {
            id: string;
            user_id: string;
            channel_id: string;
            content: string;
            created_at: string;
            files: {
              id: string;
              file: {
                id: string;
                file_name: string;
                file_type: string;
                file_size: number;
                path: string;
                bucket: string;
              };
            }[] | null;
            translations: {
              id: string;
              message_id: string | null;
              conversation_thread_comment_id: string | null;
              post_id: string | null;
              post_thread_comment_id: string | null;
              mandarin_chinese_translation: string | null;
              spanish_translation: string | null;
              english_translation: string | null;
              hindi_translation: string | null;
              arabic_translation: string | null;
              bengali_translation: string | null;
              portuguese_translation: string | null;
              russian_translation: string | null;
              japanese_translation: string | null;
              western_punjabi_translation: string | null;
            }[] | null;
          }

          // Fetch the complete post data including files
          const { data: postData, error: postError } = await supabase
            .from('posts')
            .select(`
              id, 
              user_id,
              channel_id,
              content, 
              created_at,
              files:file_attachments(
                id,
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
            .eq('id', payload.new.id)
            .single()

          if (postError) {
            console.error('Error fetching new post:', postError)
            return
          }

          const post = postData as unknown as DbPost

          // Fetch user data for the post
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, display_name, native_language')
            .eq('id', post.user_id)
            .single()

          if (userError) {
            console.error('Error fetching user details:', userError)
            return
          }

          // Transform the post data
          const newPost: Post = {
            ...post,
            user: {
              id: user.id,
              email: user.email,
              display_name: user.display_name,
              native_language: user.native_language
            },
            files: post.files?.map(f => ({
              ...f.file
            })) || [],
            translation: post.translations?.[0] || null
          }

          setPosts(prevPosts => [...prevPosts, newPost])
        } else if (payload.eventType === 'UPDATE') {
          // Fetch the complete post data including files and translations
          const { data: postData, error: postError } = await supabase
            .from('posts')
            .select(`
              id, 
              user_id,
              channel_id,
              content, 
              created_at,
              files:file_attachments(
                id,
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
            .eq('id', payload.new.id)
            .single()

          if (postError) {
            console.error('Error fetching updated post:', postError)
            return
          }

          const post = postData as unknown as DbPost

          // Fetch user data for the post
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, display_name, native_language')
            .eq('id', post.user_id)
            .single()

          if (userError) {
            console.error('Error fetching user details:', userError)
            return
          }

          // Transform the post data
          const updatedPost: Post = {
            id: post.id,
            user_id: post.user_id,
            channel_id: post.channel_id,
            content: post.content,
            created_at: post.created_at,
            user: {
              id: user.id,
              email: user.email,
              display_name: user.display_name,
              native_language: user.native_language
            },
            files: post.files?.map(f => ({
              ...f.file
            })) || [],
            translation: post.translations?.[0] || null
          }

          setPosts(prevPosts =>
            prevPosts.map(p => {
              if (p.id === payload.new.id) {
                return updatedPost
              }
              return p
            })
          )
        } else if (payload.eventType === 'DELETE') {
          setPosts(prevPosts => prevPosts.filter(post => post.id !== payload.old?.id))
        }
      }
    )

    // Only add file_attachments subscription if we have posts
    if (postIds.length > 0) {
      channel = channel.on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'file_attachments',
          filter: `post_id=in.(${postIds.join(',')})`
        },
        async (payload: { new?: { post_id: string }, old?: { post_id: string } }) => {
          // Fetch the complete post data for the affected post
          const postId = payload.new?.post_id || payload.old?.post_id
          if (!postId) return

          type DbPost = {
            id: string;
            user_id: string;
            channel_id: string;
            content: string;
            created_at: string;
            files: {
              id: string;
              file: {
                id: string;
                file_name: string;
                file_type: string;
                file_size: number;
                path: string;
                bucket: string;
              };
            }[] | null;
            translations: {
              id: string;
              message_id: string | null;
              conversation_thread_comment_id: string | null;
              post_id: string | null;
              post_thread_comment_id: string | null;
              mandarin_chinese_translation: string | null;
              spanish_translation: string | null;
              english_translation: string | null;
              hindi_translation: string | null;
              arabic_translation: string | null;
              bengali_translation: string | null;
              portuguese_translation: string | null;
              russian_translation: string | null;
              japanese_translation: string | null;
              western_punjabi_translation: string | null;
            }[] | null;
          }

          const { data: postData, error: postError } = await supabase
            .from('posts')
            .select(`
              id, 
              user_id,
              channel_id,
              content, 
              created_at,
              files:file_attachments(
                id,
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
            .eq('id', postId)
            .single()

          if (postError) {
            console.error('Error fetching updated post:', postError)
            return
          }

          const post = postData as unknown as DbPost

          // Fetch user data for the post
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, display_name, native_language')
            .eq('id', post.user_id)
            .single()

          if (userError) {
            console.error('Error fetching user details:', userError)
            return
          }

          // Transform the post data
          const updatedPost: Post = {
            ...post,
            user: {
              id: user.id,
              email: user.email,
              display_name: user.display_name,
              native_language: user.native_language
            },
            files: post.files?.map(f => ({
              ...f.file
            })) || [],
            translation: post.translations?.[0] || null
          }

          // Update only the affected post in the state
          setPosts(prevPosts =>
            prevPosts.map(p =>
              p.id === postId ? updatedPost : p
            )
          )
        }
      )
    }

    // Only add files subscription if we have files
    if (fileIds.length > 0) {
      channel = channel.on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `id=in.(${fileIds.join(',')})`
        },
        async (payload: { new?: { id: string }, old?: { id: string } }) => {
          // Find which posts contain this file
          const affectedPostIds = posts
            .filter(post => post.files?.some(file => file.id === payload.new?.id || file.id === payload.old?.id))
            .map(post => post.id)

          type DbPost = {
            id: string;
            user_id: string;
            channel_id: string;
            content: string;
            created_at: string;
            files: {
              id: string;
              file: {
                id: string;
                file_name: string;
                file_type: string;
                file_size: number;
                path: string;
                bucket: string;
              };
            }[] | null;
            translations: {
              id: string;
              message_id: string | null;
              conversation_thread_comment_id: string | null;
              post_id: string | null;
              post_thread_comment_id: string | null;
              mandarin_chinese_translation: string | null;
              spanish_translation: string | null;
              english_translation: string | null;
              hindi_translation: string | null;
              arabic_translation: string | null;
              bengali_translation: string | null;
              portuguese_translation: string | null;
              russian_translation: string | null;
              japanese_translation: string | null;
              western_punjabi_translation: string | null;
            }[] | null;
          }

          // Fetch complete data for affected posts
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select(`
              id, 
              user_id,
              channel_id,
              content, 
              created_at,
              files:file_attachments(
                id,
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
            .in('id', affectedPostIds)

          if (postsError) {
            console.error('Error fetching updated posts:', postsError)
            return
          }

          const updatedPosts = postsData as unknown as DbPost[]

          // Fetch user data for the posts
          const userIds = [...new Set(updatedPosts.map(post => post.user_id))]
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, display_name, native_language')
            .in('id', userIds)

          if (usersError) {
            console.error('Error fetching user details:', usersError)
            return
          }

          // Transform the posts data
          const transformedPosts: Post[] = updatedPosts.map(post => ({
            ...post,
            user: users.find(user => user.id === post.user_id)!,
            files: post.files?.map(f => ({
              ...f.file
            })) || [],
            translation: post.translations?.[0] || null
          }))

          // Update only the affected posts in the state
          setPosts(prevPosts =>
            prevPosts.map(post =>
              transformedPosts.find(p => p.id === post.id) || post
            )
          )
        }
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  // Re-subscribe when posts change to update the file_attachments filter
  useEffect(() => {
    const cleanup = setupRealtimeSubscription()
    return () => {
      cleanup()
    }
  }, [posts.length])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() && selectedFiles.length === 0) return

    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // First, upload any files
      const filePromises = selectedFiles.map(async (file: File) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

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
            uploaded_by: user.id
          })
          .select()
          .single()

        if (fileRecordError) throw fileRecordError

        return fileData
      })

      const uploadedFiles = await Promise.all(filePromises)

      // Create post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: newMessage.trim()
        })
        .select()
        .single()

      if (postError) throw postError

      // Create file attachments
      if (uploadedFiles.length > 0) {
        const { error: attachmentError } = await supabase
          .from('file_attachments')
          .insert(
            uploadedFiles.map(file => ({
              file_id: file.id,
              post_id: postData.id
            }))
          )

        if (attachmentError) throw attachmentError
      }

      // Clear input and show success immediately
      setNewMessage('')
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
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
              postId: postData.id,
              senderId: user.id
            }),
          })
        } catch (translationError) {
          console.error('Translation error:', translationError)
        }
      }

      // Don't await the translation
      triggerTranslation()

    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: "There was an error sending your message. Please try again."
      })
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchChannel = async () => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('channels')
        .select('id, name')
        .eq('id', channelId)
        .single()

      if (error) throw error
      setChannel(data)
    } catch (error) {
      console.error('Error fetching channel:', error)
      setError('Failed to fetch channel details')
    }
  }

  const handleLeaveChannel = async () => {
    try {
      if (!currentUser) throw new Error('User not authenticated')

      const supabase = getSupabase()
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', currentUser.id)

      if (error) throw error

      router.push('/')
    } catch (error) {
      console.error('Error leaving channel:', error)
      toast({
        title: "Error",
        description: "Failed to leave channel",
        variant: "destructive",
      })
    }
  }

  const handleThreadOpen = (post: Post) => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set('thread', post.id)
    router.push(`/channel/${channelId}?${newSearchParams.toString()}`)
    setActiveThread({
      postId: post.id,
      content: post.content,
      created_at: post.created_at,
      user: post.user,
      translation: post.translation
    })
  }

  const handleThreadClose = () => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.delete('thread')
    router.push(`/channel/${channelId}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`)
    setActiveThread(null)
  }

  const handleVoiceRecordingComplete = async (audioBlob: Blob, duration: number) => {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Generate a unique filename
      const fileName = `${Math.random().toString(36).substring(2)}.mp3`
      const filePath = `${user.id}/${fileName}`

      // Upload voice message to storage
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
          uploaded_by: user.id,
          duration_seconds: duration
        })
        .select()
        .single()

      if (fileRecordError) throw fileRecordError

      // Create post with empty content (voice message only)
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: ''
        })
        .select()
        .single()

      if (postError) throw postError

      // Create file attachment
      const { error: attachmentError } = await supabase
        .from('file_attachments')
        .insert({
          file_id: fileData.id,
          post_id: postData.id
        })

      if (attachmentError) throw attachmentError

      setShowVoiceRecorder(false)
      toast({
        title: "Voice message sent",
        description: "Your voice message has been sent successfully."
      })

    } catch (error) {
      console.error('Error sending voice message:', error)
      toast({
        variant: "destructive",
        title: "Error sending voice message",
        description: "There was an error sending your voice message. Please try again."
      })
    }
  }

  if (loading) return <div>Loading posts...</div>
  if (error) return <div className="text-red-500">{error}</div>

  return (
    <div className="flex h-full">
      <div className={`flex-1 flex flex-col h-full w-full`}>
        <div className="flex justify-between items-center mb-4 w-full min-w-0 p-4">
          <h1 className="text-2xl font-bold truncate">
            # {channel?.name || 'Loading...'}
          </h1>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLeaveChannel}
            className="text-red-500 hover:text-red-700 hover:bg-red-100 shrink-0 ml-4"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave Channel
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto mb-4 w-full min-w-0">
          <div className="flex flex-col w-full min-w-0">
            {posts.map((post) => (
              <PostItem 
                key={post.id} 
                post={post} 
                onPostUpdate={(updatedPost: Post) => {
                  setPosts(prevPosts =>
                    prevPosts.map(post =>
                      post.id === updatedPost.id ? { ...post, content: updatedPost.content } : post
                    )
                  );
                }}
                onThreadOpen={handleThreadOpen}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="p-4">
          <MessageInput
            messageType="channel"
            parentId={channelId as string}
            placeholder="Type your message..."
          />
        </div>
      </div>
      {activeThread && (
        <ThreadComments 
          postId={activeThread.postId} 
          originalPost={{
            id: activeThread.postId,
            content: activeThread.content,
            created_at: activeThread.created_at,
            user: activeThread.user,
            translation: activeThread.translation,
            files: posts.find(post => post.id === activeThread.postId)?.files || []
          }}
          onClose={handleThreadClose} 
        />
      )}
    </div>
  )
}

