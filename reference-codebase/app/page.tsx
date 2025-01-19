"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './auth';
import { useUser } from './hooks/useUser';
import { toast } from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!user) {
        // Handle unauthenticated state if needed
        return;
      }

      const { data: memberships, error } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', 'ba3a0cd2-ed05-4f8b-9586-3c1dda9d6338')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching memberships:', error);
        return;
      }

      if (!memberships || memberships.length === 0) {
        // Add user to the general channel
        await supabase.from('channel_members').insert({
          channel_id: 'ba3a0cd2-ed05-4f8b-9586-3c1dda9d6338',
          user_id: user.id,
        });
        
        // Show toast notification
        toast("You've been added to the #general channel 🎉 Welcome!");
      }

      // Redirect to the general channel
      router.push('/channel/ba3a0cd2-ed05-4f8b-9586-3c1dda9d6338');
    };

    checkAndRedirect();
  }, [router, user]);

  return null;
}

