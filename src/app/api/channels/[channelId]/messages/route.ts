import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users(*),
        reactions(*)
      `)
      .eq('channel_id', params.channelId)
      .is('thread_id', null)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json(messages)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const body = await request.json()
    const { data: message, error } = await supabase
      .from('messages')
      .insert([{ ...body, channel_id: params.channelId }])
      .select(`
        *,
        sender:users(*),
        reactions(*)
      `)
      .single()
    
    if (error) throw error
    
    return NextResponse.json(message)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating message' },
      { status: 500 }
    )
  }
} 