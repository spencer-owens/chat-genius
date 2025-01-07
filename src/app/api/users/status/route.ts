import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { data: user, error } = await supabase
      .from('users')
      .update({ status: body.status })
      .eq('id', body.userId)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error updating user status' },
      { status: 500 }
    )
  }
} 