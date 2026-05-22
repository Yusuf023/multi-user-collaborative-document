import { and, eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { collaborators } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"
import { normalizeEmail } from "../../utils/auth"

export async function removeCollaborator(req: Request, res: Response) {
  const {
    email: requesterEmail,
    role: requesterRole,
    documentId
  } = (req as AuthenticatedRequest).auth
  const { email } = req.body
  const targetEmail = normalizeEmail(email)

  if (requesterRole !== "owner") {
    res.status(403).json({ error: "Only the owner can remove collaborators" })
    return
  }

  if (targetEmail === requesterEmail) {
    res.status(400).json({ error: "Cannot remove yourself" })
    return
  }

  const target = await db.query.collaborators.findFirst({
    where: and(eq(collaborators.documentId, documentId), eq(collaborators.email, targetEmail))
  })

  if (!target) {
    res.status(404).json({ error: "Collaborator not found" })
    return
  }

  if (target.role === "owner") {
    res.status(400).json({ error: "Cannot remove an owner" })
    return
  }

  await db
    .delete(collaborators)
    .where(and(eq(collaborators.documentId, documentId), eq(collaborators.email, targetEmail)))

  res.json({ success: true })
}
