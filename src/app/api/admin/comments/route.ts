import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { engagementId, author, authorName, content, isInternal } = body

    if (!engagementId || !author || !authorName || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: engagementId, author, authorName, content' },
        { status: 400 }
      )
    }

    const comment = await prisma.comment.create({
      data: {
        engagementId,
        author, // "client" or "internal"
        authorName,
        content,
        isInternal: isInternal || false,
      },
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
