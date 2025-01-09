import { Loader2 } from 'lucide-react'

export default function DMLoading() {
  return (
    <div className="p-6">
      <div className="h-8 w-48 bg-gray-800 rounded mb-8" /> {/* Skeleton for title */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 bg-gray-800 rounded-lg animate-pulse">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gray-700 rounded-full" />
              <div className="ml-4 flex-1">
                <div className="h-5 w-32 bg-gray-700 rounded mb-2" />
                <div className="h-4 w-48 bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 