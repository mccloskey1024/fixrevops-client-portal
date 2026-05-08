import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listLinearIssues } from '@/lib/linear'

// GET /api/admin/engagements/[id]/linear-issues
// Admin's live view of an engagement's Linear project.
// Unlike the client portal, this returns EVERYTHING — including issues
// labeled "Internal" and any [ClientName]-prefixed mirrors of service requests.
// We do still filter out completed/cancelled so the panel stays readable.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const engagement = await prisma.engagement.findUnique({
      where: { id },
      select: { linearProjectId: true },
    })
    if (!engagement) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    if (!engagement.linearProjectId) {
      return NextResponse.json({ connected: false, issues: [] })
    }

    const result = await listLinearIssues({ projectId: engagement.linearProjectId })
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? 'Linear request failed' },
        { status: 502 }
      )
    }

    return NextResponse.json({ connected: true, issues: result.data ?? [] })
  } catch (err) {
    console.error('Error fetching admin Linear issues:', err)
    return NextResponse.json(
      { error: 'Failed to fetch Linear issues' },
      { status: 500 }
    )
  }
}
