'use client'

import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { DirectMessageList } from '@/components/dm/DirectMessageList'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { SearchBar } from '@/components/shared/SearchBar'
import { useDirectMessages } from '@/hooks/useDirectMessages'
import { supabase } from '@/lib/supabase'
import { useUsers } from '@/hooks/useUsers'

export default function DirectMessagesPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const { messages, loading } = useDirectMessages(selectedUserId)
  const { users, loading: usersLoading } = useUsers()

  const handleSearch = (query: string) => {
    console.log('Searching for:', query)
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedUserId) return

    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) return

      await supabase
        .from('direct_messages')
        .insert([{
          content,
          sender_id: currentUser.user.id,
          receiver_id: selectedUserId
        }])
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <Layout>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-800 flex flex-col">
          <div className="p-4">
            <SearchBar onSearch={handleSearch} placeholder="Search users..." />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {!usersLoading && (
              <DirectMessageList
                users={users}
                currentUserId={selectedUserId}
                onUserSelect={setSelectedUserId}
              />
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {selectedUserId ? (
            <>
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-medium text-white">
                  {messages[0]?.sender.username || messages[0]?.receiver.username}
                </h2>
              </div>

              <div className="flex-1 flex flex-col">
                {!loading && (
                  <MessageList
                    messages={messages.map(msg => ({
                      id: msg.id,
                      content: msg.content,
                      created_at: msg.created_at,
                      sender: msg.sender,
                      reactions: []
                    }))}
                    onReaction={() => {}}
                    onThreadClick={() => {}}
                  />
                )}
                <MessageInput
                  onSend={handleSendMessage}
                  onFileUpload={() => {}}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a user to start messaging
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
} 