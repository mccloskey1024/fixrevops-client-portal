import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicLinkToken } from '@/lib/magic-link'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: signedToken } = await params

    const blocked = enforceRateLimit(`portal:read:${signedToken}`, 60, 60_000)
    if (blocked) return blocked

    // Verify the magic link token
    const verification = verifyMagicLinkToken(signedToken)
    if (!verification.valid || !verification.token) {
      return NextResponse.json(
        { error: 'Invalid or expired magic link' },
        { status: 401 }
      )
    }

    // Find the client by token
    const client = await prisma.client.findUnique({
      where: { magicLinkToken: verification.token },
      include: {
        engagements: {
          include: {
            tasks: { orderBy: { createdAt: 'desc' } },
            files: { orderBy: { uploadedAt: 'desc' } },
            comments: {
              where: { isInternal: false },
              orderBy: { createdAt: 'asc' },
            },
            serviceRequests: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Filter out internal-only data for client view
    const clientData = {
      id: client.id,
      name: client.name,
      engagements: client.engagements.map((engagement) => ({
        id: engagement.id,
        name: engagement.name,
        status: engagement.status,
        startDate: engagement.startDate,
        targetEndDate: engagement.targetEndDate,
        // Expose linearProjectId presence (boolean) so the UI can show/hide
        // the New Request button. Don't leak the actual ID to the client.
        linearProjectConnected: Boolean(engagement.linearProjectId),
        tasks: engagement.tasks,
        files: engagement.files,
        comments: engagement.comments,
        serviceRequests: engagement.serviceRequests,
      })),
    }

    return NextResponse.json(clientData)
  } catch (error) {
    console.error('Error fetching portal data:', error)
    return NextResponse.json({ error: 'Failed to fetch portal data' }, { status: 500 })
  }
}
