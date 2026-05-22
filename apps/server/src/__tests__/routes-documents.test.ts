import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies
const mockDbQuery = {
  documents: { findFirst: vi.fn() },
  collaborators: { findFirst: vi.fn(), findMany: vi.fn() }
}
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockCount = vi.fn()

vi.mock("../db", () => ({
  db: {
    query: {
      documents: { findFirst: (...args: unknown[]) => mockDbQuery.documents.findFirst(...args) },
      collaborators: {
        findFirst: (...args: unknown[]) => mockDbQuery.collaborators.findFirst(...args),
        findMany: (...args: unknown[]) => mockDbQuery.collaborators.findMany(...args)
      }
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    $count: (...args: unknown[]) => mockCount(...args)
  }
}))

vi.mock("../db/schema", () => ({
  documents: { id: "id", token: "token", createdAt: "created_at" },
  collaborators: { documentId: "document_id", email: "email", role: "role" }
}))

vi.mock("../utils/auth", () => ({
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  getCollaborator: vi.fn(),
  verifyDocumentAccess: vi.fn()
}))

vi.mock("../services/email", () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined)
}))

vi.mock("../middleware/authenticate", () => ({
  authenticate: (req: Request, _res: Response, next: Function) => {
    // Simulate authenticated request
    ;(req as any).auth = (req as any).__testAuth || {
      email: "owner@test.com",
      role: "owner",
      documentId: "doc-uuid"
    }
    next()
  },
  AuthenticatedRequest: {}
}))

vi.mock("../middleware/validate", () => ({
  validate: () => (req: Request, _res: Response, next: Function) => next()
}))

vi.mock("nanoid", () => ({
  nanoid: () => "abc123"
}))

// Import after mocks
const { documentsRouter } = await import("../routes/documents")

// Helper to find and call a route handler
function getHandler(method: string, path: string) {
  const stack = (documentsRouter as any).stack
  for (const layer of stack) {
    if (layer.route?.path === path && layer.route.methods[method]) {
      // Get the last handler (after middleware)
      const handlers = layer.route.stack.filter((s: any) => s.method === method)
      return (
        handlers[handlers.length - 1]?.handle ||
        layer.route.stack[layer.route.stack.length - 1].handle
      )
    }
  }
  return null
}

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response
  return res
}

