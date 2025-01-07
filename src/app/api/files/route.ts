import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const channelId = formData.get('channelId') as string
    const messageId = formData.get('messageId') as string
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('files')
      .upload(`${Date.now()}-${file.name}`, file)
    
    if (uploadError) throw uploadError
    
    // Create file record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert([{
        name: file.name,
        url: uploadData.path,
        channel_id: channelId || null,
        message_id: messageId || null
      }])
      .select()
      .single()
    
    if (dbError) throw dbError
    
    return NextResponse.json(fileRecord)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    )
  }
} 