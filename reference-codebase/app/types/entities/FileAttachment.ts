export interface FileAttachment {
  id: string
  file_name: string
  file_type: string
  file_size: number
  path: string
  bucket: string
  duration_seconds?: number
} 