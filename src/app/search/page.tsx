'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { SearchBar } from '@/components/shared/SearchBar'
import { useSearch } from '@/hooks/useSearch'
import { format } from 'date-fns'
import { Hash, FileText, MessageSquare } from 'lucide-react'

export default function SearchPage() {
  const router = useRouter()
  const { results, loading, search } = useSearch()
  const [query, setQuery] = useState('')

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery)
    search(newQuery)
  }

  const handleResultClick = (result: any) => {
    switch (result.type) {
      case 'message':
        router.push(`/channels/${result.channel.id}?messageId=${result.id}`)
        break
      case 'channel':
        router.push(`/channels/${result.channel.id}`)
        break
      case 'file':
        router.push(`/files/${result.id}`)
        break
    }
  }

  const ResultIcon = {
    message: MessageSquare,
    channel: Hash,
    file: FileText
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Search</h1>
        
        <div className="mb-8">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search messages, channels, and files..."
          />
        </div>

        {loading ? (
          <div className="text-center text-gray-500">Searching...</div>
        ) : query && !results.length ? (
          <div className="text-center text-gray-500">
            No results found for "{query}"
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => {
              const Icon = ResultIcon[result.type]
              
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 p-2">
                      <Icon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center text-sm">
                        {result.sender && (
                          <span className="font-medium text-white">
                            {result.sender.username}
                          </span>
                        )}
                        {result.channel && (
                          <>
                            <span className="mx-2 text-gray-500">in</span>
                            <span className="text-gray-300">
                              #{result.channel.name}
                            </span>
                          </>
                        )}
                        <span className="ml-auto text-xs text-gray-500">
                          {format(new Date(result.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-300 truncate">
                        {result.content}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
} 