import crypto from 'crypto-js'

const SECRET = process.env.MAGIC_LINK_SECRET || 'default-secret-change-in-production'

export function generateMagicLinkToken(): string {
  return crypto.lib.WordArray.random(32).toString(crypto.enc.Hex)
}

export function signMagicLinkToken(token: string): string {
  const timestamp = Date.now()
  const signature = crypto.HmacSHA256(`${token}:${timestamp}`, SECRET).toString(crypto.enc.Hex)
  return `${token}:${timestamp}:${signature}`
}

export function verifyMagicLinkToken(signedToken: string): { valid: boolean; token?: string } {
  try {
    const parts = signedToken.split(':')
    if (parts.length !== 3) return { valid: false }

    const [token, timestamp, signature] = parts
    const expectedSignature = crypto.HmacSHA256(`${token}:${timestamp}`, SECRET).toString(crypto.enc.Hex)

    if (signature !== expectedSignature) {
      return { valid: false }
    }

    // Check if token is expired (90 days = 7776000000 ms)
    const age = Date.now() - parseInt(timestamp, 10)
    if (age > 7776000000) {
      return { valid: false }
    }

    return { valid: true, token }
  } catch {
    return { valid: false }
  }
}

export function generateMagicLink(token: string): string {
  const signedToken = signMagicLinkToken(token)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/portal/${signedToken}`
}
