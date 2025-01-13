'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { SearchBar } from '@/components/shared/SearchBar'
import { useSearch } from '@/hooks/useSearch'
import { format } from 'date-fns'
import { Hash, FileText, MessageSquare, User, ChevronLeft, ChevronRight } from 'lucide-react'

const RESULTS_PER_PAGE = 10

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { results, loading, search } = useSearch()
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Calculate pagination
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE)
  const startIndex = (currentPage - 1) * RESULTS_PER_PAGE
  const endIndex = startIndex + RESULTS_PER_PAGE
  const currentResults = results.slice(startIndex, endIndex)

  // Initialize search from URL parameter
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && q !== query) {
      setQuery(q)
      setCurrentPage(1) // Reset to first page on new search
      search(q)
    }
  }, [searchParams]) // Removed search from dependencies

  const handleSearch = useCallback((newQuery: string) => {
    if (newQuery === query) return // Skip if query hasn't changed
    
    setQuery(newQuery)
    setCurrentPage(1) // Reset to first page on new search
    search(newQuery)
    
    // Update URL without navigation
    const url = new URL(window.location.href)
    url.searchParams.set('q', newQuery)
    window.history.pushState({}, '', url)
  }, [query, search])

  const handleResultClick = (result: any) => {
    switch (result.type) {
      case 'message':
        router.push(`/channels/${result.channel.id}?messageId=${result.id}`)
        break
      case 'channel':
        router.push(`/channels/${result.channel.id}`)
        break
      case 'dm':
        router.push(`/dm/${result.sender?.id || result.recipient?.id}`)
        break
      case 'file':
        window.open(result.url, '_blank')
        break
    }
  }

  const ResultIcon = {
    message: MessageSquare,
    channel: Hash,
    file: FileText,
    dm: User
  }

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Fixed Header */}
        <div className="flex-none p-6 bg-gray-900 border-b border-gray-700">
          <div className="max-w-4xl mx-auto w-full">
            <h1 className="text-2xl font-bold text-white mb-6">Search</h1>
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search messages and channels..."
              initialValue={query}
            />
          </div>
        </div>

        {/* Scrollable Results */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto w-full p-6">
            {loading ? (
              <div className="text-center text-gray-500">Searching...</div>
            ) : query && !results.length ? (
              <div className="text-center text-gray-500">
                No results found for "{query}"
              </div>
            ) : (
              <div className="space-y-4">
                {currentResults.map((result) => {
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
        </div>

        {/* Fixed Footer with Pagination */}
        {results.length > 0 && (
          <div className="flex-none p-4 bg-gray-900 border-t border-gray-700">
            <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="text-sm text-gray-400">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
} 