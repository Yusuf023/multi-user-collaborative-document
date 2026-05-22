import { eq } from "drizzle-orm"
import type { Request, Response } from "express"
import { db } from "../../db"
import { documents } from "../../db/schema"
import type { AuthenticatedRequest } from "../../middleware/authenticate"

export async function updateTitle(req: Request, res: Response) {
  const { role: requesterRole, documentId } = (req as AuthenticatedRequest).auth
  const { title } = req.body

  if (requesterRole !== "owner" && requesterRole !== "editor") {
    res.status(403).json({ error: "You do not have permission to rename this document" })
    return
  }

  const trimmedTitle = title.trim()

  await db.update(documents).set({ title: trimmedTitle }).where(eq(documents.id, documentId))

  res.json({ title: trimmedTitle })
}
