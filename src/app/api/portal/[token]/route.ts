import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicLinkToken } from '@/lib/magic-link'
import { enforceRateLimit } from '@/lib/rate-limit'
import { listLinearIssues, type LinearIssueListItem } from '@/lib/linear'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: signedToken } = await params

    const blocked = enforceRateLimit(`portal:read:${signedToken}`, 60, 60_000)
    if (blocked) return blocked

    const verification = verifyMagicLinkToken(signedToken)
    if (!verification.valid || !verification.token) {
      return NextResponse.json(
        { error: 'Invalid or expired magic link' },
        { status: 401 }
      )
    }

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

    // Fetch live Linear issues for each engagement that's connected to a project,
    // in parallel. Failures fall through silently — we just won't show that section.
    const clientNamePrefix = `[${client.name}]`
    const linearIssuesByEngagement: Record<string, LinearIssueListItem[]> = {}
    await Promise.all(
      client.engagements.map(async (e) => {
        if (!e.linearProjectId) return
        const result = await listLinearIssues({ projectId: e.linearProjectId })
        if (!result.ok || !result.data) {
          linearIssuesByEngagement[e.id] = []
          return
        }
        // Hide issues that are mirrors of this client's own service requests —
        // those are already surfaced in the "Requests" section.
        // Also hide anything labeled "Internal" — internal Dijitlcraft/FixRevOps work
        // that the client doesn't need to see.
        linearIssuesByEngagement[e.id] = result.data.filter(
          (i) =>
            !i.title.startsWith(clientNamePrefix) &&
            !i.labels.includes('Internal')
        )
      })
    )

    const clientData = {
      id: client.id,
      name: client.name,
      engagements: client.engagements.map((engagement) => ({
        id: engagement.id,
        name: engagement.name,
        status: engagement.status,
        startDate: engagement.startDate,
        targetEndDate: engagement.targetEndDate,
        linearProjectConnected: Boolean(engagement.linearProjectId),
        tasks: engagement.tasks,
        files: engagement.files,
        comments: engagement.comments,
        serviceRequests: engagement.serviceRequests,
        linearIssues: linearIssuesByEngagement[engagement.id] ?? [],
      })),
    }

    return NextResponse.json(clientData)
  } catch (error) {
    console.error('Error fetching portal data:', error)
    return NextResponse.json({ error: 'Failed to fetch portal data' }, { status: 500 })
  }
}
