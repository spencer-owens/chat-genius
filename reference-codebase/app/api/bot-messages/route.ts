import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BOT_USER_ID = '54296b9b-091e-4a19-b5b9-b890c24c1912'

interface UserLanguageData {
  native_language: string
  language_preference: {
    language: string
  }
}

export async function POST(request: Request) {
  try {
    const { content, conversationId, senderId } = await request.json()

    // Get user's language preference
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        native_language,
        language_preference:top_languages!users_native_language_fkey (
          language
        )
      `)
      .eq('id', senderId)
      .single()

    if (userError) {
      throw new Error(`Error fetching user data: ${JSON.stringify(userError)}`)
    }

    const typedUserData = userData as unknown as UserLanguageData

    // Generate embedding for the user's message
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: content,
      encoding_format: "float"
    })

    // Perform vector similarity search across all content types
    const { data: similarContent, error: searchError } = await supabase.rpc('match_all_content', {
      query_embedding: embedding.data[0].embedding,
      match_threshold: 1.0,
      match_count: 5,
      p_user_id: senderId
    })

    if (searchError) {
      throw new Error(`Search error: ${JSON.stringify(searchError)}`)
    }
    
    // Format context from similar content, or use empty context if none found
    const context = similarContent?.length 
      ? similarContent
          .map((item: any, index: number) => {
            let locationInfo = ''
            if (item.channel_id) {
              locationInfo = `in channel ${item.channel_id}`
              if (item.content_type === 'post_thread') {
                locationInfo += ` (thread reply to post ${item.parent_id})`
              }
            } else if (item.conversation_id) {
              locationInfo = `in DM ${item.conversation_id}`
              if (item.content_type === 'dm_thread') {
                locationInfo += ` (thread reply to message ${item.parent_id})`
              }
            }
            return `[${index + 1}] ${item.display_name} ${locationInfo} at ${new Date(item.created_at).toLocaleString()}: ${item.content} (similarity: ${item.similarity.toFixed(3)})`
          })
          .join('\n')
      : "No relevant context found."


    // Get chat completion from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant in a chat application. Use the provided context to help answer the user's question. If no relevant context is found, respond based on your general knowledge. Keep responses concise and friendly. You should respond in ${typedUserData.language_preference?.language || 'English'} language. Your response must be a valid JSON object with two fields: 'response' (your text response) and 'relevant_sources' (an array of indices of the provided sources that contained the information requested by the user). If there are multiple sources used, include all of them in the relevant_sources array. Exclude any sources that are not relevant to the user's question.`
        },
        {
          role: "user",
          content: `Context from messages and posts throughout the company's communication:\n${context}\n\nUser's message: ${content}`
        }
      ],
      response_format: { type: "json_object" }
    })

    // Parse the JSON response
    const messageContent = completion.choices[0].message.content
    if (!messageContent) {
      throw new Error('No response received from OpenAI')
    }
    const aiResponse = JSON.parse(messageContent)

    // Filter sources to only include the ones marked as relevant
    const relevantSources = similarContent?.length && aiResponse.relevant_sources.length
      ? '<br><span class="text-xs">Sources: ' + aiResponse.relevant_sources
          .map((index: number) => {
            const item = similarContent[index - 1]
            let href = ''
            if (item.channel_id) {
              href = `/channel/${item.channel_id}`
              if (item.content_type === 'post_thread') {
                href += `?thread=${item.parent_id}#${item.content_id}`
              } else {
                href += `?thread=${item.content_id}`
              }
            } else if (item.conversation_id) {
              href = `/dm/${item.conversation_id}`
              if (item.content_type === 'dm_thread') {
                href += `?thread=${item.parent_id}#${item.content_id}`
              }
            }
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-500" title="Opens in new tab">[${index + 1}]</a>`
          })
          .join(' ') + '</span>'
      : ''

    // Combine bot's response with filtered sources
    const responseWithSources = aiResponse.response + relevantSources

    // Save bot's response as a new message
    const { data: botMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        content: responseWithSources,
        conversation_id: conversationId,
        sender_id: BOT_USER_ID
      })
      .select()
      .single()

    if (messageError) throw messageError

    return NextResponse.json({ success: true, message: botMessage })
  } catch (error) {
    console.error('Error in bot-messages route:', error)
    return NextResponse.json(
      { error: 'Failed to process bot message' },
      { status: 500 }
    )
  }
} 