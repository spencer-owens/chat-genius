import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { data: membership, error } = await supabase
      .from('memberships')
      .insert([body])
      .select(`
        *,
        user:users(*),
        channel:channels(*)
      `)
      .single()
    
    if (error) throw error
    
    return NextResponse.json(membership)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error adding member to channel' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const channelId = searchParams.get('channelId')
    
    const { error } = await supabase
      .from('memberships')
      .delete()
      .match({
        user_id: userId,
        channel_id: channelId
      })
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error removing member from channel' },
      { status: 500 }
    )
  }
} 