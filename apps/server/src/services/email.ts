import nodemailer from "nodemailer"
import { env } from "../env"
import { logger } from "./logger"

const log = logger.child({ component: "email" })

// No SMTP host configured means email sending is disabled (bare-metal demo
// without a mail relay). sendInviteEmail then just logs the would-be link.
const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    })
  : null

interface InviteEmailParams {
  to: string
  documentId: string
  token: string
  role: string
  invitedBy: string
}

export async function sendInviteEmail({
  to,
  documentId,
  token,
  role,
  invitedBy
}: InviteEmailParams) {
  const documentUrl = `${env.FRONTEND_URL}/${documentId}?email=${encodeURIComponent(to)}&token=${token}`

  if (!transport) {
    log.warn({ to, documentId, documentUrl }, "SMTP_HOST not set — skipping invite email")
    return
  }

  await transport.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: "You've been invited to collaborate on a document",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to collaborate</h2>
        <p><strong>${invitedBy}</strong> has invited you as a <strong>${role}</strong> to collaborate on a document.</p>
        <a href="${documentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #171717; color: #ffffff; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Open Document
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          Or copy this link: ${documentUrl}
        </p>
      </div>
    `
  })
}
