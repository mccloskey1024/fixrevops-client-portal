import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMagicLinkToken, generateMagicLink } from '@/lib/magic-link'

// POST /api/admin/clients/[id]/rotate-link
// Issues a fresh magic-link token for a client. The OLD token is overwritten,
// so any URL containing it stops resolving. Use when a link is suspected to
// have leaked or when extending a near-expiry client.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const newToken = generateMagicLinkToken()
    const newExpiresAt = new Date(Date.now() + 7776000000) // 90 days

    const client = await prisma.client.update({
      where: { id },
      data: {
        magicLinkToken: newToken,
        magicLinkExpiresAt: newExpiresAt,
      },
    })

    return NextResponse.json({
      id: client.id,
      magicLink: generateMagicLink(newToken),
      expiresAt: client.magicLinkExpiresAt,
    })
  } catch (error) {
    console.error('Error rotating magic link:', error)
    return NextResponse.json({ error: 'Failed to rotate magic link' }, { status: 500 })
  }
}
