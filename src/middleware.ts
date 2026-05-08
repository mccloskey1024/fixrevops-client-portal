import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAdminSessionToken } from '@/lib/admin-session'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isAdminPath = path.startsWith('/admin')
  const isAdminApi = path.startsWith('/api/admin')
  const isLoginPath = path === '/admin/login'
  const isLoginApi = path === '/api/admin/login'

  // Allow login page and login API through unauthenticated
  if (isLoginPath || isLoginApi) {
    return NextResponse.next()
  }

  // Check admin auth for /admin routes and /api/admin routes
  if (isAdminPath || isAdminApi) {
    const adminSession = request.cookies.get('admin_session')?.value

    if (!(await verifyAdminSessionToken(adminSession))) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', path)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
