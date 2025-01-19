'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabase } from '../auth'
import { useUser } from '../hooks/useUser'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, LogOut, Plus, MessageSquare, Search, Sparkles } from 'lucide-react'
import { themes } from '../config/themes'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import StartChatModal from '../dm/StartChatModal'
import { usePresence } from '../hooks/usePresence'
import SearchModal from './SearchModal'
import UserDisplay from './UserDisplay'
import { TourPopup } from './TourPopup'
import type { Channel } from '@/app/types/entities/Channel'
import type { DirectMessage } from '@/app/types/entities/DirectMessage'
import type { Post } from '@/app/types/entities/Post'
import { toast } from 'react-hot-toast'

export default function Sidebar() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingDMs, setLoadingDMs] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newChannelName, setNewChannelName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Post[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { user: currentUser } = useUser()
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return themes.find(t => t.id === localStorage.getItem('slack-clone-theme')) || themes[0]
    }
    return themes[0]
  })
  const router = useRouter()
  const pathname = usePathname()
  const [showAllChannels, setShowAllChannels] = useState(false)
  const [allChannels, setAllChannels] = useState<Channel[]>([])
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)
  const { onlineUsers } = usePresence()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [showTour, setShowTour] = useState(false)
  const [tourStep, setTourStep] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    fetchChannels()
    fetchDirectMessages()
    fetchUnreadCounts()
    const supabase = getSupabase()
    
    // Set up subscription for channel membership changes
    const channel = supabase
      .channel('channel_members_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'channel_members'
        }, 
        () => {
          fetchChannels()
        }
      )
      .subscribe()

    // Add DM subscriptions for both conversations and participants
    const dmChannel = supabase
      .channel('conversation_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations'
        }, 
        () => {
          fetchDirectMessages()
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversation_participants'
        }, 
        (payload) => {
          if (!payload.new || !('last_read_at' in payload.new)) {
            fetchDirectMessages()
          }
          fetchUnreadCounts()
        }
      )
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCounts()
        }
      )
      .subscribe()

    // Add subscription for new conversations
    const conversationsChannel = supabase
      .channel('new_conversations')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchDirectMessages()
        }
      )
      .subscribe()

    // Add subscription for new conversation participants
    const participantsChannel = supabase
      .channel('new_participants')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: currentUser ? `user_id=eq.${currentUser.id}` : undefined
        },
        () => {
          fetchDirectMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(dmChannel)
      supabase.removeChannel(conversationsChannel)
      supabase.removeChannel(participantsChannel)
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      const themeId = localStorage.getItem('slack-clone-theme')
      setTheme(themes.find(t => t.id === themeId) || themes[0])
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    // Check if user needs tour
    const didTour = localStorage.getItem('did_tour')
    const tourStage = localStorage.getItem('tour_stage')
    if (!didTour) {
      setShowTour(true)
      if (tourStage) {
        setTourStep(Number(tourStage))
      }
    }
  }, [])

  const handleCloseTour = () => {
    setShowTour(false)
    setTourStep(6)
    localStorage.setItem('did_tour', 'true')
    localStorage.setItem('tour_stage', '6')
  }

  const handleNextTourStep = () => {
    const nextStep = tourStep + 1
    setTourStep(nextStep)
    localStorage.setItem('tour_stage', nextStep.toString())
    
    if (tourStep === 3) {
      router.push(`/profile?tourStep=4`)
    } else if (tourStep === 4) {
      setIsChatModalOpen(true)
    } else if (pathname?.startsWith('/channel/')) {
      // Update URL while keeping the same channel
      const channelId = pathname.split('/')[2]
      router.push(`/channel/${channelId}?tourStep=${nextStep}`)
    }
  }

  const getTourContent = () => {
    switch (tourStep) {
      case 1:
        return {
          title: "Welcome to Channels! 👋",
          content: "Channels are spaces where you can chat with your team about specific topics. You can join existing channels or create new ones. Messages in channels are visible to all channel members, making it perfect for team discussions and announcements. You can click the create channel button to create a new channel.",
          position: 'top-center' as const
        }
      case 2:
        return {
          title: "Send Messages & Files 📝",
          content: "Type your message in the input box below and hit send or press Enter. Need to share files? Click the paperclip icon to attach images, documents, or any other files to your message.",
          position: 'center-right' as const
        }
      case 3:
        return {
          title: "Search Everything 🔍",
          content: "Need to find something? Use the search feature to quickly locate messages, files, and conversations across all your channels and direct messages. It's a powerful way to find exactly what you're looking for.",
          position: 'top-center' as const
        }
      case 4:
        return {
          title: "Customize Your Profile 👤",
          content: "Let's set up your profile! You can come back to this page to change your display name and preferred language after the tour. We provide live translation for all supported languages, including Mandarin Chinese, Spanish, English, Hindi, Arabic, Bengali, Portuguese, Russian, Japanese, and Western Punjabi.",
          position: 'top-left' as const
        }
      case 5:
        return {
          title: "Direct Messages 💬",
          content: "Let's start a conversation with the admin. Click 'Next' to open the chat window.",
          position: 'top-right' as const
        }
      default:
        return null
    }
  }

  const fetchChannels = async () => {
    setLoadingChannels(true)
    setError(null)
    try {
      if (!currentUser) throw new Error('No user found')

      const supabase = getSupabase()

      // Fetch all channels
      const { data: allChannelsData, error: allChannelsError } = await supabase
        .from('channels')
        .select('id, name')
        .order('name', { ascending: true })

      if (allChannelsError) throw allChannelsError

      // Fetch user's channel memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', currentUser.id)

      if (membershipError) throw membershipError

      const userChannelIds = new Set(memberships.map(m => m.channel_id))
      const channelsWithMembership = allChannelsData.map(channel => ({
        ...channel,
        is_member: userChannelIds.has(channel.id)
      }))

      setAllChannels(channelsWithMembership)
      setChannels(channelsWithMembership.filter(channel => channel.is_member))
    } catch (error) {
      setError('Failed to fetch channels')
      console.error('Error fetching channels:', error)
    } finally {
      setLoadingChannels(false)
    }
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim()) return

    try {
      if (!currentUser) throw new Error('No user found')

      const supabase = getSupabase()

      // Create the channel
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .insert({ name: newChannelName.trim() })
        .select()
        .single()

      if (channelError) {
        if (channelError.message.includes('duplicate key value violates unique constraint')) {
          toast.error('Channel name already exists. Please choose a different name.')
          setIsDialogOpen(false)
        } else {
          console.error('Unexpected error creating channel:', channelError)
          toast.error('An unexpected error occurred. Please try again later.')
          setIsDialogOpen(false)
        }
        return
      }

      // Add the creator as a member
      const { error: memberError } = await supabase
        .from('channel_members')
        .insert({ channel_id: channelData.id, user_id: currentUser.id })

      if (memberError) throw memberError

      setNewChannelName('')
      setIsDialogOpen(false)
      await fetchChannels()
      router.push(`/channel/${channelData.id}`) // Navigate to the new channel
    } catch (error) {
      setIsDialogOpen(false)
      toast.error('Failed to create channel. Please try again later.')
    }
  }

  const handleLogout = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleJoinChannel = async (channelId: string) => {
    try {
      if (!currentUser) throw new Error('No user found')

      const supabase = getSupabase()

      const { error: memberError } = await supabase
        .from('channel_members')
        .insert({ channel_id: channelId, user_id: currentUser.id })

      if (memberError) throw memberError

      await fetchChannels()
      router.push(`/channel/${channelId}`)
    } catch (error) {
      console.error('Error joining channel:', error)
      setError('Failed to join channel')
    }
  }

  const fetchDirectMessages = async () => {
    setLoadingDMs(true)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('No user found')

      // Use the Supabase function to fetch conversations and participants
      const { data: conversations, error } = await supabase
        .rpc('fetch_user_conversations', { user_id: user.id })

      if (error) throw error

      // Process the data to group participants by conversation
      const participantsByConversation = conversations.reduce((acc: Record<string, { id: string; email: string; display_name?: string }[]>, conv: any) => {
        if (!acc[conv.conversation_id]) {
          acc[conv.conversation_id] = []
        }
        acc[conv.conversation_id].push({
          id: conv.participant_id,
          email: conv.participant_email,
          display_name: conv.participant_display_name
        })
        return acc
      }, {});

      // Combine conversation info with participants
      const processedDMs = Object.keys(participantsByConversation).map((conversation_id: string) => ({
        conversation_id,
        type: conversations.find((conv: any) => conv.conversation_id === conversation_id)?.type,
        name: conversations.find((conv: any) => conv.conversation_id === conversation_id)?.name,
        participants: participantsByConversation[conversation_id].map((participant: { id: string; email: string; display_name?: string }) => ({
          ...participant
        }))
      }));

      setDirectMessages(processedDMs as DirectMessage[])
    } catch (error) {
      console.error('Error fetching DMs:', error)
    } finally {
      setLoadingDMs(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      interface PostResponse {
        id: string
        content: string
        channel_id: string
        user_id: string
        created_at: string
        user: {
          id: string
          email: string
          display_name: string | null
        }
      }

      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          channel_id,
          user_id,
          created_at,
          user:users!user_id(id, email, display_name)
        `)
        .ilike('content', `%${searchQuery}%`)
        .in('channel_id', channels.map(c => c.id))
        .returns<PostResponse[]>()

      if (error) throw error
      
      // Transform the data to match Post type
      const transformedPosts: Post[] = (posts || []).map(post => ({
        id: post.id,
        content: post.content,
        channel_id: post.channel_id,
        user_id: post.user_id,
        created_at: post.created_at,
        user: {
          id: post.user.id,
          email: post.user.email,
          display_name: post.user.display_name
        }
      }))
      
      setSearchResults(transformedPosts)
    } catch (error) {
      console.error('Error searching posts:', error)
      setError('Failed to search posts')
    }
  }

  const fetchUnreadCounts = async () => {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .rpc('get_unread_counts_for_user', {
          p_user_id: user.id
        })

      if (error) {
        console.error('Error fetching unread counts:', error)
        return
      }

      const countsMap = data.reduce((acc: Record<string, number>, item: any) => {
        acc[item.conversation_id] = item.unread_count
        return acc
      }, {})

      setUnreadCounts(countsMap)
    } catch (error) {
      console.error('Error in fetchUnreadCounts:', error)
    }
  }

  const handleGlobalBotChat = async () => {
    const supabase = getSupabase()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) return

    try {
      const allParticipantIds = [currentUser.id, '54296b9b-091e-4a19-b5b9-b890c24c1912'].sort()
      const { data: existingConversation, error: lookupError } = await supabase
        .rpc('find_existing_conversation', {
          participant_ids: allParticipantIds
        })

      if (lookupError) throw lookupError

      if (existingConversation) {
        router.push(`/dm/${existingConversation}`)
        return
      }

      const { data: conversationId, error: createError } = await supabase
        .rpc('create_conversation_with_participants', {
          p_type: 'dm',
          p_name: null,
          p_participant_ids: allParticipantIds
        })

      if (createError) throw createError

      router.push(`/dm/${conversationId}`)
    } catch (error) {
      console.error('Error creating conversation with global bot:', error)
      toast({
        title: "Error starting chat",
        description: "There was an error starting the chat with Global Bot. Please try again.",
        variant: "destructive"
      })
    }
  }

  if (error) return <div className="text-red-500">{error}</div>

  return (
    <aside className={`min-w-[15vw] max-w-[15vw] ${theme.colors.background} ${theme.colors.foreground} p-4 flex flex-col h-full`}>
      <div className={`flex justify-between items-center mb-4 -mx-4 px-4 pb-2 border-b cursor-pointer ${theme.colors.accent} transition-colors hover:bg-opacity-80`} onClick={handleGlobalBotChat}>
        <h2 className="text-xl font-bold">Global Bot</h2>
        <Sparkles className="h-5 w-5" />
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Channels</h2>
        <Button 
          onClick={() => setIsSearchOpen(true)} 
          variant="ghost" 
          size="icon"
          className={`${tourStep === 3 ? 'scale-150 animate-slow-pulse ring-4 ring-offset-2 ring-blue-500 ring-offset-background' : ''} transition-all duration-300`}
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* Channels section */}
      <div className="flex-shrink-0">
        <ul className="mb-2 overflow-y-auto max-h-[30vh]">
          {loadingChannels ? (
            <div className="p-2 text-sm text-gray-500">Loading channels...</div>
          ) : (
            channels.map((channel) => (
              <li key={channel.id} className="mb-2">
                <Link 
                  href={`/channel/${channel.id}?tourStep=${tourStep}`} 
                  className={`block p-2 rounded ${theme.colors.accent} transition-colors hover:bg-opacity-80`}
                >
                  <span className="text-sm truncate block"># {channel.name}</span>
                </Link>
              </li>
            ))
          )}
        </ul>

        <div className="space-y-1 border-t pt-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm font-normal h-8 px-2 hover:bg-opacity-80"
            onClick={() => setShowAllChannels(!showAllChannels)}
          >
            {showAllChannels ? '↓ Hide Channels' : '→ Show All Channels'}
          </Button>

          {showAllChannels && (
            <ul className="py-1 max-h-[20vh] overflow-y-auto">
              {allChannels
                .filter(channel => !channel.is_member)
                .map((channel) => (
                  <li 
                    key={channel.id} 
                    className={`flex items-center px-2 h-8 cursor-pointer ${theme.colors.accent} transition-colors hover:bg-opacity-80 group`}
                    onClick={() => handleJoinChannel(channel.id)}
                  >
                    <span className="flex-1 text-sm truncate"># {channel.name}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Join this channel</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                ))}
            </ul>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-sm font-normal h-8 px-2 hover:bg-opacity-80 ${
                  tourStep === 1 ? 'scale-110 animate-slow-pulse ring-4 ring-offset-2 ring-blue-500 ring-offset-background' : ''
                } transition-all duration-300`}
              >
                + Create Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new channel</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateChannel}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Create Channel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Direct Messages section */}
      <div className="flex-1 border-t pt-2 mt-8 min-h-0 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Direct Messages</h2>
          <button
            onClick={() => setIsChatModalOpen(true)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <ul className="overflow-y-auto flex-1">
          {loadingDMs ? (
            <div className="p-2 text-sm text-gray-500">Loading messages...</div>
          ) : (
            directMessages.map((dm) => (
              <li key={dm.conversation_id} className="mb-2">
                <Link 
                  href={`/dm/${dm.conversation_id}`} 
                  className={`block p-2 rounded ${theme.colors.accent} transition-colors hover:bg-opacity-80 relative`}
                >
                  <div className="flex items-center pr-6">
                    {dm.type === 'group' ? (
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium block truncate">{dm.name || 'Group Chat With'}</span>
                        <div className="text-xs truncate">
                          {dm.participants.map(p => p.display_name || p.email).join(', ')}
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <UserDisplay 
                          user={dm.participants[0]}
                          isOnline={onlineUsers.has(dm.participants[0]?.id)}
                        />
                      </div>
                    )}
                    {unreadCounts[dm.conversation_id] > 0 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {unreadCounts[dm.conversation_id]}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="flex-shrink-0 mt-auto pt-2">
        <Link href="/profile">
          <Button variant="ghost" className="w-full flex items-center justify-start text-sm font-normal h-8 px-2 mb-1">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Button>
        </Link>
        <Button variant="ghost" className="w-full flex items-center justify-start text-sm font-normal h-8 px-2" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {showTour && getTourContent() && tourStep !== 5 && (
        <TourPopup
          {...getTourContent()!}
          onClose={handleCloseTour}
          onNext={handleNextTourStep}
          isLastStep={tourStep === 5}
          currentStep={tourStep}
          totalSteps={5}
        />
      )}
      <StartChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        preselectedUserId="dda6f6bb-c6b1-4d8f-b0f7-5dd506e7b4f8"
        customHeader={tourStep === 5 ? "Start a chat to finish the tour!" : undefined}
        showStartChatAnimation={tourStep === 5}
      />
    </aside>
  )
}

