import { and, eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { collaborators, documents } from "../../db/schema"
import { normalizeEmail } from "../../utils/auth"

export async function joinDocument(req: Request, res: Response) {
  const { documentId, token } = req.body
  const email = normalizeEmail(req.body.email)

  const document = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.token, token))
  })

  if (!document) {
    res.status(404).json({ error: "Document not found or invalid token" })
    return
  }

  const collaborator = await db.query.collaborators.findFirst({
    where: and(eq(collaborators.documentId, documentId), eq(collaborators.email, email))
  })

  if (!collaborator) {
    res.status(403).json({ error: "You do not have access to this document" })
    return
  }

  const allCollaborators = await db.query.collaborators.findMany({
    where: eq(collaborators.documentId, documentId)
  })

  res.json({
    id: document.id,
    token: document.token,
    collaborators: allCollaborators.map((c) => ({
      email: c.email,
      role: c.role,
      color: c.color,
      joinedAt: c.joinedAt.toISOString()
    })),
    createdAt: document.createdAt.toISOString()
  })
}
