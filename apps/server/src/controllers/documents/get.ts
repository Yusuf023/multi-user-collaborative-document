import { eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { collaborators, documents } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"

export async function getDocument(req: Request, res: Response) {
  const { documentId } = (req as AuthenticatedRequest).auth

  const document = await db.query.documents.findFirst({
    where: eq(documents.id, documentId)
  })

  if (!document) {
    res.status(404).json({ error: "Document not found" })
    return
  }

  const allCollaborators = await db.query.collaborators.findMany({
    where: eq(collaborators.documentId, documentId)
  })

  res.json({
    id: document.id,
    token: document.token,
    title: document.title,
    finalized: document.finalized,
    finalizedBy: document.finalizedBy,
    finalizedAt: document.finalizedAt?.toISOString() ?? null,
    collaborators: allCollaborators.map((c) => ({
      email: c.email,
      role: c.role,
      color: c.color,
      joinedAt: c.joinedAt.toISOString()
    })),
    createdAt: document.createdAt.toISOString()
  })
}
