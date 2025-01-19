import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTranslations, getLanguages } from './utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface MessageResponse {
  content: string;
  conversation_id: string;
}

interface ThreadCommentResponse {
  content: string;
  message: {
    conversation_id: string;
  };
}

interface PostResponse {
  content: string;
  channel_id: string;
}

interface PostThreadCommentResponse {
  content: string;
  post: {
    channel_id: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messageId, conversationThreadCommentId, postId, postThreadCommentId, senderId } = body;

    if (!senderId || (!messageId && !conversationThreadCommentId && !postId && !postThreadCommentId)) {
      console.error('Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the sender's native language
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('native_language')
      .eq('id', senderId)
      .single();

    if (senderError) {
      console.error('Error fetching sender language:', senderError);
      throw senderError;
    }

    let content: string;
    let channelId: string | null = null;
    let conversationId: string | null = null;

    // Get the content and channel/conversation ID based on the type
    if (messageId) {
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('content, conversation_id')
        .eq('id', messageId)
        .single() as { data: MessageResponse | null, error: any };

      if (messageError) throw messageError;
      if (!message) throw new Error('Message not found');
      
      content = message.content;
      conversationId = message.conversation_id;
    } else if (conversationThreadCommentId) {
      const { data: comment, error: commentError } = await supabase
        .from('conversation_thread_comments')
        .select('content, message:message_id(conversation_id)')
        .eq('id', conversationThreadCommentId)
        .single() as { data: ThreadCommentResponse | null, error: any };

      if (commentError) throw commentError;
      if (!comment) throw new Error('Comment not found');
      
      content = comment.content;
      conversationId = comment.message.conversation_id;
    } else if (postId) {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('content, channel_id')
        .eq('id', postId)
        .single() as { data: PostResponse | null, error: any };

      if (postError) throw postError;
      if (!post) throw new Error('Post not found');
      
      content = post.content;
      channelId = post.channel_id;
    } else if (postThreadCommentId) {
      const { data: comment, error: commentError } = await supabase
        .from('post_thread_comments')
        .select('content, post:post_id(channel_id)')
        .eq('id', postThreadCommentId)
        .single() as { data: PostThreadCommentResponse | null, error: any };

      if (commentError) throw commentError;
      if (!comment) throw new Error('Comment not found');
      
      content = comment.content;
      channelId = comment.post.channel_id;
    } else {
      throw new Error('Invalid content type');
    }

    // Get all languages
    const languagesData = await getLanguages();

    // Create translations
    const translation = await createTranslations(
      content,
      messageId,
      conversationThreadCommentId,
      postId,
      postThreadCommentId,
      languagesData
    );

    return NextResponse.json(translation, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in translation endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 