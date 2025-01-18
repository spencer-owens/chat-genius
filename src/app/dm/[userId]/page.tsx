'use client'

import { Layout } from '@/components/layout/Layout'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import useStore from '@/store'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationBanner } from '@/components/shared/NotificationBanner'
import { Loader2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Message, DirectMessage } from '@/types/messages'

interface PageProps {
  params: { userId: string }
}

export default function DMPage({ params }: PageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const { messages, otherUser, currentUser, sendMessage } = useStore((state) => {
    const dbMessages = state.messagesByChannel[params.userId] || []
    return {
      messages: dbMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at || new Date().toISOString(),
        thread_id: msg.thread_id || undefined,
        file: msg.file_metadata ? {
          id: msg.file_metadata.message_id,
          url: msg.file_metadata.path,
          name: msg.file_metadata.name,
          type: msg.file_metadata.type,
          size: msg.file_metadata.size
        } : undefined,
        type: 'dm' as const,
        sender_id: msg.sender_id,
        receiver_id: params.userId,
        sender: {
          username: msg.sender.username,
          status: msg.sender.status,
          profile_picture: msg.sender.profile_picture
        }
      })) as DirectMessage[],
      otherUser: state.dmUsers.find(u => u.id === params.userId),
      currentUser: state.currentUser,
      sendMessage: state.sendMessage
    }
  })

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      if (!otherUser) {
        const { data: users } = await createClient()
          .from('users')
          .select('*')
          .eq('id', params.userId)
          .single()
        
        if (users) {
          useStore.getState().setDMUsers([...useStore.getState().dmUsers, users])
        }
      }
      setIsLoading(false)
    }
    loadData()
  }, [params.userId, otherUser])

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!otherUser) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p>User not found</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="relative">
              {otherUser.profile_picture ? (
                <img
                  src={otherUser.profile_picture}
                  alt={otherUser.username}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-white">{otherUser.username?.[0]?.toUpperCase() || '?'}</span>
                </div>
              )}
            </div>
            <span className="font-medium">{otherUser.username}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} />
        </div>

        <div className="p-4 border-t">
          <MessageInput 
            onSend={async (content, fileMetadata) => {
              try {
                await sendMessage(content, params.userId, fileMetadata)
              } catch (error) {
                console.error('Error sending message:', error)
              }
            }}
            dmUserId={params.userId}
            placeholder={`Message ${otherUser?.username}`}
          />
        </div>
      </div>
    </Layout>
  )
} 