import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen flex bg-gray-900">
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
} 