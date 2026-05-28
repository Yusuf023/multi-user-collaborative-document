import {
  approveDocumentSchema,
  createDocumentSchema,
  finalizeDocumentSchema,
  inviteUsersSchema,
  joinDocumentSchema,
  removeCollaboratorSchema,
  updateRoleSchema,
  updateTitleSchema
} from "@collab/shared"
import { Router } from "express"
import {
  approveDocument,
  createDocument,
  finalizeDocument,
  getDocument,
  inviteUsers,
  joinDocument,
  removeCollaborator,
  updateRole,
  updateTitle
} from "../controllers/documents"
import { authenticate } from "../middleware/authenticate"
import { validate } from "../middleware/validate"

export const documentsRouter = Router()

documentsRouter.post("/", validate(createDocumentSchema), createDocument)
documentsRouter.post("/join", validate(joinDocumentSchema), joinDocument)
documentsRouter.get("/:documentId", authenticate, getDocument)
documentsRouter.post("/invite", authenticate, validate(inviteUsersSchema), inviteUsers)
documentsRouter.patch("/role", authenticate, validate(updateRoleSchema), updateRole)
documentsRouter.patch("/title", authenticate, validate(updateTitleSchema), updateTitle)
documentsRouter.delete(
  "/collaborator",
  authenticate,
  validate(removeCollaboratorSchema),
  removeCollaborator
)
documentsRouter.patch("/finalize", authenticate, validate(finalizeDocumentSchema), finalizeDocument)
documentsRouter.patch("/approve", authenticate, validate(approveDocumentSchema), approveDocument)
