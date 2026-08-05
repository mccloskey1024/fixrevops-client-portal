import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMagicLink, generateMagicLinkToken } from '@/lib/magic-link'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/email-templates'

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

// POST /api/admin/clients — quick-add a client + magic link + welcome email.
// Moved here from /api/portal/clients, which sat outside the admin middleware
// and was therefore callable without authentication.
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

    const tpl = welcomeEmail({
      clientName: name,
      contactName: primaryContactName,
      magicLink,
    })

    const emailResult = await sendEmail({
      to: { email: primaryContactEmail, name: primaryContactName },
      ...tpl,
    })

    // Loud-log to Vercel runtime logs for debugging deliverability issues
    if (!emailResult.ok) {
      console.error('[BREVO_FAIL]', {
        recipient: primaryContactEmail,
        from: process.env.BREVO_FROM_EMAIL || 'shane@fixrevops.io',
        error: emailResult.error,
      })
    } else {
      console.log('[BREVO_OK]', { messageId: emailResult.messageId, recipient: primaryContactEmail })
    }

    // Persist enough to debug after the fact: success → text body, failure → error string
    await prisma.notification.create({
      data: {
        type: 'email',
        template: 'welcome',
        recipient: primaryContactEmail,
        subject: tpl.subject,
        body: emailResult.ok
          ? (tpl.textContent ?? null)
          : `BREVO_ERROR: ${emailResult.error || 'unknown'}`,
        sentAt: emailResult.ok ? new Date() : null,
        status: emailResult.ok ? 'sent' : 'failed',
      },
    }).catch((e) => console.error('Notification log failed:', e))

    return NextResponse.json({
      id: client.id,
      name: client.name,
      magicLink,
      expiresAt: client.magicLinkExpiresAt,
      email: {
        sent: emailResult.ok,
        error: emailResult.error,
      },
    })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
