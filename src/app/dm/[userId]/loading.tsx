import { Loader2 } from 'lucide-react'

export default function DMConversationLoading() {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header skeleton */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse" />
          <div>
            <div className="h-5 w-32 bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-700 rounded mt-2 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Messages area skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <div className="h-10 w-10 bg-gray-700 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-700 rounded mb-2 animate-pulse" />
              <div className="h-16 w-3/4 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Input area skeleton */}
      <div className="p-4 border-t border-gray-700">
        <div className="h-10 bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  )
} 