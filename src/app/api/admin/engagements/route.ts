import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, name, status, startDate, targetEndDate, hubspotPortalId, linearProjectId } = body

    if (!clientId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, name' },
        { status: 400 }
      )
    }

    const engagement = await prisma.engagement.create({
      data: {
        clientId,
        name,
        status: status || 'planning',
        startDate: startDate ? new Date(startDate) : null,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
        hubspotPortalId,
        linearProjectId,
      },
    })

    return NextResponse.json(engagement)
  } catch (error) {
    console.error('Error creating engagement:', error)
    return NextResponse.json(
      { error: 'Failed to create engagement' },
      { status: 500 }
    )
  }
}
