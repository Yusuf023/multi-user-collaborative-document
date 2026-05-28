import { eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { documents } from "../../db/schema"
import { hocuspocus } from "../../hocuspocus"
import type { AuthenticatedRequest } from "../../middleware/authenticate"

export async function approveDocument(req: Request, res: Response) {
  const {
    email: requesterEmail,
    role: requesterRole,
    documentId
  } = (req as AuthenticatedRequest).auth

  if (requesterRole !== "reviewer") {
    res.status(403).json({ error: "Only reviewers can approve a document" })
    return
  }

  const document = await db.query.documents.findFirst({
    where: eq(documents.id, documentId)
  })

  if (!document) {
    res.status(404).json({ error: "Document not found" })
    return
  }

  if (!document.finalized) {
    res.status(409).json({ error: "Only a finalised document can be approved" })
    return
  }

  const [updated] = await db
    .update(documents)
    .set({ approved: true, approvedBy: requesterEmail, approvedAt: new Date() })
    .where(eq(documents.id, documentId))
    .returning({
      approved: documents.approved,
      approvedBy: documents.approvedBy,
      approvedAt: documents.approvedAt
    })

  // A reviewer's WS connection is read-only, so the client can't broadcast the
  // approval itself. Set it on the server-held Y.Doc instead — the document's
  // update handler fans the change out to every connection (incl. the reviewer),
  // and the clients' `meta.approved` observer flips the badge to "Approved".
  const ydoc = hocuspocus.documents.get(documentId)
  if (ydoc) {
    ydoc.transact(() => {
      ydoc.getMap("meta").set("approved", true)
    })
  }

  res.json({
    approved: updated.approved,
    approvedBy: updated.approvedBy,
    approvedAt: updated.approvedAt?.toISOString() ?? null
  })
}
