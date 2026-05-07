import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/engagements/[id] — update name/description/status/dates
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, status, startDate, targetEndDate, hubspotPortalId, linearProjectId } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (targetEndDate !== undefined) updateData.targetEndDate = targetEndDate ? new Date(targetEndDate) : null
    if (hubspotPortalId !== undefined) updateData.hubspotPortalId = hubspotPortalId
    if (linearProjectId !== undefined) updateData.linearProjectId = linearProjectId

    const engagement = await prisma.engagement.update({ where: { id }, data: updateData })
    return NextResponse.json(engagement)
  } catch (error) {
    console.error('Error updating engagement:', error)
    return NextResponse.json({ error: 'Failed to update engagement' }, { status: 500 })
  }
}

// DELETE /api/admin/engagements/[id] — cascade-delete tasks/files/comments first
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { engagementId: id } }),
      prisma.file.deleteMany({ where: { engagementId: id } }),
      prisma.comment.deleteMany({ where: { engagementId: id } }),
      prisma.engagement.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting engagement:', error)
    return NextResponse.json({ error: 'Failed to delete engagement' }, { status: 500 })
  }
}
