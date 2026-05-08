import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicLinkToken } from '@/lib/magic-link'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  try {
    const { token: signedToken, id: taskId } = await params

    const blocked = enforceRateLimit(`portal:write:${signedToken}`, 10, 60_000)
    if (blocked) return blocked

    // Verify magic link
    const verification = verifyMagicLinkToken(signedToken)
    if (!verification.valid || !verification.token) {
      return NextResponse.json(
        { error: 'Invalid or expired magic link' },
        { status: 401 }
      )
    }

    // Find client
    const client = await prisma.client.findUnique({
      where: { magicLinkToken: verification.token },
      include: { 
        engagements: {
          include: { tasks: true }
        }
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Find task and verify it belongs to client's engagement
    const task = client.engagements
      .flatMap(e => e.tasks)
      .find(t => t.id === taskId)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Mark task as completed
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    )
  }
}
