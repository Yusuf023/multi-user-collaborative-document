import { Resend } from "resend"
import { env } from "../env"

const resend = new Resend(env.RESEND_API_KEY)

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

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: `You've been invited to collaborate on a document`,
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
