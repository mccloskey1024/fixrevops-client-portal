import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateDealStage } from '@/lib/hubspot'

// Engagement statuses that should push a stage change to the linked HubSpot deal.
function dealStageForStatus(status: string): string | undefined {
  switch (status) {
    case 'completed':
      return process.env.HUBSPOT_DEAL_STAGE_WON || 'closedwon'
    case 'cancelled':
      return process.env.HUBSPOT_DEAL_STAGE_LOST || 'closedlost'
    default:
      return undefined
  }
}

export type HubspotSyncResult = {
  attempted: boolean
  ok?: boolean
  stage?: string
  error?: string
}

// PATCH /api/admin/engagements/[id] — update name/description/status/dates.
// When status transitions to completed/cancelled and the engagement has a
// linked HubSpot deal, the deal's stage is synced (closedwon/closedlost).
// Sync failures never fail the engagement update — they're reported in the
// response's `hubspotSync` field and logged.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, status, startDate, targetEndDate, hubspotPortalId, linearProjectId } = body

    const existing = await prisma.engagement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (targetEndDate !== undefined) updateData.targetEndDate = targetEndDate ? new Date(targetEndDate) : null
    if (hubspotPortalId !== undefined) updateData.hubspotPortalId = hubspotPortalId
    if (linearProjectId !== undefined) updateData.linearProjectId = linearProjectId

    const engagement = await prisma.engagement.update({ where: { id }, data: updateData })

    // Sync the linked HubSpot deal stage on a real status transition.
    let hubspotSync: HubspotSyncResult = { attempted: false }
    const targetStage =
      status !== undefined && status !== existing.status
        ? dealStageForStatus(status)
        : undefined
    if (targetStage && engagement.hubspotDealId) {
      const res = await updateDealStage(engagement.hubspotDealId, targetStage)
      hubspotSync = { attempted: true, ok: res.ok, stage: targetStage, error: res.error }
      if (!res.ok) {
        console.error('[HUBSPOT_SYNC] deal stage update failed:', {
          engagementId: id,
          dealId: engagement.hubspotDealId,
          targetStage,
          error: res.error,
        })
      }
    }

    return NextResponse.json({ ...engagement, hubspotSync })
  } catch (error) {
    console.error('Error updating engagement:', error)
    return NextResponse.json({ error: 'Failed to update engagement' }, { status: 500 })
  }
}

// DELETE /api/admin/engagements/[id] — cascade-delete tasks/files/comments/service requests first
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.$transaction([
      prisma.serviceRequest.deleteMany({ where: { engagementId: id } }),
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
