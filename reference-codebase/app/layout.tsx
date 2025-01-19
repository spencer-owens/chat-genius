'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider } from '@/components/ui/sidebar'
import Sidebar from './components/Sidebar'
import { getSupabase } from './auth'
import { Notification } from './components/Notification'
import { useUser } from './hooks/useUser'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: isLoading, fetchUser } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabase()

  useEffect(() => {
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchUser()
      }
      
      // Handle auth state changes
      if (session) {
        const tourStage = localStorage.getItem('tour_stage')
        if (!tourStage && !pathname?.startsWith('/channel/ba3a0cd2-ed05-4f8b-9586-3c1dda9d6338')) {
          localStorage.setItem('tour_stage', '1')
          router.replace('/channel/ba3a0cd2-ed05-4f8b-9586-3c1dda9d6338?tourStep=1')
          return
        }

        if (pathname === '/profile/login' || pathname === '/profile/signup') {
          router.replace('/')
        }
      } else if (!pathname?.startsWith('/profile/login') && !pathname?.startsWith('/profile/signup')) {
        router.replace('/profile/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname])

  if (isLoading) {
    return (
      <html lang="en">
        <body>
          <div className="flex items-center justify-center min-h-screen">
            Loading...
          </div>
        </body>
      </html>
    )
  }

  // Don't show sidebar on login/signup pages
  if (pathname === '/profile/login' || pathname === '/profile/signup') {
    return (
      <html lang="en">
        <body>
          <Notification />
          {children}
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body>
        <Notification />
        <SidebarProvider>
          <div className="flex h-screen">
            {user && <Sidebar />}
            <main className="flex-1 overflow-auto min-w-[85vw]">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  )
}