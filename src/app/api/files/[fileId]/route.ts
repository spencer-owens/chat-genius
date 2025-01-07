import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const { data: file, error } = await supabase
      .from('files')
      .select(`
        *,
        uploader:uploaded_by(*)
      `)
      .eq('id', params.fileId)
      .single()
    
    if (error) throw error
    
    // Get signed URL from storage
    const { data: signedUrl, error: storageError } = await supabase
      .storage
      .from('files')
      .createSignedUrl(file.url, 3600) // 1 hour expiry
    
    if (storageError) throw storageError
    
    return NextResponse.json({
      ...file,
      signedUrl: signedUrl.signedUrl
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching file' },
      { status: 500 }
    )
  }
} 