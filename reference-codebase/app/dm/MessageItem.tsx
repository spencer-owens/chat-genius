import { useState } from 'react';
import { getSupabase } from '../auth';
import MessageDisplay from '../components/MessageDisplay';
import type { MessageItemProps } from '@/app/types/props/MessageItemProps';

export default function MessageItem({ message, currentUser, onlineUsers, onThreadOpen }: MessageItemProps) {
  const [translation, setTranslation] = useState(message.translation);

  const handleUpdate = async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('message_id', message.id)
      .single();

    if (!error && data) {
      setTranslation(data);
    }
  };

  return (
    <MessageDisplay
      id={message.id}
      content={message.content}
      user={message.sender}
      files={message.files}
      currentUser={currentUser}
      onlineUsers={onlineUsers}
      messageType="dm"
      onThreadOpen={onThreadOpen}
      onUpdate={handleUpdate}
      tableName="messages"
      translation={translation}
      created_at={message.created_at}
    />
  );
} 