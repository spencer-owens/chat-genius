import { Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  shouldNavigate?: boolean
  initialValue?: string
}

export function SearchBar({ 
  onSearch, 
  placeholder = 'Search...', 
  shouldNavigate = false,
  initialValue = ''
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const router = useRouter()

  useEffect(() => {
    if (initialValue !== query) {
      setQuery(initialValue)
    }
  }, [initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (shouldNavigate) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    } else {
      onSearch(query)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full rounded-md border-0 bg-gray-700 py-1.5 pl-10 pr-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
          placeholder={placeholder}
        />
      </div>
    </form>
  )
} 