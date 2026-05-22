import { eq } from "drizzle-orm"
import { db } from "../db"
import { documents } from "../db/schema"

/**
 * Returns whether the document is finalized (locked from further changes).
 * Used as a guard in mutation routes (title, comments) to reject writes
 * once an owner/editor has marked the document as finalized.
 */
export async function isDocumentFinalized(documentId: string): Promise<boolean> {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
    columns: { finalized: true }
  })
  return doc?.finalized ?? false
}
