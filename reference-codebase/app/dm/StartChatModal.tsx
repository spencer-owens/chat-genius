import { useState, useEffect } from 'react'
import { getSupabase } from '../auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from "@/components/ui/use-toast"
import { X } from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { usePresence } from '../hooks/usePresence'
import UserDisplay from '../components/UserDisplay'
import { themes } from '../config/themes'
import type { StartChatModalProps } from '@/app/types/props/StartChatModalProps'
import type { User } from '@/app/types/entities/User'

export default function StartChatModal({ isOpen, onClose, preselectedUserId, customHeader, showStartChatAnimation }: StartChatModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { onlineUsers } = usePresence()
  const [theme] = useState(() => {
    if (typeof window !== 'undefined') {
      return themes.find(t => t.id === localStorage.getItem('slack-clone-theme')) || themes[0]
    }
    return themes[0]
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (preselectedUserId) {
      const user = users.find(u => u.id === preselectedUserId)
      if (user) {
        setSelectedUsers([user])
      }
    }
  }, [preselectedUserId, users])

  useEffect(() => {
    if (customHeader && preselectedUserId) {
      setUsers(prevUsers => prevUsers.filter(u => u.id === preselectedUserId))
    }
  }, [customHeader, preselectedUserId])

  const fetchUsers = async () => {
    const supabase = getSupabase()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name')
      .neq('id', currentUser?.id)
      .order('email')

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    setUsers(data || [])
  }

  const handleStartChat = async () => {
    if (selectedUsers.length === 0) return

    setIsLoading(true)
    const supabase = getSupabase()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      setIsLoading(false)
      return
    }

    try {
      const allParticipantIds = Array.from(new Set([...selectedUsers.map(u => u.id), currentUser.id])).sort()
      const { data: existingConversation, error: lookupError } = await supabase
        .rpc('find_existing_conversation', {
          participant_ids: allParticipantIds
        })

      if (lookupError) throw lookupError

      if (existingConversation) {
        onClose()
        setSelectedUsers([])
        router.push(`/dm/${existingConversation}`)
        return
      }

      const { data: conversationId, error: createError } = await supabase
        .rpc('create_conversation_with_participants', {
          p_type: selectedUsers.length === 1 ? 'dm' : 'group',
          p_name: selectedUsers.length === 1 ? null : 'Group Chat',
          p_participant_ids: allParticipantIds
        })

      if (createError) throw createError

      onClose()
      setSelectedUsers([])
      router.push(`/dm/${conversationId}`)
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast({
        variant: "destructive",
        title: "Error creating conversation",
        description: "There was an error creating the conversation. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${theme.colors.background} ${theme.colors.foreground} rounded-lg p-6 w-96`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{customHeader || "Start a New Chat"}</h2>
          <button 
            onClick={onClose} 
            className={`${theme.colors.accent} hover:bg-opacity-80 p-1 rounded`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Selected users */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedUsers.map(user => (
            <div 
              key={user.id} 
              className="bg-indigo-100 rounded-full px-3 py-1 text-sm flex items-center text-indigo-700"
            >
              <UserDisplay 
                user={user}
                isOnline={onlineUsers.has(user.id)}
              />
              <button
                onClick={() => setSelectedUsers(users => users.filter(u => u.id !== user.id))}
                className="ml-2 hover:bg-indigo-50 p-1 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* User list */}
        <div className="max-h-64 overflow-y-auto mb-4 rounded border bg-white">
          {users.map(user => (
            <div
              key={user.id}
              className={`p-3 cursor-pointer transition-colors text-gray-800 ${
                selectedUsers.find(u => u.id === user.id) 
                  ? theme.colors.accent
                  : 'hover:bg-gray-200'
              }`}
              onClick={() => {
                if (selectedUsers.find(u => u.id === user.id)) {
                  setSelectedUsers(users => users.filter(u => u.id !== user.id))
                } else {
                  setSelectedUsers([...selectedUsers, user])
                }
              }}
            >
              <UserDisplay 
                user={user}
                isOnline={onlineUsers.has(user.id)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleStartChat}
          disabled={selectedUsers.length === 0 || isLoading}
          className={`w-full ${theme.colors.accent} p-2 rounded disabled:opacity-50 hover:bg-opacity-80 ${
            showStartChatAnimation ? 'scale-110 animate-slow-pulse ring-4 ring-offset-2 ring-blue-500 ring-offset-background' : ''
          } transition-all duration-300`}
        >
          {isLoading ? 'Creating...' : 'Start Chat'}
        </button>
      </div>
    </div>
  )
} 