import { useState } from 'react'
import { X } from 'lucide-react'
import useStore from '@/store'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface CreateChannelModalProps {
  onClose: () => void
}

export function CreateChannelModal({ onClose }: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const { currentUser, addChannel } = useStore()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser?.id) {
      toast.error('You must be logged in to create a channel')
      return
    }

    try {
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name,
          description,
          is_private: isPrivate
        })
        .select('*, memberships(*)')
        .single()

      if (error) throw error

      // Add creator as admin
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          channel_id: channel.id,
          user_id: currentUser.id,
          is_admin: true
        })

      if (membershipError) throw membershipError

      // Add channel to store
      addChannel({
        ...channel,
        memberships: [{
          user_id: currentUser.id,
          is_admin: true
        }]
      })

      toast.success('Channel created successfully')
      onClose()
    } catch (error) {
      console.error('Error creating channel:', error)
      toast.error('Failed to create channel')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">Create Channel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-700 border-transparent focus:border-blue-500 focus:ring-0 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md bg-gray-700 border-transparent focus:border-blue-500 focus:ring-0 text-white"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded bg-gray-700 border-transparent focus:ring-offset-0 focus:ring-0 text-blue-500"
            />
            <label htmlFor="isPrivate" className="ml-2 text-sm text-gray-200">
              Make this channel private
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 