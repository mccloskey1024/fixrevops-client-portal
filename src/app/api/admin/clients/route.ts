import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMagicLink } from '@/lib/magic-link'

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        engagements: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Attach the signed magic link URL to each client for the admin UI.
    // generateMagicLink signs with a fresh timestamp, so the link's 90-day
    // window resets each time the admin dashboard loads.
    const withLinks = clients.map((c) => ({
      ...c,
      magicLink: generateMagicLink(c.magicLinkToken),
    }))

    return NextResponse.json(withLinks)
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}
