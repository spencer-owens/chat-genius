/// <reference lib="deno.ns" />
import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

console.log('Initializing Supabase client...');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type ContentType = 'post' | 'message' | 'post_thread_comment' | 'conversation_thread_comment';

interface ContentItem {
  id: string;
  content: string;
  type: ContentType;
}

async function fetchContentWithoutEmbeddings(): Promise<ContentItem[]> {
  console.log('Fetching content without embeddings...');
  const results: ContentItem[] = [];

  // Fetch posts
  const { data: posts, error: postsError } = await supabase.rpc('posts_without_embeddings');
  if (postsError) throw postsError;
  results.push(...posts.map(p => ({ ...p, type: 'post' as ContentType })));

  // Fetch messages
  const { data: messages, error: messagesError } = await supabase.rpc('messages_without_embeddings');
  if (messagesError) throw messagesError;
  results.push(...messages.map(m => ({ ...m, type: 'message' as ContentType })));

  // Fetch post thread comments
  const { data: postComments, error: postCommentsError } = await supabase.rpc('post_thread_comments_without_embeddings');
  if (postCommentsError) throw postCommentsError;
  results.push(...postComments.map(pc => ({ ...pc, type: 'post_thread_comment' as ContentType })));

  // Fetch conversation thread comments
  const { data: convComments, error: convCommentsError } = await supabase.rpc('conversation_thread_comments_without_embeddings');
  if (convCommentsError) throw convCommentsError;
  results.push(...convComments.map(cc => ({ ...cc, type: 'conversation_thread_comment' as ContentType })));

  console.log(`Fetched ${results.length} items without embeddings.`);
  return results;
}

async function generateEmbedding(text: string) {
  console.log('Calling OpenAI API to generate embedding...');
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-large'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('OpenAI API responded with an error:', errText);
    throw new Error(`OpenAI API error: ${errText}`);
  }

  const result = await response.json();
  const embedding = result.data[0].embedding;
  console.log('Received embedding from OpenAI API.');
  return embedding;
}

async function saveEmbedding(item: ContentItem, embedding: number[]) {
  console.log(`Saving embedding for ${item.type} id: ${item.id}...`);
  const data: Record<string, any> = {
    id: crypto.randomUUID(),
    embedding,
    created_at: new Date().toISOString()
  };

  // Set the appropriate foreign key based on content type
  switch (item.type) {
    case 'post':
      data.post_id = item.id;
      break;
    case 'message':
      data.message_id = item.id;
      break;
    case 'post_thread_comment':
      data.post_thread_comment_id = item.id;
      break;
    case 'conversation_thread_comment':
      data.conversation_thread_comment_id = item.id;
      break;
  }

  const { error } = await supabase
    .from('vector_embeddings')
    .insert([data]);

  if (error) {
    console.error('Error saving embedding to database:', error);
    throw error;
  }
  console.log(`Successfully saved embedding for ${item.type} id: ${item.id}.`);
}

Deno.serve(async (req: Request) => {
  console.log('Edge function invoked.');
  try {
    const items = await fetchContentWithoutEmbeddings();
    const results = [];

    for (const item of items) {
      try {
        console.log(`Processing ${item.type} id: ${item.id}`);
        if (!item.content) {
          console.warn(`${item.type} id ${item.id} has no content. Skipping.`);
          results.push({ content_type: item.type, content_id: item.id, status: 'failed', error: 'No content' });
          continue;
        }
        const embedding = await generateEmbedding(item.content);
        await saveEmbedding(item, embedding);
        results.push({ content_type: item.type, content_id: item.id, status: 'success' });
      } catch (error) {
        console.error(`Error processing ${item.type} id ${item.id}:`, error);
        results.push({ content_type: item.type, content_id: item.id, status: 'failed', error: error.message });
      }
    }

    console.log('All items processed successfully.');
    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing embeddings:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
