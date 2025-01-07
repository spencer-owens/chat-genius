'use client'

import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { useChannels } from '@/hooks/useChannels'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { CreateChannelModal } from '@/components/channels/CreateChannelModal'
import { SearchBar } from '@/components/shared/SearchBar'
import { NotificationBanner } from '@/components/shared/NotificationBanner'
import { Hash, Lock, Loader2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ChannelsPage() {
  const { channels, loading: channelsLoading } = useChannels()
  const { user, loading: userLoading } = useCurrentUser()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredChannels = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleJoinChannel = async (channelId: string) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('memberships')
        .insert([{
          user_id: user.id,
          channel_id: channelId,
          is_admin: false
        }])

      if (error) throw error
      setNotification({ type: 'success', message: 'Successfully joined channel' })
    } catch (error) {
      setNotification({ type: 'error', message: 'Error joining channel' })
    }
  }

  const handleLeaveChannel = async (channelId: string) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .match({ user_id: user.id, channel_id: channelId })

      if (error) throw error
      setNotification({ type: 'success', message: 'Successfully left channel' })
    } catch (error) {
      setNotification({ type: 'error', message: 'Error leaving channel' })
    }
  }

  if (channelsLoading || userLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Channels</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Channel
          </button>
        </div>

        {notification && (
          <NotificationBanner
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
            className="mb-6"
          />
        )}

        <div className="mb-6">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search channels..."
          />
        </div>

        <div className="space-y-4">
          {filteredChannels.map((channel) => {
            const isMember = channel.memberships?.some(
              (m: any) => m.user_id === user?.id
            )

            return (
              <div
                key={channel.id}
                className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    {channel.is_private ? (
                      <Lock className="h-5 w-5 text-gray-400 mr-2" />
                    ) : (
                      <Hash className="h-5 w-5 text-gray-400 mr-2" />
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {channel.name}
                      </h3>
                      {channel.description && (
                        <p className="text-sm text-gray-400 mt-1">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => isMember 
                      ? handleLeaveChannel(channel.id)
                      : handleJoinChannel(channel.id)
                    }
                    className={`px-4 py-2 rounded-md text-sm ${
                      isMember
                        ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isMember ? 'Leave' : 'Join'}
                  </button>
                </div>

                <div className="mt-4 flex items-center text-sm text-gray-400">
                  <span>{channel.memberships?.length || 0} members</span>
                  {channel.is_private && (
                    <span className="ml-4 flex items-center">
                      <Lock className="h-4 w-4 mr-1" />
                      Private Channel
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (data) => {
            try {
              const { error } = await supabase
                .from('channels')
                .insert([data])

              if (error) throw error
              setNotification({ type: 'success', message: 'Channel created successfully' })
              setShowCreateModal(false)
            } catch (error) {
              setNotification({ type: 'error', message: 'Error creating channel' })
            }
          }}
        />
      )}
    </Layout>
  )
} 