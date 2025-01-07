import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .single()
    
    if (error) throw error
    
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching user' },
      { status: 500 }
    )
  }
} 