import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMagicLink } from '@/lib/magic-link'

// GET /api/admin/clients/[id] — full client with engagements, tasks, files, comments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        engagements: {
          orderBy: { createdAt: 'desc' },
          include: {
            tasks: { orderBy: { createdAt: 'desc' } },
            files: { orderBy: { uploadedAt: 'desc' } },
            comments: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...client,
      magicLink: generateMagicLink(client.magicLinkToken),
    })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}

// DELETE /api/admin/clients/[id] — fully cascades engagements/tasks/files/comments
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Find all engagements for the client so we can purge their children
    const engagements = await prisma.engagement.findMany({
      where: { clientId: id },
      select: { id: true },
    })
    const engagementIds = engagements.map((e) => e.id)

    await prisma.$transaction([
      prisma.task.deleteMany({ where: { engagementId: { in: engagementIds } } }),
      prisma.file.deleteMany({ where: { engagementId: { in: engagementIds } } }),
      prisma.comment.deleteMany({ where: { engagementId: { in: engagementIds } } }),
      prisma.engagement.deleteMany({ where: { clientId: id } }),
      prisma.client.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true, deletedEngagements: engagementIds.length })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}
