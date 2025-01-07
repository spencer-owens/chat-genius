import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const body = await request.json()
    const { data: reaction, error } = await supabase
      .from('reactions')
      .insert([{ ...body, message_id: params.messageId }])
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(reaction)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error adding reaction' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const emoji = searchParams.get('emoji')
    
    const { error } = await supabase
      .from('reactions')
      .delete()
      .match({
        message_id: params.messageId,
        user_id: userId,
        emoji: emoji
      })
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error removing reaction' },
      { status: 500 }
    )
  }
} 