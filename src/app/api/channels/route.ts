import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data: channels, error } = await supabase
      .from('channels')
      .select(`
        *,
        memberships!inner(user_id)
      `)
    
    if (error) throw error
    
    return NextResponse.json(channels)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching channels' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { data: channel, error } = await supabase
      .from('channels')
      .insert([body])
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(channel)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating channel' },
      { status: 500 }
    )
  }
} 