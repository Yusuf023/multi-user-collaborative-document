import { z } from "zod/v4"
import { ROLES, TOKEN_LENGTH } from "./constants"

// Common
export const documentIdSchema = z.uuid()
export const emailSchema = z.email()
export const tokenSchema = z.string().length(TOKEN_LENGTH)
export const roleSchema = z.enum(ROLES)

// Invitable roles (excludes owner)
export const INVITABLE_ROLES = ["editor", "reviewer", "viewer"] as const
export const invitableRoleSchema = z.enum(INVITABLE_ROLES)

// Request schemas
export const createDocumentSchema = z.object({
  ownerEmail: emailSchema
})

export const joinDocumentSchema = z.object({
  documentId: documentIdSchema,
  email: emailSchema,
  token: tokenSchema
})

export const inviteUsersSchema = z.object({
  documentId: documentIdSchema,
  invites: z
    .array(
      z.object({
        email: emailSchema,
        role: invitableRoleSchema
      })
    )
    .min(1),
  sendEmail: z.boolean().default(true)
})

export const updateRoleSchema = z.object({
  documentId: documentIdSchema,
  email: emailSchema,
  role: invitableRoleSchema
})

export const TITLE_MAX_LENGTH = 200
export const updateTitleSchema = z.object({
  documentId: documentIdSchema,
  title: z.string().trim().min(1, "Title cannot be empty").max(TITLE_MAX_LENGTH)
})

export const addCommentSchema = z.object({
  documentId: documentIdSchema,
  content: z.string().min(1),
  quotedText: z.string().min(1)
})

export const replyCommentSchema = z.object({
  documentId: documentIdSchema,
  commentId: z.uuid(),
  content: z.string().min(1)
})

export const resolveCommentSchema = z.object({
  documentId: documentIdSchema,
  commentId: z.uuid()
})

// Response schemas
export const documentResponseSchema = z.object({
  id: z.uuid(),
  token: z.string(),
  title: z.string(),
  createdAt: z.string()
})

export const collaboratorSchema = z.object({
  email: z.string(),
  role: roleSchema,
  color: z.string(),
  joinedAt: z.string()
})

export const documentDetailsSchema = z.object({
  id: z.uuid(),
  token: z.string(),
  title: z.string(),
  collaborators: z.array(collaboratorSchema),
  createdAt: z.string()
})

export const commentReplySchema = z.object({
  id: z.uuid(),
  content: z.string(),
  authorEmail: z.string(),
  createdAt: z.string()
})

export const commentSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  quotedText: z.string(),
  authorEmail: z.string(),
  resolved: z.boolean(),
  resolvedBy: z.string().nullable(),
  replies: z.array(commentReplySchema),
  createdAt: z.string()
})

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional()
})

// Type exports
export type CreateDocumentRequest = z.infer<typeof createDocumentSchema>
export type JoinDocumentRequest = z.infer<typeof joinDocumentSchema>
export type InviteUsersRequest = z.infer<typeof inviteUsersSchema>
export type UpdateRoleRequest = z.infer<typeof updateRoleSchema>
export type UpdateTitleRequest = z.infer<typeof updateTitleSchema>
export type AddCommentRequest = z.infer<typeof addCommentSchema>
export type ReplyCommentRequest = z.infer<typeof replyCommentSchema>
export type ResolveCommentRequest = z.infer<typeof resolveCommentSchema>
export type DocumentResponse = z.infer<typeof documentResponseSchema>
export type Collaborator = z.infer<typeof collaboratorSchema>
export type DocumentDetails = z.infer<typeof documentDetailsSchema>
export type Comment = z.infer<typeof commentSchema>
export type CommentReply = z.infer<typeof commentReplySchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>
export type InvitableRole = z.infer<typeof invitableRoleSchema>
