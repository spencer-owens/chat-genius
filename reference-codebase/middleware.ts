import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('🔒 Middleware - Start', {
    pathname: req.nextUrl.pathname,
    timestamp: new Date().toISOString()
  })

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Just refresh the session if it exists
  await supabase.auth.getSession()

  console.log('🔒 Middleware - Complete', {
    pathname: req.nextUrl.pathname,
    timestamp: new Date().toISOString()
  })

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

