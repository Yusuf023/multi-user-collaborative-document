import { eq, inArray } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { commentReplies, comments } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"

export async function listComments(req: Request, res: Response) {
  const { documentId } = (req as AuthenticatedRequest).auth

  const allComments = await db.query.comments.findMany({
    where: eq(comments.documentId, documentId),
    orderBy: (comments, { desc }) => [desc(comments.createdAt)]
  })

  // Fetch all replies in a single query (fix N+1)
  let allReplies: (typeof commentReplies.$inferSelect)[] = []
  if (allComments.length > 0) {
    const commentIds = allComments.map((c) => c.id)
    allReplies = await db.query.commentReplies.findMany({
      where: inArray(commentReplies.commentId, commentIds),
      orderBy: (replies, { asc }) => [asc(replies.createdAt)]
    })
  }

  // Group replies by commentId
  const repliesByComment = new Map<string, typeof allReplies>()
  for (const reply of allReplies) {
    const existing = repliesByComment.get(reply.commentId) || []
    existing.push(reply)
    repliesByComment.set(reply.commentId, existing)
  }

  const commentsWithReplies = allComments.map((comment) => {
    const replies = repliesByComment.get(comment.id) || []
    return {
      id: comment.id,
      content: comment.content,
      quotedText: comment.quotedText,
      authorEmail: comment.authorEmail,
      resolved: comment.resolved,
      resolvedBy: comment.resolvedBy,
      replies: replies.map((r) => ({
        id: r.id,
        content: r.content,
        authorEmail: r.authorEmail,
        createdAt: r.createdAt.toISOString()
      })),
      createdAt: comment.createdAt.toISOString()
    }
  })

  res.json(commentsWithReplies)
}
