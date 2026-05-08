// Thin wrapper around Brevo's transactional email API.
// https://developers.brevo.com/reference/sendtransacemail

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export type EmailRecipient = { email: string; name?: string }

export type SendEmailParams = {
  to: EmailRecipient | EmailRecipient[]
  subject: string
  htmlContent: string
  textContent?: string
  replyTo?: EmailRecipient
}

export type SendEmailResult = {
  ok: boolean
  messageId?: string
  error?: string
}

function getSender(): { name: string; email: string } {
  const email = process.env.BREVO_FROM_EMAIL || 'shane@fixrevops.io'
  const name = process.env.BREVO_FROM_NAME || 'FixRevOps'
  return { name, email }
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'BREVO_API_KEY not configured' }
  }

  const sender = getSender()
  const recipients = Array.isArray(params.to) ? params.to : [params.to]

  const body: Record<string, unknown> = {
    sender,
    to: recipients,
    subject: params.subject,
    htmlContent: params.htmlContent,
  }
  if (params.textContent) body.textContent = params.textContent
  if (params.replyTo) body.replyTo = params.replyTo

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Brevo ${res.status}: ${text.slice(0, 300)}` }
    }

    const data = await res.json().catch(() => ({})) as { messageId?: string }
    return { ok: true, messageId: data.messageId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown email error' }
  }
}
