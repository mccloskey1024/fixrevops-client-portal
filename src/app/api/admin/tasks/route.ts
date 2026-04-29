import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { engagementId, title, description, type, status, dueDate, assignedTo } = body

    if (!engagementId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: engagementId, title' },
        { status: 400 }
      )
    }

    const task = await prisma.task.create({
      data: {
        engagementId,
        title,
        description,
        type: type || 'client_action',
        status: status || 'pending',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo,
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
