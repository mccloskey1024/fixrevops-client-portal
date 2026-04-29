import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple admin auth check - in production, replace with proper auth
  const adminToken = request.cookies.get('admin_token')?.value
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
  const isAdminApi = request.nextUrl.pathname.startsWith('/api/admin')

  if (isAdminPath || isAdminApi) {
    // Skip auth for now - TODO: implement proper admin authentication
    // For now, just log that auth is needed
    console.warn('Admin endpoint accessed without auth middleware - implement before production!')
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
