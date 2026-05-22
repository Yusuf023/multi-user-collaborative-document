import {
  createDocumentSchema,
  inviteUsersSchema,
  joinDocumentSchema,
  updateRoleSchema
} from "@collab/shared"
import { Router } from "express"
import {
  createDocument,
  getDocument,
  inviteUsers,
  joinDocument,
  updateRole
} from "../controllers/documents"
import { authenticate } from "../middleware/authenticate"
import { validate } from "../middleware/validate"

export const documentsRouter = Router()

documentsRouter.post("/", validate(createDocumentSchema), createDocument)
documentsRouter.post("/join", validate(joinDocumentSchema), joinDocument)
documentsRouter.get("/:documentId", authenticate, getDocument)
documentsRouter.post("/invite", authenticate, validate(inviteUsersSchema), inviteUsers)
documentsRouter.patch("/role", authenticate, validate(updateRoleSchema), updateRole)
