// Email templates. Each function returns { subject, htmlContent, textContent }
// keyed for direct passing to sendEmail().

import type { SendEmailParams } from './email'

type WelcomeArgs = {
  clientName: string
  contactName: string
  magicLink: string
}

export function welcomeEmail({ clientName, contactName, magicLink }: WelcomeArgs): Pick<SendEmailParams, 'subject' | 'htmlContent' | 'textContent'> {
  const subject = `Your FixRevOps client portal is ready, ${contactName}`

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f7f7f9;color:#171717;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <h1 style="font-size:22px;margin:0 0 16px;">Hi ${escapeHtml(contactName)},</h1>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">
      Welcome aboard. I've set up a private portal for <strong>${escapeHtml(clientName)}</strong> where you can see project status, tasks, files, and message me directly — no login or password required.
    </p>
    <p style="font-size:15px;line-height:1.55;margin:0 0 24px;">
      Click below to open it. Bookmark the link — it's good for 90 days and gets you straight in.
    </p>
    <p style="margin:0 0 32px;">
      <a href="${magicLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-size:15px;">Open your portal</a>
    </p>
    <p style="font-size:13px;line-height:1.55;color:#525252;margin:0 0 8px;">
      If the button doesn't work, paste this URL into your browser:
    </p>
    <p style="font-size:12px;line-height:1.45;color:#525252;word-break:break-all;margin:0 0 32px;">
      ${escapeHtml(magicLink)}
    </p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
    <p style="font-size:13px;color:#737373;margin:0;">
      Shane McCloskey · FixRevOps · <a href="https://fixrevops.io" style="color:#737373;">fixrevops.io</a>
    </p>
  </div>
</body>
</html>`

  const textContent = `Hi ${contactName},

Welcome aboard. I've set up a private portal for ${clientName} where you can see project status, tasks, files, and message me directly — no login or password required.

Open your portal:
${magicLink}

Bookmark the link — it's good for 90 days and gets you straight in.

— Shane McCloskey
FixRevOps · https://fixrevops.io`

  return { subject, htmlContent, textContent }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
