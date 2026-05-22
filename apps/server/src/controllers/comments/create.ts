import type { Request, Response } from "express"
import { db } from "../../db"
import { comments } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"
import { isDocumentFinalized } from "../../utils/document-status"

export async function createComment(req: Request, res: Response) {
  const { email, role, documentId } = (req as AuthenticatedRequest).auth
  const { content, quotedText } = req.body

  if (role === "viewer") {
    res.status(403).json({ error: "You do not have permission to comment" })
    return
  }

  if (await isDocumentFinalized(documentId)) {
    res.status(409).json({ error: "Document is finalized and cannot be modified" })
    return
  }

  const [comment] = await db
    .insert(comments)
    .values({ documentId, content, quotedText, authorEmail: email })
    .returning()

  res.status(201).json({
    id: comment.id,
    content: comment.content,
    quotedText: comment.quotedText,
    authorEmail: comment.authorEmail,
    resolved: comment.resolved,
    resolvedBy: comment.resolvedBy,
    replies: [],
    createdAt: comment.createdAt.toISOString()
  })
}
