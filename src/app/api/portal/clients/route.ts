import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMagicLinkToken, generateMagicLink } from '@/lib/magic-link'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/email-templates'

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

    // Fire the welcome email and log the result. Failure here does not roll back
    // client creation — the magic link is still copyable from the admin UI.
    const tpl = welcomeEmail({
      clientName: name,
      contactName: primaryContactName,
      magicLink,
    })

    const emailResult = await sendEmail({
      to: { email: primaryContactEmail, name: primaryContactName },
      ...tpl,
    })

    await prisma.notification.create({
      data: {
        type: 'email',
        template: 'welcome',
        recipient: primaryContactEmail,
        subject: tpl.subject,
        body: tpl.textContent ?? null,
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
