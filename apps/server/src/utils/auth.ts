import type { Role } from "@collab/shared"
import { and, eq } from "drizzle-orm"
import { db } from "../db"
import { collaborators, documents } from "../db/schema"

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function getCollaborator(documentId: string, email: string) {
  return db.query.collaborators.findFirst({
    where: and(eq(collaborators.documentId, documentId), eq(collaborators.email, email))
  })
}

export async function verifyDocumentAccess(documentId: string, token: string) {
  return db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.token, token))
  })
}

export function requireRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole)
}
