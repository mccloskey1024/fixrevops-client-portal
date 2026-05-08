import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicLinkToken } from '@/lib/magic-link'
import { enforceRateLimit } from '@/lib/rate-limit'

// POST /api/portal/[token]/tasks/[id]/complete
// Toggles a `client_action` task between completed and pending.
// Body (optional): { completed: boolean } — explicitly set status. If omitted,
// flips the current status. Returns the updated task.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  try {
    const { token: signedToken, id: taskId } = await params

    const blocked = enforceRateLimit(`portal:write:${signedToken}`, 10, 60_000)
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
        engagements: { include: { tasks: true } },
      },
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const task = client.engagements.flatMap((e) => e.tasks).find((t) => t.id === taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only `client_action` tasks are toggleable from the client side.
    // Internal / milestone tasks stay admin-only.
    if (task.type !== 'client_action') {
      return NextResponse.json(
        { error: 'This task is not client-actionable.' },
        { status: 403 }
      )
    }

    let body: { completed?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // empty body → toggle behavior
    }

    const targetCompleted =
      typeof body.completed === 'boolean'
        ? body.completed
        : task.status !== 'completed'

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: targetCompleted ? 'completed' : 'pending',
        completedAt: targetCompleted ? new Date() : null,
      },
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error toggling task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
