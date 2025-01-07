import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    const { data: messages, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:sender_id(*)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .is('thread_id', null)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json(messages)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching direct messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { data: message, error } = await supabase
      .from('direct_messages')
      .insert([body])
      .select(`
        *,
        sender:sender_id(*)
      `)
      .single()
    
    if (error) throw error
    
    return NextResponse.json(message)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating direct message' },
      { status: 500 }
    )
  }
} 