import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicLinkToken } from '@/lib/magic-link'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: signedToken } = await params

    const blocked = enforceRateLimit(`portal:write:${signedToken}`, 10, 60_000)
    if (blocked) return blocked

    const body = await request.json()
    const { engagementId, authorName, content } = body

    if (!engagementId || !authorName || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: engagementId, authorName, content' },
        { status: 400 }
      )
    }

    // Verify magic link
    const verification = verifyMagicLinkToken(signedToken)
    if (!verification.valid || !verification.token) {
      return NextResponse.json(
        { error: 'Invalid or expired magic link' },
        { status: 401 }
      )
    }

    // Find client and verify engagement belongs to them
    const client = await prisma.client.findUnique({
      where: { magicLinkToken: verification.token },
      include: { engagements: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const engagement = client.engagements.find(e => e.id === engagementId)
    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    // Create comment (client comments are never internal)
    const comment = await prisma.comment.create({
      data: {
        engagementId,
        author: 'client',
        authorName,
        content,
        isInternal: false,
      },
    })

    return NextResponse.json(comment)
  } catch (error: unknown) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
