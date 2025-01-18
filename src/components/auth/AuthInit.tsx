'use client'

import { useAuthInit } from '@/hooks/useAuthInit'

interface AuthInitProps {
  children: React.ReactNode
}

export function AuthInit({ children }: AuthInitProps) {
  // Initialize auth
  useAuthInit()

  return <>{children}</>
} 