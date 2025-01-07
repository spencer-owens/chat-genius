import { useState, useRef } from 'react'
import { Paperclip, Send, Smile } from 'lucide-react'

interface MessageInputProps {
  onSend: (content: string) => void
  onFileUpload: (file: File) => void
}

export function MessageInput({ onSend, onFileUpload }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSend(message)
      setMessage('')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-700 text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
        >
          <Smile className="h-5 w-5" />
        </button>
        
        <button
          type="submit"
          disabled={!message.trim()}
          className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  )
} 