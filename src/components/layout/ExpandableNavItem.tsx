'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ExpandableNavItemProps {
  title: string
  linkHref: string
  isActive: boolean
  children: React.ReactNode
  defaultExpanded?: boolean
  storageKey?: string
}

export function ExpandableNavItem({
  title,
  linkHref,
  isActive,
  children,
  defaultExpanded = true,
  storageKey
}: ExpandableNavItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Load expanded state from localStorage
  useEffect(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) {
        setIsExpanded(JSON.parse(stored))
      }
    }
  }, [storageKey])

  // Save expanded state to localStorage
  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newState))
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <button
          onClick={toggleExpanded}
          className="p-1 hover:bg-gray-700 rounded-md"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>
        <Link
          href={linkHref}
          className={cn(
            'flex-1 px-2 py-1 text-sm font-medium rounded-md',
            isActive
              ? 'bg-gray-800 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          )}
        >
          {title}
        </Link>
      </div>
      {isExpanded && (
        <div className="ml-6 space-y-1">
          {children}
        </div>
      )}
    </div>
  )
} 