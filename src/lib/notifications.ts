// Admin notifications: email Shane when a client acts in the portal, and
// record each attempt as a Notification row for auditability.
//
// Callers should invoke this inside `after(...)` from 'next/server' so the
// email send never blocks (or fails) the client-facing response.

import { prisma } from './prisma'
import { sendEmail } from './email'
import { adminNotificationEmail } from './email-templates'

export type AdminNotificationType =
  | 'service_request'
  | 'task_completed'
  | 'client_message'

export type NotifyAdminArgs = {
  type: AdminNotificationType
  engagementId?: string
  taskId?: string
  heading: string
  lines: Array<{ label: string; value: string }>
  excerpt?: string
  ctaUrl?: string
  ctaLabel?: string
}

function getAdminRecipient(): string {
  return (
    process.env.ADMIN_NOTIFY_EMAIL ||
    process.env.BREVO_FROM_EMAIL ||
    'shane@fixrevops.io'
  )
}

// Never throws — notification failures are logged (and recorded on the
// Notification row) but must never break the portal action that triggered them.
export async function notifyAdmin(args: NotifyAdminArgs): Promise<void> {
  const recipient = getAdminRecipient()
  const email = adminNotificationEmail({
    heading: args.heading,
    lines: args.lines,
    excerpt: args.excerpt,
    ctaUrl: args.ctaUrl,
    ctaLabel: args.ctaLabel,
  })

  let notificationId: string | null = null
  try {
    const row = await prisma.notification.create({
      data: {
        engagementId: args.engagementId ?? null,
        taskId: args.taskId ?? null,
        type: args.type,
        template: 'admin-notification',
        recipient,
        subject: email.subject,
        body: email.textContent ?? null,
        status: 'pending',
      },
    })
    notificationId = row.id
  } catch (err) {
    // DB write failed — still attempt the email, just without the audit row.
    console.error('[NOTIFY] failed to create Notification row:', err)
  }

  try {
    const result = await sendEmail({
      to: { email: recipient },
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent,
    })

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: result.ok
          ? { status: 'sent', sentAt: new Date() }
          : { status: 'failed' },
      })
    }
    if (!result.ok) {
      console.error('[NOTIFY] email send failed:', result.error)
    }
  } catch (err) {
    console.error('[NOTIFY] unexpected error sending notification:', err)
    if (notificationId) {
      await prisma.notification
        .update({ where: { id: notificationId }, data: { status: 'failed' } })
        .catch(() => {})
    }
  }
}

export function adminClientUrl(clientId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.fixrevops.io'
  return `${base}/admin/clients/${clientId}`
}
