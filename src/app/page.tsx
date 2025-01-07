'use client'

import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { ChannelList } from '@/components/channels/ChannelList'
import { DirectMessageList } from '@/components/dm/DirectMessageList'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { MessageThread } from '@/components/chat/MessageThread'
import { SearchBar } from '@/components/shared/SearchBar'
import { useChannels } from '@/hooks/useChannels'
import { useMessages } from '@/hooks/useMessages'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<any | null>(null)
  const { channels, loading: channelsLoading } = useChannels()
  const { messages, loading: messagesLoading } = useMessages(selectedChannel)

  const handleSearch = (query: string) => {
    console.log('Searching for:', query)
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedChannel) return

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      await supabase
        .from('messages')
        .insert([{
          content,
          channel_id: selectedChannel,
          sender_id: user.user.id
        }])
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!selectedChannel) return

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('files')
        .upload(`${Date.now()}-${file.name}`, file)

      if (uploadError) throw uploadError

      await supabase
        .from('files')
        .insert([{
          name: file.name,
          url: uploadData.path,
          uploaded_by: user.user.id,
          channel_id: selectedChannel
        }])
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  return (
    <Layout>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-800 flex flex-col">
          <div className="p-4">
            <SearchBar onSearch={handleSearch} placeholder="Search messages..." />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {!channelsLoading && (
              <ChannelList
                channels={channels}
                currentChannelId={selectedChannel}
                onChannelSelect={setSelectedChannel}
                isAdmin={true}
              />
            )}
            <DirectMessageList
              users={[]} // We'll implement this later
              onUserSelect={(userId) => console.log('Selected user:', userId)}
            />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-900">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">
              # {selectedChannel ? channels.find(c => c.id === selectedChannel)?.name : 'general'}
            </h2>
          </div>

          <div className="flex-1 flex">
            <div className={`flex-1 flex flex-col ${selectedThread ? 'border-r border-gray-700' : ''}`}>
              {!messagesLoading && (
                <MessageList
                  messages={messages}
                  onReaction={(messageId, emoji) => console.log('Reaction:', messageId, emoji)}
                  onThreadClick={setSelectedThread}
                />
              )}
              <MessageInput
                onSend={handleSendMessage}
                onFileUpload={handleFileUpload}
              />
            </div>

            {selectedThread && (
              <MessageThread
                parentMessage={selectedThread}
                replies={[]}
                onClose={() => setSelectedThread(null)}
                onReply={(content) => console.log('Thread reply:', content)}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
