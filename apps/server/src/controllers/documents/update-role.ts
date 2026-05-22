import { and, eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { collaborators } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"
import { normalizeEmail } from "../../utils/auth"

export async function updateRole(req: Request, res: Response) {
  const {
    email: requesterEmail,
    role: requesterRole,
    documentId
  } = (req as AuthenticatedRequest).auth
  const { email, role } = req.body
  const targetEmail = normalizeEmail(email)

  if (requesterRole !== "owner") {
    res.status(403).json({ error: "Only the owner can change roles" })
    return
  }

  if (targetEmail === requesterEmail) {
    res.status(400).json({ error: "Cannot change your own role" })
    return
  }

  // Verify target collaborator exists
  const target = await db.query.collaborators.findFirst({
    where: and(eq(collaborators.documentId, documentId), eq(collaborators.email, targetEmail))
  })

  if (!target) {
    res.status(404).json({ error: "Collaborator not found" })
    return
  }

  // Guard sole owner demotion
  if (target.role === "owner") {
    const ownerCount = await db.$count(
      collaborators,
      and(eq(collaborators.documentId, documentId), eq(collaborators.role, "owner"))
    )
    if (ownerCount <= 1) {
      res.status(400).json({ error: "Cannot demote the only owner" })
      return
    }
  }

  await db
    .update(collaborators)
    .set({ role })
    .where(and(eq(collaborators.documentId, documentId), eq(collaborators.email, targetEmail)))

  res.json({ success: true })
}
