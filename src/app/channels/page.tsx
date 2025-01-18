'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { useChannels } from '@/hooks/useChannels'
import useStore from '@/store'
import { CreateChannelModal } from '@/components/channels/CreateChannelModal'
import { SearchBar } from '@/components/shared/SearchBar'
import { NotificationBanner } from '@/components/shared/NotificationBanner'
import { Plus, MessageCircle } from 'lucide-react'

export default function ChannelsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { currentUser } = useStore()
  const { channels, loading } = useChannels()

  const filteredChannels = channels?.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!currentUser) {
    return null
  }

  return (
    <Layout>
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Channels</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            New Channel
          </button>
        </div>

        <SearchBar
          placeholder="Search channels..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="mb-4"
        />

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChannels?.map((channel) => (
              <Link
                key={channel.id}
                href={`/channels/${channel.id}`}
                className="block p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <h3 className="font-medium text-white">{channel.name}</h3>
                {channel.description && (
                  <p className="text-sm text-gray-400 mt-1">{channel.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}

        <CreateChannelModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    </Layout>
  )
} 