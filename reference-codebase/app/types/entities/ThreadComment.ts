export interface ThreadComment {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  user: {
    id: string
    email: string
    display_name?: string | null
    native_language?: string | null
  }
  files?: {
    id: string
    file_name: string
    file_type: string
    file_size: number
    path: string
    bucket: string
    duration_seconds?: number
  }[]
  translation?: {
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
  } | null
} 