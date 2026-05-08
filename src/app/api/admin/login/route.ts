import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminSessionToken } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 })
    }

    const expectedPassword = process.env.ADMIN_PASSWORD

    if (!expectedPassword) {
      console.error('ADMIN_PASSWORD not configured')
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 })
    }

    if (password !== expectedPassword) {
      return NextResponse.json({ message: 'Invalid password' }, { status: 401 })
    }

    // Issue a signed session token (timestamp+HMAC). Password is NOT in cookie.
    const sessionToken = await createAdminSessionToken()

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 })
  }
}
