import { and, eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { comments } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"
import { isDocumentFinalized } from "../../utils/document-status"

export async function resolveComment(req: Request, res: Response) {
  const { email, role, documentId } = (req as AuthenticatedRequest).auth
  const { commentId } = req.body

  if (role === "viewer") {
    res.status(403).json({ error: "You do not have permission to resolve comments" })
    return
  }

  if (await isDocumentFinalized(documentId)) {
    res.status(409).json({ error: "Document is finalized and cannot be modified" })
    return
  }

  // Verify comment belongs to this document
  const comment = await db.query.comments.findFirst({
    where: and(eq(comments.id, commentId), eq(comments.documentId, documentId))
  })

  if (!comment) {
    res.status(404).json({ error: "Comment not found in this document" })
    return
  }

  await db
    .update(comments)
    .set({
      resolved: !comment.resolved,
      resolvedBy: !comment.resolved ? email : null
    })
    .where(eq(comments.id, commentId))

  res.json({ resolved: !comment.resolved })
}
