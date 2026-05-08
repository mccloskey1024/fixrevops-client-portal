import crypto from 'crypto'

const SECRET = process.env.MAGIC_LINK_SECRET || 'default-secret-change-in-production'

export function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function signMagicLinkToken(token: string): string {
  const timestamp = Date.now()
  const signature = crypto.createHmac('sha256', SECRET).update(`${token}:${timestamp}`).digest('hex')
  return `${token}:${timestamp}:${signature}`
}

export function verifyMagicLinkToken(signedToken: string): { valid: boolean; token?: string } {
  try {
    const parts = signedToken.split(':')
    if (parts.length !== 3) return { valid: false }

    const [token, timestamp, signature] = parts
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(`${token}:${timestamp}`)
      .digest('hex')

    // Constant-time comparison to defeat timing attacks
    const sigBuf = Buffer.from(signature, 'hex')
    const expBuf = Buffer.from(expectedSignature, 'hex')
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
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
