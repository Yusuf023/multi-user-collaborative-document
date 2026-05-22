import { COLLABORATION_COLORS } from "@collab/shared"
import { eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { collaborators, documents } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"
import { sendInviteEmail } from "../../services/email"
import { normalizeEmail } from "../../utils/auth"

export async function inviteUsers(req: Request, res: Response) {
  const { email: inviterEmail, role: inviterRole, documentId } = (req as AuthenticatedRequest).auth
  const { invites, sendEmail } = req.body

  if (inviterRole !== "owner" && inviterRole !== "editor") {
    res.status(403).json({ error: "You do not have permission to invite users" })
    return
  }

  const document = await db.query.documents.findFirst({
    where: eq(documents.id, documentId)
  })

  if (!document) {
    res.status(404).json({ error: "Document not found" })
    return
  }

  const existingCollaborators = await db.query.collaborators.findMany({
    where: eq(collaborators.documentId, documentId)
  })

  const newCollaborators: { id: string; email: string }[] = []

  for (let i = 0; i < invites.length; i++) {
    const invite = invites[i]
    const inviteEmail = normalizeEmail(invite.email)

    // Skip if already a collaborator
    const existing = existingCollaborators.find((c) => c.email === inviteEmail)
    if (existing) continue

    const colorIndex =
      (existingCollaborators.length + newCollaborators.length) % COLLABORATION_COLORS.length
    const color = COLLABORATION_COLORS[colorIndex]

    try {
      const [created] = await db
        .insert(collaborators)
        .values({
          documentId,
          email: inviteEmail,
          role: invite.role,
          color
        })
        .returning()

      newCollaborators.push(created)
    } catch (err: unknown) {
      // Handle unique constraint violation (concurrent invite)
      // Postgres error code 23505 = unique_violation
      const pgCode = (err as { code?: string }).code
      if (pgCode === "23505") {
        continue
      }
      throw err
    }

    if (sendEmail) {
      try {
        await sendInviteEmail({
          to: inviteEmail,
          documentId,
          token: document.token,
          role: invite.role,
          invitedBy: inviterEmail
        })
      } catch (err) {
        console.error(`Failed to send invite email to ${inviteEmail}:`, err)
      }
    }
  }

  const allCollaborators = await db.query.collaborators.findMany({
    where: eq(collaborators.documentId, documentId)
  })

  res.json({
    collaborators: allCollaborators.map((c) => ({
      email: c.email,
      role: c.role,
      color: c.color,
      joinedAt: c.joinedAt.toISOString()
    }))
  })
}
