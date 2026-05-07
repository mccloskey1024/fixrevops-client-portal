import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
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

    if (!adminSession) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', path)
      return NextResponse.redirect(loginUrl)
    }

    // Validate session (simple check - in production use JWT verification)
    try {
      const sessionData = JSON.parse(Buffer.from(adminSession, 'base64').toString('utf-8'))
      const expectedPassword = process.env.ADMIN_PASSWORD

      if (!expectedPassword || sessionData.password !== expectedPassword) {
        // Invalid session, redirect to login
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(loginUrl)
      }
    } catch {
      // Invalid session format, redirect to login
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
