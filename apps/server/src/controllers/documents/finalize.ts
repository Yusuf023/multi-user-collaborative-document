import { eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { documents } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"

export async function finalizeDocument(req: Request, res: Response) {
  const {
    email: requesterEmail,
    role: requesterRole,
    documentId
  } = (req as AuthenticatedRequest).auth
  const { finalized } = req.body as { finalized: boolean }

  if (requesterRole !== "owner" && requesterRole !== "editor") {
    res.status(403).json({ error: "Only owners and editors can change finalized state" })
    return
  }

  const [updated] = await db
    .update(documents)
    .set({
      finalized,
      finalizedBy: finalized ? requesterEmail : null,
      finalizedAt: finalized ? new Date() : null,
      // Reopening clears any prior approval — collaborators must request and
      // grant approval again on the next finalisation.
      ...(finalized ? {} : { approved: false, approvedBy: null, approvedAt: null })
    })
    .where(eq(documents.id, documentId))
    .returning({
      finalized: documents.finalized,
      finalizedBy: documents.finalizedBy,
      finalizedAt: documents.finalizedAt,
      approved: documents.approved,
      approvedBy: documents.approvedBy,
      approvedAt: documents.approvedAt
    })

  if (!updated) {
    res.status(404).json({ error: "Document not found" })
    return
  }

  // Live clients are notified instantly via the `meta.finalized` boolean in the
  // Yjs doc (set by the client on success). New/reconnecting connections pick up
  // the read-only state from the DB `finalized` flag in onAuthenticate.
  res.json({
    finalized: updated.finalized,
    finalizedBy: updated.finalizedBy,
    finalizedAt: updated.finalizedAt?.toISOString() ?? null,
    approved: updated.approved,
    approvedBy: updated.approvedBy,
    approvedAt: updated.approvedAt?.toISOString() ?? null
  })
}
