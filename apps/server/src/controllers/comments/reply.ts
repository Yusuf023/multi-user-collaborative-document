import { and, eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { commentReplies, comments } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"

export async function replyToComment(req: Request, res: Response) {
  const { email, role, documentId } = (req as AuthenticatedRequest).auth
  const { commentId, content } = req.body

  if (role === "viewer") {
    res.status(403).json({ error: "You do not have permission to reply" })
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

  const [reply] = await db
    .insert(commentReplies)
    .values({ commentId, content, authorEmail: email })
    .returning()

  res.status(201).json({
    id: reply.id,
    content: reply.content,
    authorEmail: reply.authorEmail,
    createdAt: reply.createdAt.toISOString()
  })
}
