import type { Role } from "@collab/shared"
import type { NextFunction, Request, Response } from "express"
import { getCollaborator, normalizeEmail, verifyDocumentAccess } from "../utils/auth"

export interface AuthenticatedRequest extends Request {
  auth: {
    email: string
    role: Role
    documentId: string
  }
}

/**
 * Authenticate requests using `x-auth-email` and `x-auth-token` headers.
 * Requires `documentId` in either req.params or req.body.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const email = req.headers["x-auth-email"] as string | undefined
  const token = req.headers["x-auth-token"] as string | undefined

  if (!email || !token) {
    res.status(401).json({ error: "Missing authentication headers (x-auth-email, x-auth-token)" })
    return
  }

  const normalizedEmail = normalizeEmail(email)
  const documentId = req.params.documentId || req.body?.documentId

  if (!documentId) {
    res.status(400).json({ error: "Missing documentId" })
    return
  }

  try {
    const document = await verifyDocumentAccess(documentId, token)
    if (!document) {
      res.status(404).json({ error: "Document not found or invalid token" })
      return
    }

    const collaborator = await getCollaborator(documentId, normalizedEmail)
    if (!collaborator) {
      res.status(403).json({ error: "You do not have access to this document" })
      return
    }

    ;(req as AuthenticatedRequest).auth = {
      email: normalizedEmail,
      role: collaborator.role as Role,
      documentId
    }
    next()
  } catch (err) {
    console.error("Authentication error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}
