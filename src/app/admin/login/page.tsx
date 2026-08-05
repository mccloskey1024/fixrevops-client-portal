'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        // Set session cookie and redirect
        router.push(redirect)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.message || 'Invalid password')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-lg">
      <h1 className="mb-1 text-xl font-bold tracking-tight text-neutral-900">
        Admin login
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Enter your password to manage clients.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-[#F5A623] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40"
            required
            autoFocus
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-lg bg-[#F5A623] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0D] px-4">
      <div className="mb-8">
        <Logo size="lg" theme="dark" />
      </div>
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 shadow-lg">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