describe("documents routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST / (create)", () => {
    it("creates document and adds owner collaborator", async () => {
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "new-doc-id",
              token: "abc123",
              title: "Untitled Document",
              finalized: false,
              finalizedBy: null,
              finalizedAt: null,
              createdAt: new Date("2024-01-01")
            }
          ])
        })
      })
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined)
      })

      const handler = getHandler("post", "/")
      const req = { body: { ownerEmail: "Owner@Test.com" } } as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        id: "new-doc-id",
        token: "abc123",
        title: "Untitled Document",
        finalized: false,
        finalizedBy: null,
        finalizedAt: null,
        createdAt: "2024-01-01T00:00:00.000Z"
      })
    })
  })

  describe("POST /join", () => {
    it("returns 404 if document not found", async () => {
      mockDbQuery.documents.findFirst.mockResolvedValue(null)

      const handler = getHandler("post", "/join")
      const req = {
        body: { documentId: "doc-uuid", email: "user@test.com", token: "abc123" }
      } as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it("returns 403 if user not a collaborator", async () => {
      mockDbQuery.documents.findFirst.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
      mockDbQuery.collaborators.findFirst.mockResolvedValue(null)

      const handler = getHandler("post", "/join")
      const req = {
        body: { documentId: "doc-uuid", email: "user@test.com", token: "abc123" }
      } as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it("returns document details on success", async () => {
      const doc = {
        id: "doc-uuid",
        token: "abc123",
        title: "Untitled Document",
        finalized: false,
        finalizedBy: null,
        finalizedAt: null,
        createdAt: new Date("2024-01-01")
      }
      mockDbQuery.documents.findFirst.mockResolvedValue(doc)
      mockDbQuery.collaborators.findFirst.mockResolvedValue({
        email: "user@test.com",
        role: "editor"
      })
      mockDbQuery.collaborators.findMany.mockResolvedValue([
        {
          email: "user@test.com",
          role: "editor",
          color: "#E57373",
          joinedAt: new Date("2024-01-01")
        }
      ])

      const handler = getHandler("post", "/join")
      const req = {
        body: { documentId: "doc-uuid", email: "User@Test.com", token: "abc123" }
      } as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.json).toHaveBeenCalledWith({
        id: "doc-uuid",
        token: "abc123",
        title: "Untitled Document",
        finalized: false,
        finalizedBy: null,
        finalizedAt: null,
        collaborators: [
          {
            email: "user@test.com",
            role: "editor",
            color: "#E57373",
            joinedAt: "2024-01-01T00:00:00.000Z"
          }
        ],
        createdAt: "2024-01-01T00:00:00.000Z"
      })
    })
  })

  describe("GET /:documentId", () => {
    it("returns document details for authenticated user", async () => {
      const doc = { id: "doc-uuid", token: "abc123", createdAt: new Date("2024-01-01") }
      mockDbQuery.documents.findFirst.mockResolvedValue(doc)
      mockDbQuery.collaborators.findMany.mockResolvedValue([
        {
          email: "owner@test.com",
          role: "owner",
          color: "#E57373",
          joinedAt: new Date("2024-01-01")
        }
      ])

      const handler = getHandler("get", "/:documentId")
      const req = {
        params: { documentId: "doc-uuid" },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      ;(req as any).__testAuth = { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      const res = mockRes()

      await handler(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: "doc-uuid" }))
    })

    it("returns 404 if document not found", async () => {
      mockDbQuery.documents.findFirst.mockResolvedValue(null)

      const handler = getHandler("get", "/:documentId")
      const req = {
        params: { documentId: "doc-uuid" },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe("POST /invite", () => {
    it("rejects non-owner/editor", async () => {
      const handler = getHandler("post", "/invite")
      const req = {
        body: { invites: [{ email: "a@b.com", role: "editor" }], sendEmail: false },
        auth: { email: "viewer@test.com", role: "viewer", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it("skips existing collaborators", async () => {
      mockDbQuery.documents.findFirst.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
      mockDbQuery.collaborators.findMany
        .mockResolvedValueOnce([{ email: "existing@test.com", role: "editor" }])
        .mockResolvedValueOnce([
          { email: "existing@test.com", role: "editor", color: "#E57373", joinedAt: new Date() }
        ])

      const handler = getHandler("post", "/invite")
      const req = {
        body: { invites: [{ email: "existing@test.com", role: "editor" }], sendEmail: false },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(mockInsert).not.toHaveBeenCalled()
    })

    it("creates new collaborator successfully", async () => {
      mockDbQuery.documents.findFirst.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
      mockDbQuery.collaborators.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { email: "new@test.com", role: "editor", color: "#E57373", joinedAt: new Date() }
        ])

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "collab-id", email: "new@test.com" }])
        })
      })

      const handler = getHandler("post", "/invite")
      const req = {
        body: { invites: [{ email: "New@Test.com", role: "editor" }], sendEmail: false },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.json).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()
    })

    it("sends email when sendEmail is true", async () => {
      const { sendInviteEmail } = await import("../services/email")

      mockDbQuery.documents.findFirst.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
      mockDbQuery.collaborators.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { email: "new@test.com", role: "editor", color: "#E57373", joinedAt: new Date() }
        ])

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "collab-id", email: "new@test.com" }])
        })
      })

      const handler = getHandler("post", "/invite")
      const req = {
        body: { invites: [{ email: "new@test.com", role: "editor" }], sendEmail: true },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(sendInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "new@test.com",
          documentId: "doc-uuid",
          token: "abc123",
          role: "editor",
          invitedBy: "owner@test.com"
        })
      )
    })

    it("handles email send failure gracefully", async () => {
      const { sendInviteEmail } = await import("../services/email")
      vi.mocked(sendInviteEmail).mockRejectedValueOnce(new Error("SMTP failed"))
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      mockDbQuery.documents.findFirst.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
      mockDbQuery.collaborators.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { email: "new@test.com", role: "editor", color: "#E57373", joinedAt: new Date() }
        ])

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "collab-id", email: "new@test.com" }])
        })
      })

      const handler = getHandler("post", "/invite")
      const req = {
        body: { invites: [{ email: "new@test.com", role: "editor" }], sendEmail: true },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      // Should still succeed even if email fails
      expect(res.json).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("handles unique constraint violation gracefully", async () => {
      mockDbQuery.documents.findFirst.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
      mockDbQuery.collaborators.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { email: "new@test.com", role: "editor", color: "#E57373", joinedAt: new Date() }
        ])

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockRejectedValue(
              Object.assign(new Error("unique constraint violation"), { code: "23505" })
            )
        })
      })

      const handler = getHandler("post", "/invite")
      const req = {
        body: { invites: [{ email: "new@test.com", role: "editor" }], sendEmail: false },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      // Should still return success with collaborators
      expect(res.json).toHaveBeenCalled()
    })

    it("throws non-unique errors", async () => {
      mockDbQuery.documents.findFirst.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
      mockDbQuery.collaborators.findMany.mockResolvedValueOnce([])

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("connection timeout"))
        })
      })

      const handler = getHandler("post", "/invite")
      const req = {
        body: { invites: [{ email: "new@test.com", role: "editor" }], sendEmail: false },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await expect(handler(req, res)).rejects.toThrow("connection timeout")
    })

    it("returns 404 if document not found for invite", async () => {
      mockDbQuery.documents.findFirst.mockResolvedValue(null)

      const handler = getHandler("post", "/invite")
      const req = {
        body: { invites: [{ email: "new@test.com", role: "editor" }], sendEmail: false },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it("editor can also invite", async () => {
      mockDbQuery.documents.findFirst.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
      mockDbQuery.collaborators.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "x", email: "a@b.com" }])
        })
      })

      const handler = getHandler("post", "/invite")
      const req = {
        body: { invites: [{ email: "a@b.com", role: "viewer" }], sendEmail: false },
        auth: { email: "editor@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).not.toHaveBeenCalledWith(403)
    })
  })

  describe("PATCH /role", () => {
    it("rejects non-owner", async () => {
      const handler = getHandler("patch", "/role")
      const req = {
        body: { documentId: "doc-uuid", email: "user@test.com", role: "viewer" },
        auth: { email: "editor@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it("rejects changing own role", async () => {
      const handler = getHandler("patch", "/role")
      const req = {
        body: { documentId: "doc-uuid", email: "owner@test.com", role: "editor" },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: "Cannot change your own role" })
    })

    it("returns 404 if target collaborator not found", async () => {
      mockDbQuery.collaborators.findFirst.mockResolvedValue(null)

      const handler = getHandler("patch", "/role")
      const req = {
        body: { documentId: "doc-uuid", email: "nobody@test.com", role: "viewer" },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: "Collaborator not found" })
    })

    it("blocks demotion of sole owner", async () => {
      mockDbQuery.collaborators.findFirst.mockResolvedValue({
        email: "other-owner@test.com",
        role: "owner"
      })
      mockCount.mockResolvedValue(1)

      const handler = getHandler("patch", "/role")
      const req = {
        body: { documentId: "doc-uuid", email: "other-owner@test.com", role: "editor" },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: "Cannot demote the only owner" })
    })

    it("updates role on success", async () => {
      mockDbQuery.collaborators.findFirst.mockResolvedValue({
        email: "user@test.com",
        role: "editor"
      })
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      })

      const handler = getHandler("patch", "/role")
      const req = {
        body: { documentId: "doc-uuid", email: "user@test.com", role: "viewer" },
        auth: { email: "owner@test.com", role: "owner", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.json).toHaveBeenCalledWith({ success: true })
    })
  })
})
