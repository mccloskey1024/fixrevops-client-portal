import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMagicLinkToken, generateMagicLink } from '@/lib/magic-link'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/email-templates'
import { createLinearProject, createLinearIssue } from '@/lib/linear'
import { recordOnboardedDeal } from '@/lib/hubspot'
import { getTemplate } from '@/lib/onboarding-templates'

// POST /api/admin/onboarding
// Body: { clientName, primaryContactName, primaryContactEmail, primaryContactPhone?, tier, engagementName? }
// Single endpoint that does ALL of:
//  1. Create Client (with magic link)
//  2. Create Linear project (named "<clientName> — <Tier>")
//  3. Create Engagement with seed work split by type:
//       • client_action tasks  → DB rows (interactive client checkboxes)
//       • milestone / internal → Linear issues in the new project
//  4. Create HubSpot contact + deal in the configured pipeline/stage
//  5. Create HubSpot Project at Onboarding stage and associate to Deal + Contact
//     (Project ID surfaces in the wizard's response only — not persisted in DB,
//     so we don't need a Prisma migration. Admin can find the Project by
//     searching HubSpot for the client name if they need to.)
//  6. Send welcome email
// Returns a step-by-step status report so the UI can show what worked / what didn't.
//
// Failure modes are non-fatal where possible: Linear, HubSpot, or Project
// failure does not roll back the client/engagement, since the magic link is
// still useful.
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

    // 3) Create the engagement, split seed tasks by destination
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

    // 3a) DB tasks: only client_action items (interactive client checkboxes)
    const clientActionTasks = template.seedTasks.filter(
      (t) => (t.type ?? 'client_action') === 'client_action'
    )
    if (clientActionTasks.length > 0) {
      await prisma.task.createMany({
        data: clientActionTasks.map((t) => ({
          engagementId: engagement.id,
          title: t.title,
          description: t.description ?? null,
          type: 'client_action',
          status: 'pending',
        })),
      })
    }
    steps.engagement = {
      ok: true,
      detail: `${engagement.id} (${clientActionTasks.length} client task(s) seeded)`,
    }

    // 3b) Linear issues: anything else (milestone / internal) goes into the project
    const linearSeedTasks = template.seedTasks.filter(
      (t) => (t.type ?? 'client_action') !== 'client_action'
    )
    if (linearSeedTasks.length > 0) {
      if (!linearProjectId) {
        steps.linearMilestones = {
          ok: false,
          error: `Skipped — Linear project creation failed, ${linearSeedTasks.length} milestone(s) not seeded`,
        }
      } else {
        const projectIdForIssues = linearProjectId
        const results = await Promise.all(
          linearSeedTasks.map((t) =>
            createLinearIssue({
              title: t.title,
              description: t.description ?? null,
              projectId: projectIdForIssues,
              teamId,
            })
          )
        )
        const created = results.filter((r) => r.ok).length
        const failed = results.length - created
        const failureMessages = results
          .filter((r) => !r.ok && r.error)
          .map((r) => r.error)
          .join('; ')
          .slice(0, 200)
        steps.linearMilestones =
          failed === 0
            ? { ok: true, detail: `${created} milestone issue(s) created in Linear` }
            : {
                ok: false,
                error: `${created}/${linearSeedTasks.length} created. Failed: ${failureMessages}`,
              }
      }
    }

    // 4) HubSpot deal + contact (+ optional Project at Onboarding stage,
    //    associated to Deal + Contact). Project failure is non-fatal and the
    //    project ID is only surfaced in the response — not persisted in our DB.
    const hsResult = await recordOnboardedDeal({
      clientName: client.name,
      contactName: client.primaryContactName,
      contactEmail: client.primaryContactEmail,
      contactPhone: client.primaryContactPhone || undefined,
      tierLabel: template.label,
    })
    let hubspotDealId: string | null = null
    let hubspotProjectId: string | null = null
    if (hsResult.ok && hsResult.data) {
      hubspotDealId = hsResult.data.dealId
      hubspotProjectId = hsResult.data.projectId ?? null
      await prisma.engagement.update({
        where: { id: engagement.id },
        data: {
          hubspotDealId,
        },
      })
      steps.hubspotDeal = { ok: true, detail: `dealId=${hubspotDealId} contactId=${hsResult.data.contactId}` }
      if (hubspotProjectId) {
        steps.hubspotProject = hsResult.data.projectError
          ? { ok: false, error: hsResult.data.projectError }
          : { ok: true, detail: `projectId=${hubspotProjectId}` }
      } else if (hsResult.data.projectError) {
        steps.hubspotProject = { ok: false, error: hsResult.data.projectError }
      }
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
      engagement: {
        id: engagement.id,
        name: engagement.name,
        tier: template.tier,
        clientTasksSeeded: clientActionTasks.length,
        linearMilestonesSeeded: linearSeedTasks.length,
      },
      magicLink,
      linearProjectId,
      linearProjectUrl: linearResult.ok ? linearResult.data?.url : null,
      hubspotDealId,
      hubspotProjectId,
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
