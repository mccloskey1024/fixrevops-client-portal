import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMagicLinkToken, generateMagicLink } from '@/lib/magic-link'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/email-templates'
import { createLinearProject } from '@/lib/linear'
import { recordOnboardedDeal } from '@/lib/hubspot'
import { getTemplate } from '@/lib/onboarding-templates'

// POST /api/admin/onboarding
// Body: { clientName, primaryContactName, primaryContactEmail, primaryContactPhone?, tier, engagementName? }
// Single endpoint that does ALL of:
//  1. Create Client (with magic link)
//  2. Create Linear project (named "<clientName> — <Tier>")
//  3. Create Engagement linked to that project, with seed tasks from the tier template
//  4. Create HubSpot contact + deal in the configured pipeline/stage
//  5. Send welcome email
// Returns a step-by-step status report so the UI can show what worked / what didn't.
//
// Failure modes are non-fatal where possible: Linear or HubSpot failure does
// not roll back the client/engagement, since the magic link is still useful.
// The response surfaces the error per step so admin can complete manually.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientName,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      tier,
      engagementName: overrideName,
    } = body as {
      clientName?: string
      primaryContactName?: string
      primaryContactEmail?: string
      primaryContactPhone?: string
      tier?: string
      engagementName?: string
    }

    if (!clientName?.trim() || !primaryContactName?.trim() || !primaryContactEmail?.trim() || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, primaryContactName, primaryContactEmail, tier' },
        { status: 400 }
      )
    }

    const template = getTemplate(tier)
    if (!template) {
      return NextResponse.json(
        { error: `Unknown tier "${tier}". Expected: audit, project, retainer.` },
        { status: 400 }
      )
    }

    const teamId = process.env.LINEAR_TEAM_ID
    if (!teamId) {
      return NextResponse.json({ error: 'LINEAR_TEAM_ID not configured' }, { status: 500 })
    }

    const steps: Record<string, { ok: boolean; detail?: string; error?: string }> = {}

    // 1) Create the client + magic link
    const token = generateMagicLinkToken()
    const magicLink = generateMagicLink(token)
    const magicLinkExpiresAt = new Date(Date.now() + 7776000000) // 90 days

    const client = await prisma.client.create({
      data: {
        name: clientName.trim(),
        primaryContactName: primaryContactName.trim(),
        primaryContactEmail: primaryContactEmail.trim(),
        primaryContactPhone: primaryContactPhone?.trim() || null,
        magicLinkToken: token,
        magicLinkExpiresAt,
      },
    })
    steps.client = { ok: true, detail: client.id }

    // 2) Create the Linear project
    const engagementName = (overrideName?.trim() || `${client.name} — ${template.label}`).slice(0, 100)
    const linearProjectName = engagementName
    const linearResult = await createLinearProject({
      name: linearProjectName,
      description: template.engagementDescription,
      teamId,
    })
    let linearProjectId: string | null = null
    if (linearResult.ok && linearResult.data) {
      linearProjectId = linearResult.data.id
      steps.linearProject = { ok: true, detail: linearResult.data.url }
    } else {
      steps.linearProject = { ok: false, error: linearResult.error }
    }

    // 3) Create the engagement with seed tasks
    const engagement = await prisma.engagement.create({
      data: {
        clientId: client.id,
        name: engagementName,
        description: template.engagementDescription,
        tier: template.tier,
        status: 'planning',
        linearProjectId,
        startDate: new Date(),
      },
    })
    await prisma.task.createMany({
      data: template.seedTasks.map((t) => ({
        engagementId: engagement.id,
        title: t.title,
        description: t.description ?? null,
        type: t.type ?? 'client_action',
        status: 'pending',
      })),
    })
    steps.engagement = { ok: true, detail: `${engagement.id} (${template.seedTasks.length} tasks seeded)` }

    // 4) HubSpot deal + contact
    const hsResult = await recordOnboardedDeal({
      clientName: client.name,
      contactName: client.primaryContactName,
      contactEmail: client.primaryContactEmail,
      contactPhone: client.primaryContactPhone || undefined,
      tierLabel: template.label,
    })
    let hubspotDealId: string | null = null
    if (hsResult.ok && hsResult.data) {
      hubspotDealId = hsResult.data.dealId
      await prisma.engagement.update({
        where: { id: engagement.id },
        data: { hubspotDealId },
      })
      steps.hubspotDeal = { ok: true, detail: `dealId=${hubspotDealId} contactId=${hsResult.data.contactId}` }
    } else {
      steps.hubspotDeal = { ok: false, error: hsResult.error }
    }

    // 5) Welcome email
    const tpl = welcomeEmail({
      clientName: client.name,
      contactName: client.primaryContactName,
      magicLink,
    })
    const emailResult = await sendEmail({
      to: { email: client.primaryContactEmail, name: client.primaryContactName },
      ...tpl,
    })
    await prisma.notification
      .create({
        data: {
          type: 'email',
          template: 'welcome',
          recipient: client.primaryContactEmail,
          subject: tpl.subject,
          body: emailResult.ok ? (tpl.textContent ?? null) : `BREVO_ERROR: ${emailResult.error || 'unknown'}`,
          sentAt: emailResult.ok ? new Date() : null,
          status: emailResult.ok ? 'sent' : 'failed',
        },
      })
      .catch((e) => console.error('Notification log failed:', e))
    steps.welcomeEmail = emailResult.ok
      ? { ok: true, detail: emailResult.messageId }
      : { ok: false, error: emailResult.error }

    return NextResponse.json({
      client: { id: client.id, name: client.name },
      engagement: { id: engagement.id, name: engagement.name, tier: template.tier, tasksSeeded: template.seedTasks.length },
      magicLink,
      linearProjectId,
      linearProjectUrl: linearResult.ok ? linearResult.data?.url : null,
      hubspotDealId,
      steps,
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Onboarding failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
