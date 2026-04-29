import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMagicLinkToken, generateMagicLink } from '@/lib/magic-link'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, primaryContactName, primaryContactEmail, primaryContactPhone } = body

    if (!name || !primaryContactName || !primaryContactEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: name, primaryContactName, primaryContactEmail' },
        { status: 400 }
      )
    }

    const token = generateMagicLinkToken()
    const magicLink = generateMagicLink(token)
    const magicLinkExpiresAt = new Date(Date.now() + 7776000000) // 90 days

    const client = await prisma.client.create({
      data: {
        name,
        primaryContactName,
        primaryContactEmail,
        primaryContactPhone,
        magicLinkToken: token,
        magicLinkExpiresAt,
      },
    })

    return NextResponse.json({
      id: client.id,
      name: client.name,
      magicLink,
      expiresAt: client.magicLinkExpiresAt,
    })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}
