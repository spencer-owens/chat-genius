'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface ExpandableNavItemProps {
  title: ReactNode
  linkHref: string
  isActive: boolean
  storageKey: string
  children: ReactNode
}

export function ExpandableNavItem({
  title,
  linkHref,
  isActive,
  storageKey,
  children
}: ExpandableNavItemProps) {
  const [isExpanded, setIsExpanded] = useLocalStorage(storageKey, true)

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-2">
        <Link
          href={linkHref}
          className={cn(
            'flex-1 text-sm font-semibold',
            isActive ? 'text-white' : 'text-gray-300 hover:text-white'
          )}
        >
          {title}
        </Link>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>
      {isExpanded && children}
    </div>
  )
} 