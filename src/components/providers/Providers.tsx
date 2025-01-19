'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { UnreadCountsProvider } from '@/components/providers/UnreadCountsProvider'
import { DirectMessageProvider } from '@/contexts/DirectMessageContext'
import { ChannelProvider } from '@/contexts/ChannelContext'
import { AIProvider } from '@/contexts/AIContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <UnreadCountsProvider>
        <DirectMessageProvider>
          <ChannelProvider>
            <AIProvider>
              {children}
            </AIProvider>
          </ChannelProvider>
        </DirectMessageProvider>
      </UnreadCountsProvider>
    </AuthProvider>
  )
} 