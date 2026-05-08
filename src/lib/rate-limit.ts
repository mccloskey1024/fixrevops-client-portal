// In-memory token bucket rate limiter. Sufficient for our scale — a serverless
// instance stays warm between requests, so most casual abuse is caught.
// Gracefully degrades when instances cycle (state resets, attacker has to
// rebuild). For stricter cross-instance enforcement, swap to Vercel KV later.

import { NextResponse } from 'next/server'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

const MAX_TRACKED = 5_000 // upper bound on Map size before forced cleanup

function pruneExpired(now: number) {
  if (buckets.size < MAX_TRACKED) return
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k)
  }
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  pruneExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }
  bucket.count++
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt }
}

// Convenience: returns a 429 NextResponse if blocked, or null if allowed.
// Use at the top of a route handler:
//   const blocked = enforceRateLimit(`portal:read:${token}`, 60, 60_000)
//   if (blocked) return blocked
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const r = checkRateLimit(key, limit, windowMs)
  if (r.allowed) return null
  const retryAfterSec = Math.max(1, Math.ceil((r.resetAt - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(r.resetAt / 1000)),
      },
    }
  )
}
