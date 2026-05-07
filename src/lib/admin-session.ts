// Signed admin session tokens. The token attests "this user successfully
// logged in at time X" — it does NOT contain the password. Tokens are signed
// with MAGIC_LINK_SECRET (reused) so an attacker who steals a cookie cannot
// forge a new one without knowing the secret.

import crypto from 'crypto-js'

const SECRET = process.env.MAGIC_LINK_SECRET || 'default-secret-change-in-production'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours, matches cookie maxAge

export function createAdminSessionToken(): string {
  const timestamp = Date.now()
  const signature = crypto.HmacSHA256(`admin:${timestamp}`, SECRET).toString(crypto.enc.Hex)
  return `${timestamp}:${signature}`
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false
  const parts = token.split(':')
  if (parts.length !== 2) return false
  const [tsStr, signature] = parts
  const expected = crypto.HmacSHA256(`admin:${tsStr}`, SECRET).toString(crypto.enc.Hex)
  if (signature !== expected) return false
  const ts = parseInt(tsStr, 10)
  if (!Number.isFinite(ts)) return false
  if (Date.now() - ts > MAX_AGE_MS) return false
  return true
}
