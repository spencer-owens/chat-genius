import { useState, useEffect } from 'react'
import { useUser } from '../hooks/useUser'
import MessageDisplay from '../components/MessageDisplay'
import { usePresence } from '../hooks/usePresence'
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
  }
  files?: FileAttachment[]
  translation: Translation | null
}

interface ConversationThreadCommentItemProps {
  comment: ThreadComment
  onCommentUpdate: () => void
}

export default function ConversationThreadCommentItem({ comment, onCommentUpdate }: ConversationThreadCommentItemProps) {
  const { user: currentUser } = useUser()
  const { onlineUsers } = usePresence()

  return (
    <MessageDisplay
      id={comment.id}
      content={comment.content}
      user={comment.user}
      files={comment.files}
      currentUser={currentUser}
      onlineUsers={onlineUsers}
      messageType="dm_thread"
      onUpdate={onCommentUpdate}
      tableName="conversation_thread_comments"
      created_at={comment.created_at}
      translation={comment.translation}
    />
  )
} 