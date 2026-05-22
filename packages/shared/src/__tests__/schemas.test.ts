import { describe, expect, it } from "vitest"
import {
  addCommentSchema,
  collaboratorSchema,
  commentReplySchema,
  commentSchema,
  createDocumentSchema,
  documentDetailsSchema,
  documentIdSchema,
  documentResponseSchema,
  emailSchema,
  errorResponseSchema,
  INVITABLE_ROLES,
  invitableRoleSchema,
  inviteUsersSchema,
  joinDocumentSchema,
  replyCommentSchema,
  resolveCommentSchema,
  roleSchema,
  tokenSchema,
  updateRoleSchema
} from "../schemas"

describe("schemas", () => {
  describe("documentIdSchema", () => {
    it("accepts valid UUID", () => {
      expect(documentIdSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true)
    })

    it("rejects non-UUID", () => {
      expect(documentIdSchema.safeParse("not-a-uuid").success).toBe(false)
    })

    it("rejects empty string", () => {
      expect(documentIdSchema.safeParse("").success).toBe(false)
    })
  })

  describe("emailSchema", () => {
    it("accepts valid email", () => {
      expect(emailSchema.safeParse("user@example.com").success).toBe(true)
    })

    it("rejects invalid email", () => {
      expect(emailSchema.safeParse("not-an-email").success).toBe(false)
    })
  })

  describe("tokenSchema", () => {
    it("accepts 6-char token", () => {
      expect(tokenSchema.safeParse("abc123").success).toBe(true)
    })

    it("rejects wrong length", () => {
      expect(tokenSchema.safeParse("short").success).toBe(false)
      expect(tokenSchema.safeParse("toolongtoken").success).toBe(false)
    })
  })

  describe("roleSchema", () => {
    it("accepts all valid roles", () => {
      for (const role of ["owner", "editor", "reviewer", "viewer"]) {
        expect(roleSchema.safeParse(role).success).toBe(true)
      }
    })

    it("rejects invalid role", () => {
      expect(roleSchema.safeParse("admin").success).toBe(false)
    })
  })

  describe("invitableRoleSchema", () => {
    it("defines editor, reviewer, viewer", () => {
      expect(INVITABLE_ROLES).toEqual(["editor", "reviewer", "viewer"])
    })

    it("accepts invitable roles", () => {
      for (const role of INVITABLE_ROLES) {
        expect(invitableRoleSchema.safeParse(role).success).toBe(true)
      }
    })

    it("rejects owner", () => {
      expect(invitableRoleSchema.safeParse("owner").success).toBe(false)
    })
  })

  describe("createDocumentSchema", () => {
    it("accepts valid input", () => {
      expect(createDocumentSchema.safeParse({ ownerEmail: "user@test.com" }).success).toBe(true)
    })

    it("rejects missing email", () => {
      expect(createDocumentSchema.safeParse({}).success).toBe(false)
    })

    it("rejects invalid email", () => {
      expect(createDocumentSchema.safeParse({ ownerEmail: "invalid" }).success).toBe(false)
    })
  })

  describe("joinDocumentSchema", () => {
    const valid = {
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@test.com",
      token: "abc123"
    }

    it("accepts valid input", () => {
      expect(joinDocumentSchema.safeParse(valid).success).toBe(true)
    })

    it("rejects missing fields", () => {
      expect(joinDocumentSchema.safeParse({ documentId: valid.documentId }).success).toBe(false)
    })

    it("rejects invalid documentId", () => {
      expect(joinDocumentSchema.safeParse({ ...valid, documentId: "bad" }).success).toBe(false)
    })

    it("rejects invalid token length", () => {
      expect(joinDocumentSchema.safeParse({ ...valid, token: "ab" }).success).toBe(false)
    })
  })

  describe("inviteUsersSchema", () => {
    const valid = {
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      invites: [{ email: "user@test.com", role: "editor" }],
      sendEmail: true
    }

    it("accepts valid input", () => {
      expect(inviteUsersSchema.safeParse(valid).success).toBe(true)
    })

    it("defaults sendEmail to true", () => {
      const result = inviteUsersSchema.safeParse({
        documentId: valid.documentId,
        invites: valid.invites
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.sendEmail).toBe(true)
    })

    it("rejects owner role in invites", () => {
      const result = inviteUsersSchema.safeParse({
        ...valid,
        invites: [{ email: "user@test.com", role: "owner" }]
      })
      expect(result.success).toBe(false)
    })

    it("rejects empty invites array", () => {
      expect(inviteUsersSchema.safeParse({ ...valid, invites: [] }).success).toBe(false)
    })

    it("accepts multiple invites", () => {
      const result = inviteUsersSchema.safeParse({
        ...valid,
        invites: [
          { email: "a@test.com", role: "editor" },
          { email: "b@test.com", role: "viewer" },
          { email: "c@test.com", role: "reviewer" }
        ]
      })
      expect(result.success).toBe(true)
    })
  })

  describe("updateRoleSchema", () => {
    const valid = {
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      email: "user@test.com",
      role: "editor"
    }

    it("accepts valid input", () => {
      expect(updateRoleSchema.safeParse(valid).success).toBe(true)
    })

    it("rejects owner role (only invitable roles allowed)", () => {
      expect(updateRoleSchema.safeParse({ ...valid, role: "owner" }).success).toBe(false)
    })

    it("rejects invalid role", () => {
      expect(updateRoleSchema.safeParse({ ...valid, role: "superadmin" }).success).toBe(false)
    })
  })

  describe("addCommentSchema", () => {
    const valid = {
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      content: "Great point!",
      quotedText: "Some text"
    }

    it("accepts valid input", () => {
      expect(addCommentSchema.safeParse(valid).success).toBe(true)
    })

    it("rejects empty content", () => {
      expect(addCommentSchema.safeParse({ ...valid, content: "" }).success).toBe(false)
    })

    it("rejects empty quotedText", () => {
      expect(addCommentSchema.safeParse({ ...valid, quotedText: "" }).success).toBe(false)
    })

    it("does not require authorEmail (server uses auth)", () => {
      expect(addCommentSchema.safeParse(valid).success).toBe(true)
    })
  })

  describe("replyCommentSchema", () => {
    const valid = {
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      commentId: "660e8400-e29b-41d4-a716-446655440000",
      content: "I agree"
    }

    it("accepts valid input", () => {
      expect(replyCommentSchema.safeParse(valid).success).toBe(true)
    })

    it("rejects empty content", () => {
      expect(replyCommentSchema.safeParse({ ...valid, content: "" }).success).toBe(false)
    })

    it("rejects invalid commentId", () => {
      expect(replyCommentSchema.safeParse({ ...valid, commentId: "bad" }).success).toBe(false)
    })
  })

  describe("resolveCommentSchema", () => {
    const valid = {
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      commentId: "660e8400-e29b-41d4-a716-446655440000"
    }

    it("accepts valid input", () => {
      expect(resolveCommentSchema.safeParse(valid).success).toBe(true)
    })

    it("does not require resolvedBy (server uses auth)", () => {
      expect(resolveCommentSchema.safeParse(valid).success).toBe(true)
    })
  })

  describe("response schemas", () => {
    describe("documentResponseSchema", () => {
      it("accepts valid response", () => {
        const result = documentResponseSchema.safeParse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          token: "abc123",
          createdAt: "2024-01-01T00:00:00Z"
        })
        expect(result.success).toBe(true)
      })
    })

    describe("collaboratorSchema", () => {
      it("accepts valid collaborator", () => {
        const result = collaboratorSchema.safeParse({
          email: "user@test.com",
          role: "editor",
          color: "#E57373",
          joinedAt: "2024-01-01T00:00:00Z"
        })
        expect(result.success).toBe(true)
      })
    })

    describe("documentDetailsSchema", () => {
      it("accepts valid document details", () => {
        const result = documentDetailsSchema.safeParse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          token: "abc123",
          collaborators: [
            { email: "user@test.com", role: "owner", color: "#E57373", joinedAt: "2024-01-01" }
          ],
          createdAt: "2024-01-01T00:00:00Z"
        })
        expect(result.success).toBe(true)
      })
    })

    describe("commentReplySchema", () => {
      it("accepts valid reply", () => {
        const result = commentReplySchema.safeParse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          content: "reply text",
          authorEmail: "user@test.com",
          createdAt: "2024-01-01T00:00:00Z"
        })
        expect(result.success).toBe(true)
      })
    })

    describe("commentSchema", () => {
      it("accepts valid comment with replies", () => {
        const result = commentSchema.safeParse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          content: "A comment",
          quotedText: "Selected text",
          authorEmail: "user@test.com",
          resolved: false,
          resolvedBy: null,
          replies: [
            {
              id: "660e8400-e29b-41d4-a716-446655440000",
              content: "A reply",
              authorEmail: "other@test.com",
              createdAt: "2024-01-01"
            }
          ],
          createdAt: "2024-01-01"
        })
        expect(result.success).toBe(true)
      })

      it("accepts resolved comment", () => {
        const result = commentSchema.safeParse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          content: "A comment",
          quotedText: "text",
          authorEmail: "user@test.com",
          resolved: true,
          resolvedBy: "resolver@test.com",
          replies: [],
          createdAt: "2024-01-01"
        })
        expect(result.success).toBe(true)
      })
    })

    describe("errorResponseSchema", () => {
      it("accepts error with message", () => {
        const result = errorResponseSchema.safeParse({
          error: "Not found",
          message: "Document not found"
        })
        expect(result.success).toBe(true)
      })

      it("accepts error without message", () => {
        const result = errorResponseSchema.safeParse({ error: "Server error" })
        expect(result.success).toBe(true)
      })
    })
  })
})
