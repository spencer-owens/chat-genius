import { useState, useRef } from 'react'
import { Paperclip, Send, Smile, Loader2 } from 'lucide-react'
import { useFileUpload } from '@/hooks/useFileUpload'
import { toast } from 'sonner'

interface MessageInputProps {
  onSend: (content: string, fileMetadata?: { id: string; url: string; name: string; type: string; size: number }) => void
  channelId?: string
  dmUserId?: string
  placeholder?: string
}

export function MessageInput({ onSend, channelId, dmUserId, placeholder = "Type a message..." }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, uploading } = useFileUpload()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSend(message)
      setMessage('')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const result = await uploadFile(file, {
        channelId,
        dmReceiverId: dmUserId
      })

      // Send a message with the file attachment
      onSend('', {
        id: result.id,
        url: result.publicUrl,
        name: result.name,
        type: result.type,
        size: result.size
      })
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error uploading file')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={uploading}
          className="flex-1 bg-gray-700 text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        
        <button
          type="button"
          disabled={uploading}
          className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Smile className="h-5 w-5" />
        </button>
        
        <button
          type="submit"
          disabled={!message.trim() || uploading}
          className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  )
} 