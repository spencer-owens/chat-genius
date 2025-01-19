import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSupabase } from '../auth';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser } from '../hooks/useUser';
import type { UserDisplayProps } from '@/app/types/props/UserDisplayProps';

export default function UserDisplay({ 
  user, 
  showPresence = true, 
  isOnline = false,
  className = '',
  sidebarColor = 'rgb(59, 73, 223)' // default blue color
}: UserDisplayProps) {
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const displayName = user.display_name || user.email || 'Anonymous User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const { user: currentUser } = useUser();
  const isCurrentUser = currentUser && user.id === currentUser.id;
  const effectiveIsOnline = isCurrentUser || isOnline;

  useEffect(() => {
    const fetchProfilePic = async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('user_profiles')
          .select('profile_pic_url')
          .eq('id', user.id)
          .maybeSingle();
        
        setProfilePicUrl(data?.profile_pic_url || null);
      } catch (error) {
        // Silently handle the error - profile pic not found is an expected case
        setProfilePicUrl(null);
      }
    };

    fetchProfilePic();
  }, [user.id]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={profilePicUrl || undefined} alt={displayName} />
        <AvatarFallback 
          className="bg-white"
          style={{ color: sidebarColor }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{displayName}</span>
      {showPresence && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className={`text-lg leading-none ${effectiveIsOnline ? 'text-green-500' : 'text-gray-400'}`}>●</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{effectiveIsOnline ? 'Online' : 'Offline'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
} 