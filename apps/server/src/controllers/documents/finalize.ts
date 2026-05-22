import { eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { documents } from "../../db/schema"
import { hocuspocus } from "../../hocuspocus"
import type { AuthenticatedRequest } from "../../middleware/authenticate"
import { logger } from "../../services/logger"

const log = logger.child({ component: "finalize" })

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
      finalizedAt: finalized ? new Date() : null
    })
    .where(eq(documents.id, documentId))
    .returning({
      finalized: documents.finalized,
      finalizedBy: documents.finalizedBy,
      finalizedAt: documents.finalizedAt
    })

  if (!updated) {
    res.status(404).json({ error: "Document not found" })
    return
  }

  // Force-close existing WS connections so they re-authenticate with the new
  // readOnly state. New connections from the same clients will use the updated
  // `finalized` flag from the DB.
  try {
    hocuspocus.closeConnections(documentId)
  } catch (err) {
    log.warn({ err, documentId }, "failed to close ws connections after finalize toggle")
  }

  res.json({
    finalized: updated.finalized,
    finalizedBy: updated.finalizedBy,
    finalizedAt: updated.finalizedAt?.toISOString() ?? null
  })
}
