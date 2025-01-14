'use client'

import { ReactNode } from 'react'
import { UnreadCountsProvider } from './UnreadCountsProvider'
import { AIProvider } from '@/contexts/AIContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <UnreadCountsProvider>
      <AIProvider>
        {children}
      </AIProvider>
    </UnreadCountsProvider>
  )
} 