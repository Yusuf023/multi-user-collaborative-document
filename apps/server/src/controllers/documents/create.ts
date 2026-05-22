import { COLLABORATION_COLORS, TOKEN_LENGTH } from "@collab/shared"
import type { Request, Response } from "express"
import { nanoid } from "nanoid"
import { db } from "../../db"
import { collaborators, documents } from "../../db/schema"
import { normalizeEmail } from "../../utils/auth"

export async function createDocument(req: Request, res: Response) {
  const ownerEmail = normalizeEmail(req.body.ownerEmail)
  const token = nanoid(TOKEN_LENGTH)

  const [document] = await db.insert(documents).values({ token }).returning({
    id: documents.id,
    token: documents.token,
    title: documents.title,
    createdAt: documents.createdAt
  })

  await db.insert(collaborators).values({
    documentId: document.id,
    email: ownerEmail,
    role: "owner",
    color: COLLABORATION_COLORS[0]
  })

  res.status(201).json({
    id: document.id,
    token: document.token,
    title: document.title,
    createdAt: document.createdAt.toISOString()
  })
}
