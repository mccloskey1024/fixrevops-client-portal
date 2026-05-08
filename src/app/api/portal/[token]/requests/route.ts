import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicLinkToken } from '@/lib/magic-link'
import { enforceRateLimit } from '@/lib/rate-limit'
import { createLinearIssue } from '@/lib/linear'

// POST /api/portal/[token]/requests
// Body: { engagementId, title, description?, submittedBy? }
// Creates a Linear issue in the engagement's linearProjectId, then persists
// a local ServiceRequest row referencing the Linear issue identifier + url.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: signedToken } = await params

    const blocked = enforceRateLimit(`portal:write:${signedToken}`, 10, 60_000)
    if (blocked) return blocked

    const verification = verifyMagicLinkToken(signedToken)
    if (!verification.valid || !verification.token) {
      return NextResponse.json({ error: 'Invalid or expired magic link' }, { status: 401 })
    }

    const body = await request.json()
    const { engagementId, title, description, submittedBy } = body as {
      engagementId?: string
      title?: string
      description?: string
      submittedBy?: string
    }

    if (!engagementId || !title?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: engagementId, title' },
        { status: 400 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { magicLinkToken: verification.token },
      include: { engagements: true },
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const engagement = client.engagements.find((e) => e.id === engagementId)
    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }
    if (!engagement.linearProjectId) {
      return NextResponse.json(
        { error: "This engagement isn't connected to Linear yet. Please contact your account manager." },
        { status: 400 }
      )
    }

    const teamId = process.env.LINEAR_TEAM_ID
    if (!teamId) {
      console.error('LINEAR_TEAM_ID not configured')
      return NextResponse.json({ error: 'Server misconfiguration: LINEAR_TEAM_ID missing' }, { status: 500 })
    }

    const submitter = (submittedBy && submittedBy.trim()) || client.primaryContactName

    const issueResult = await createLinearIssue({
      title: `[${client.name}] ${title.trim()}`,
      description: [
        `**Submitted by:** ${submitter}`,
        `**Engagement:** ${engagement.name}`,
        `**Submitted:** ${new Date().toISOString()}`,
        '',
        '---',
        '',
        description?.trim() || '_(no description)_',
      ].join('\n'),
      projectId: engagement.linearProjectId,
      teamId,
    })

    if (!issueResult.ok) {
      console.error('[LINEAR_FAIL]', { engagement: engagement.id, error: issueResult.error })
      return NextResponse.json(
        { error: `Failed to create Linear issue: ${issueResult.error}` },
        { status: 502 }
      )
    }

    const issue = issueResult.data

    const dbRequest = await prisma.serviceRequest.create({
      data: {
        engagementId,
        title: title.trim(),
        description: description?.trim() || null,
        submittedBy: submitter,
        status: 'submitted',
        linearIssueId: issue?.identifier || null,
        linearIssueUrl: issue?.url || null,
      },
    })

    return NextResponse.json({
      id: dbRequest.id,
      title: dbRequest.title,
      description: dbRequest.description,
      submittedBy: dbRequest.submittedBy,
      status: dbRequest.status,
      linearIssueId: dbRequest.linearIssueId,
      linearIssueUrl: dbRequest.linearIssueUrl,
      createdAt: dbRequest.createdAt,
    })
  } catch (error) {
    console.error('Error creating service request:', error)
    return NextResponse.json({ error: 'Failed to create service request' }, { status: 500 })
  }
}
