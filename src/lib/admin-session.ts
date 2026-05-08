// Signed admin session tokens. Token attests "this user successfully logged in
// at time X" — it does NOT contain the password. Signed with MAGIC_LINK_SECRET
// (reused). An attacker who steals a cookie cannot forge a new one without the
// secret.
//
// Implementation note: uses Web Crypto (globalThis.crypto.subtle) so the same
// code runs in both the Node runtime (login/logout API routes) and the Edge
// runtime (Next.js middleware). Functions are async because Web Crypto is.

const SECRET_TEXT = process.env.MAGIC_LINK_SECRET || 'default-secret-change-in-production'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours, matches cookie maxAge

let _keyPromise: Promise<CryptoKey> | null = null
function getKey(): Promise<CryptoKey> {
  if (_keyPromise) return _keyPromise
  const enc = new TextEncoder()
  _keyPromise = crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET_TEXT),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
  return _keyPromise
}

function bytesToHex(buf: ArrayBuffer): string {
  const arr = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < arr.length; i++) {
    out += arr[i].toString(16).padStart(2, '0')
  }
  return out
}

// Returns a plain ArrayBuffer (not a Uint8Array view) to keep TypeScript happy
// when passing to crypto.subtle.verify, which wants a BufferSource where the
// underlying buffer is ArrayBuffer (not ArrayBufferLike).
function hexToArrayBuffer(hex: string): ArrayBuffer | null {
  if (hex.length === 0 || hex.length % 2 !== 0) return null
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null
  const buffer = new ArrayBuffer(hex.length / 2)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < view.length; i++) {
    view[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return buffer
}

export async function createAdminSessionToken(): Promise<string> {
  const timestamp = Date.now()
  const enc = new TextEncoder()
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`admin:${timestamp}`))
  return `${timestamp}:${bytesToHex(sig)}`
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const parts = token.split(':')
  if (parts.length !== 2) return false
  const [tsStr, signature] = parts

  const sigBuffer = hexToArrayBuffer(signature)
  if (!sigBuffer) return false

  const enc = new TextEncoder()
  const key = await getKey()
  // Web Crypto's verify does constant-time comparison internally
  const valid = await crypto.subtle.verify('HMAC', key, sigBuffer, enc.encode(`admin:${tsStr}`))
  if (!valid) return false

  const ts = parseInt(tsStr, 10)
  if (!Number.isFinite(ts)) return false
  if (Date.now() - ts > MAX_AGE_MS) return false
  return true
}
