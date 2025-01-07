import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { data: threads, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users(*),
        reactions(*)
      `)
      .eq('thread_id', params.messageId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    return NextResponse.json(threads)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching thread messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const body = await request.json()
    const { data: thread, error } = await supabase
      .from('messages')
      .insert([{ ...body, thread_id: params.messageId }])
      .select(`
        *,
        sender:users(*),
        reactions(*)
      `)
      .single()
    
    if (error) throw error
    
    return NextResponse.json(thread)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating thread message' },
      { status: 500 }
    )
  }
} 