import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Trash2, X, Check, Waves, Download, FileIcon, Smile, ChevronLeft, ChevronRight, MoreVertical, Globe } from 'lucide-react';
import { getSupabase } from '../auth';
import { useToast } from "@/components/ui/use-toast";
import { themes } from '../config/themes';
import { EMOJI_PAGES } from '../config/emojis';
import UserDisplay from './UserDisplay';
import VoiceMessage from './VoiceMessage';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { MessageDisplayProps } from '@/app/types/props/MessageDisplayProps'
import type { File } from '@/app/types/entities/File'
import type { EmojiReaction } from '@/app/types/entities/EmojiReaction'
import type { Translation } from '@/app/types/entities/Translation'
import TTSPlayer from './TTSPlayer'

export default function MessageDisplay({
  id,
  content,
  user,
  files,
  currentUser,
  onlineUsers = new Set(),
  messageType,
  threadCount = 0,
  onThreadOpen,
  onUpdate,
  tableName,
  className = '',
  hideActions,
  translation,
  created_at
}: MessageDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const { toast } = useToast();
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return themes.find(t => t.id === localStorage.getItem('slack-clone-theme')) || themes[0];
    }
    return themes[0];
  });
  const [reactions, setReactions] = useState<EmojiReaction[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [reactionUsers, setReactionUsers] = useState<Record<string, any>>({});

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: today.getFullYear() !== date.getFullYear() ? 'numeric' : undefined 
    }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    loadReactions();
  }, [id]);

  useEffect(() => {
    // Load user data for all reactions
    const userIds = new Set(reactions.map(r => r.user_id));
    const loadUserData = async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, email')
        .in('id', Array.from(userIds));

      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

      const userMap = data.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, any>);

      setReactionUsers(userMap);
    };

    if (userIds.size > 0) {
      loadUserData();
    }
  }, [reactions]);

  const loadReactions = async () => {
    const supabase = getSupabase();
    let query = supabase
      .from('emoji_reactions')
      .select('*')
      .order('created_at', { ascending: true });

    // Add the appropriate condition based on message type
    if (messageType === 'post') {
      query = query.eq('post_id', id);
    } else if (messageType === 'post_thread') {
      query = query.eq('post_thread_comment_id', id);
    } else if (messageType === 'dm') {
      query = query.eq('message_id', id);
    } else if (messageType === 'dm_thread') {
      query = query.eq('conversation_thread_comment_id', id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading reactions:', error);
      return;
    }

    setReactions(data || []);
  };

  const handleAddReaction = async (emoji: string) => {
    if (!currentUser) return;

    const supabase = getSupabase();
    const reactionData: any = {
      user_id: currentUser.id,
      emoji,
      created_at: new Date().toISOString(),
    };

    // Set the appropriate ID field based on message type
    if (messageType === 'post') {
      reactionData.post_id = id;
    } else if (messageType === 'post_thread') {
      reactionData.post_thread_comment_id = id;
    } else if (messageType === 'dm') {
      reactionData.message_id = id;
    } else if (messageType === 'dm_thread') {
      reactionData.conversation_thread_comment_id = id;
    }

    const { data, error } = await supabase
      .from('emoji_reactions')
      .insert([reactionData])
      .select();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error adding reaction",
        description: error.message
      });
      return;
    }

    // Remove optimistic update since we'll get the update via subscription
    toast({
      title: "Reaction added",
      description: "Your reaction has been added to the message."
    });
  };

  const handleRemoveReaction = async (reactionId: string) => {
    if (!currentUser) return;

    const supabase = getSupabase();
    const { error } = await supabase
      .from('emoji_reactions')
      .delete()
      .eq('id', reactionId)
      .eq('user_id', currentUser.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error removing reaction",
        description: error.message
      });
      return;
    }

    // Remove optimistic update since we'll get the update via subscription
    toast({
      title: "Reaction removed",
      description: "Your reaction has been removed from the message."
    });
  };

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, EmojiReaction[]>);

  useEffect(() => {
    const handleStorageChange = () => {
      const themeId = localStorage.getItem('slack-clone-theme');
      setTheme(themes.find(t => t.id === themeId) || themes[0]);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isOwner = currentUser?.id === user.id;
  const showThread = ['post', 'dm'].includes(messageType);

  const handleEdit = async () => {
    if (!currentUser) return;
    
    const supabase = getSupabase();
    const { error } = await supabase
      .from(tableName)
      .update({ content: editedContent })
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating message",
        description: error.message
      });
      return;
    }

    setIsEditing(false);
    onUpdate(editedContent);
    toast({
      title: "Message updated",
      description: "Your message has been successfully updated."
    });
  };

  const handleDelete = async () => {
    if (!currentUser) return;

    const supabase = getSupabase();
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting message",
        description: error.message
      });
      return;
    }

    onUpdate(content);
    toast({
      title: "Message deleted",
      description: "Your message has been successfully deleted."
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleDownload = async (file: File) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from(file.bucket)
        .download(file.path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "File downloaded",
        description: `${file.file_name} has been downloaded successfully.`
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        variant: "destructive",
        title: "Error downloading file",
        description: "There was an error downloading the file. Please try again."
      });
    }
  };

  const handleFileDelete = async (file: File) => {
    if (!currentUser || user.id !== currentUser.id) return;

    try {
      const supabase = getSupabase();

      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from(file.bucket)
        .remove([file.path]);

      if (storageError) throw storageError;

      // Delete the file attachment record
      const { error: attachmentError } = await supabase
        .from('file_attachments')
        .delete()
        .eq('file_id', file.id);

      if (attachmentError) throw attachmentError;

      // Delete the file record
      const { error: fileError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (fileError) throw fileError;

      toast({
        title: "File deleted",
        description: "The file has been successfully deleted."
      });
      
      onUpdate(content);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        variant: "destructive",
        title: "Error deleting file",
        description: "There was an error deleting the file. Please try again."
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const supabase = getSupabase();
    
    // Create the filter condition based on message type
    let filterCondition = '';
    if (messageType === 'post') {
      filterCondition = `post_id=eq.${id}`;
    } else if (messageType === 'post_thread') {
      filterCondition = `post_thread_comment_id=eq.${id}`;
    } else if (messageType === 'dm') {
      filterCondition = `message_id=eq.${id}`;
    } else if (messageType === 'dm_thread') {
      filterCondition = `conversation_thread_comment_id=eq.${id}`;
    }

    const channel = supabase
      .channel(`reactions:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emoji_reactions',
          filter: filterCondition
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setReactions(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'DELETE') {
            setReactions(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, messageType]);

  // Add separate subscription for translations
  useEffect(() => {
    if (!id) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`translations:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translations',
          filter: messageType === 'post' || messageType === 'post_thread' 
            ? `post_id=eq.${id}` 
            : `message_id=eq.${id}`
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            onUpdate(content);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, messageType, content, onUpdate]);

  const getTranslatedContent = () => {
    if (!translation || !currentUser?.native_language || user.native_language === currentUser.native_language) return null;

    // Map language UUID to translation field
    const translationMap: Record<string, keyof Translation> = {
      '3823c9fa-ed84-4a19-906a-7e5639a9e3d8': 'portuguese_translation',    // Portuguese
      '6292a2b1-7d7c-4223-958a-c4a0bbc0f8a3': 'bengali_translation',       // Bengali
      '6483ffa6-c90c-43ea-b97e-e33a81c80262': 'russian_translation',       // Russian
      '7e2490ff-ef43-47eb-9de7-59963b9b4f9c': 'hindi_translation',         // Hindi
      '9b15d05b-c7ff-4ed6-99f9-32f169241d50': 'japanese_translation',      // Japanese
      'a5a8f2e7-4046-4ea9-823f-2f549ce1880e': 'arabic_translation',        // Arabic
      'a948dd0e-20de-4e99-8450-72aa52331ba3': 'english_translation',       // English
      'b6e44df4-60ed-4064-9f55-9e5c0b4dddc4': 'western_punjabi_translation',// Western Punjabi
      'baebecad-9aae-42c4-b595-44f2727a71be': 'mandarin_chinese_translation', // Mandarin Chinese
      'f8465dcb-806e-470c-9f9b-9159e14f6903': 'spanish_translation',       // Spanish
    };
  

    const translationField = translationMap[currentUser.native_language];
    return translation[translationField];
  };

  if (isEditing) {
    return (
      <div className="bg-white p-3 rounded transition-all duration-200">
        <UserDisplay 
          user={user}
          isOnline={onlineUsers.has(user.id)}
          className="font-bold"
        />
        <div className="mt-2 flex gap-2">
          <Input
            type="text"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-white"
            autoFocus
          />
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleEdit}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Press Enter to save, Escape to cancel
        </div>
      </div>
    );
  }

  const isCurrentUser = currentUser?.id === user.id;
  
  return (
    <div
      className={`bg-white py-3 px-6 rounded group hover:scale-[1.01] transition-all duration-200 relative pb-4 ${theme.colors.accent} hover:bg-opacity-15 ${className}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserDisplay 
                user={user}
                isOnline={onlineUsers.has(user.id)}
                className="font-bold"
              />
              <span className="text-xs text-gray-500">
                {formatTimestamp(created_at)}
              </span>
              <TTSPlayer 
                contentType={
                  messageType === 'dm' ? 'message' :
                  messageType === 'post' ? 'post' :
                  messageType === 'dm_thread' ? 'conversation_thread_comment' :
                  messageType === 'post_thread' ? 'post_thread_comment' :
                  'message'
                }
                contentId={id}
              />
            </div>
            <div className="flex gap-1">
              {currentUser && !hideActions && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    {/* Emoji Grid */}
                    <div className="grid grid-cols-10 gap-1 mb-2">
                      {EMOJI_PAGES[currentPage].map((emoji) => (
                        <Button
                          key={emoji}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-accent"
                          onClick={() => handleAddReaction(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center border-t pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((prev) => (prev > 0 ? prev - 1 : EMOJI_PAGES.length - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-gray-500">
                        Page {currentPage + 1} of {EMOJI_PAGES.length}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((prev) => (prev < EMOJI_PAGES.length - 1 ? prev + 1 : 0))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {showThread && onThreadOpen && !hideActions && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => onThreadOpen({ 
                    id, 
                    content, 
                    created_at,
                    sender: user 
                  })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                  <Waves className="h-4 w-4" />
                  {threadCount > 0 && <span className="text-xs">{threadCount}</span>}
                </Button>
              )}
              {isOwner && !hideActions && (
                <>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setIsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm whitespace-pre-wrap break-words mt-1" dangerouslySetInnerHTML={{ __html: content }}></div>
              </TooltipTrigger>
              {getTranslatedContent() && (
                <TooltipContent
                  side="top"
                  align="start"
                  className={`z-[9999] shadow-lg border rounded-lg p-3 ${theme.colors.background}`}
                  sideOffset={5}
                  style={{
                    maxWidth: '300px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <p className={`text-sm ${theme.colors.foreground}`}>{getTranslatedContent()}</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {files && files.length > 0 && (
            <div className="mt-2 space-y-2">
              {files.map((file) => {
                // Handle voice messages differently
                if (file.file_type === 'audio/mp3' && file.bucket === 'voice-messages') {
                  return (
                    <VoiceMessage
                      key={file.id}
                      bucket={file.bucket}
                      path={file.path}
                      fileName={file.file_name}
                      duration={file.duration_seconds || 0}
                    />
                  )
                }

                // Handle other files as before
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 bg-white p-2 rounded border group/file max-w-[400px] hover:bg-gray-50 transition-colors"
                  >
                    <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.file_name}</div>
                      <div className="text-xs text-gray-500">{formatFileSize(file.file_size)}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-500 h-8 w-8 p-0"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 opacity-0 group-hover/file:opacity-100 transition-opacity h-8 w-8 p-0"
                          onClick={() => handleFileDelete(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Emoji Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {Object.entries(groupedReactions).map(([emoji, reactions]) => {
                const hasUserReacted = reactions.some(r => r.user_id === currentUser?.id);
                // Get just the display names for each user who reacted
                const reactingUsers = reactions
                  .map(r => {
                    if (r.user_id === currentUser?.id) {
                      return currentUser.display_name || 'You';
                    }
                    const user = reactionUsers[r.user_id];
                    return user?.display_name || user?.email?.split('@')[0] || 'Unknown user';
                  })
                  .join(', ');
                
                return (
                  <TooltipProvider key={emoji}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-8 px-3 py-1 text-sm rounded-full bg-opacity-25 ${
                            hasUserReacted ? `${theme.colors.background} bg-opacity-25` : 'hover:bg-accent'
                          }`}
                          onClick={() => {
                            const userReaction = reactions.find(r => r.user_id === currentUser?.id);
                            if (userReaction) {
                              handleRemoveReaction(userReaction.id);
                            } else {
                              handleAddReaction(emoji);
                            }
                          }}
                        >
                          <span className="mr-1.5 text-base">{emoji}</span>
                          <span>{reactions.length}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" sideOffset={5} className="p-2 z-[9999]">
                        <p className="text-sm">{reactingUsers}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
              
              {/* Add reaction button at the end of existing reactions */}
              {currentUser && !hideActions && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 py-1 text-sm rounded-full hover:bg-accent"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    {/* Emoji Grid */}
                    <div className="grid grid-cols-10 gap-1 mb-2">
                      {EMOJI_PAGES[currentPage].map((emoji) => (
                        <Button
                          key={emoji}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-accent"
                          onClick={() => handleAddReaction(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center border-t pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((prev) => (prev > 0 ? prev - 1 : EMOJI_PAGES.length - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-gray-500">
                        Page {currentPage + 1} of {EMOJI_PAGES.length}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((prev) => (prev < EMOJI_PAGES.length - 1 ? prev + 1 : 0))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 