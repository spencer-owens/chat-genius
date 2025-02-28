import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

// 5MB for images, 10MB for documents
const MAX_FILE_SIZES = {
  'image': 5 * 1024 * 1024,
  'document': 10 * 1024 * 1024
}

const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'text/plain': 'document'
}

interface UploadOptions {
  channelId?: string
  dmReceiverId?: string
  messageId?: string
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const { user } = useAuth()

  const validateFile = (file: File) => {
    const fileType = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]
    
    if (!fileType) {
      throw new Error('File type not supported. Please upload an image or document.')
    }

    const maxSize = MAX_FILE_SIZES[fileType as keyof typeof MAX_FILE_SIZES]
    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`)
    }

    return fileType
  }

  const uploadFile = async (file: File, options: UploadOptions) => {
    if (!user) throw new Error('Must be logged in to upload files')
    
    try {
      setUploading(true)

      // Validate file
      const fileType = validateFile(file)

      // Generate a unique file path
      const timestamp = new Date().getTime()
      const fileExt = file.name.split('.').pop()
      const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileType}s/${user.id}/${fileName}`

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public-documents')
        .getPublicUrl(filePath)

      // Save metadata
      const { data: metaData, error: metaError } = await supabase
        .from('file_metadata')
        .insert({
          user_id: user.id,
          message_id: options.messageId,
          bucket: 'public-documents',
          path: filePath,
          name: file.name,
          type: file.type,
          size: file.size,
          channel_id: options.channelId,
          dm_receiver_id: options.dmReceiverId
        })
        .select()
        .single()

      if (metaError) throw metaError

      return {
        ...metaData,
        publicUrl
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    } finally {
      setUploading(false)
    }
  }

  return {
    uploadFile,
    uploading
  }
} 