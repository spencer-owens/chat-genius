'use client'

import { MessageCircle } from 'lucide-react'
import useStore from '@/store'

export default function DMPage() {
  const { currentUser } = useStore()

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
      <MessageCircle className="h-12 w-12 text-gray-400" />
      <h2 className="text-lg font-medium text-white">Your Messages</h2>
      <p className="text-sm text-gray-400">
        Select a conversation or start a new one
      </p>
    </div>
  )
} 