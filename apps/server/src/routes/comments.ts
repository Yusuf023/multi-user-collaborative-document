import { addCommentSchema, replyCommentSchema, resolveCommentSchema } from "@collab/shared"
import { Router } from "express"
import {
  createComment,
  listComments,
  replyToComment,
  resolveComment
} from "../controllers/comments"
import { authenticate } from "../middleware/authenticate"
import { validate } from "../middleware/validate"

export const commentsRouter = Router()

commentsRouter.get("/:documentId", authenticate, listComments)
commentsRouter.post("/", authenticate, validate(addCommentSchema), createComment)
commentsRouter.post("/reply", authenticate, validate(replyCommentSchema), replyToComment)
commentsRouter.patch("/resolve", authenticate, validate(resolveCommentSchema), resolveComment)
