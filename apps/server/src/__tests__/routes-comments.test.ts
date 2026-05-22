import type { Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDbQuery = {
  comments: { findFirst: vi.fn(), findMany: vi.fn() },
  commentReplies: { findMany: vi.fn() }
}
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock("../db", () => ({
  db: {
    query: {
      comments: {
        findFirst: (...args: unknown[]) => mockDbQuery.comments.findFirst(...args),
        findMany: (...args: unknown[]) => mockDbQuery.comments.findMany(...args)
      },
      commentReplies: {
        findMany: (...args: unknown[]) => mockDbQuery.commentReplies.findMany(...args)
      }
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args)
  }
}))

vi.mock("../db/schema", () => ({
  comments: { id: "id", documentId: "document_id" },
  commentReplies: { commentId: "comment_id" },
  collaborators: { documentId: "document_id", email: "email" }
}))

vi.mock("../middleware/authenticate", () => ({
  authenticate: (req: Request, _res: Response, next: Function) => {
    ;(req as any).auth = (req as any).__testAuth || {
      email: "user@test.com",
      role: "editor",
      documentId: "doc-uuid"
    }
    next()
  },
  AuthenticatedRequest: {}
}))

vi.mock("../middleware/validate", () => ({
  validate: () => (_req: Request, _res: Response, next: Function) => next()
}))

const { commentsRouter } = await import("../routes/comments")

function getHandler(method: string, path: string) {
  const stack = (commentsRouter as any).stack
  for (const layer of stack) {
    if (layer.route?.path === path && layer.route.methods[method]) {
      return layer.route.stack[layer.route.stack.length - 1].handle
    }
  }
  return null
}

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response
}

describe("comments routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /:documentId", () => {
    it("returns comments with replies (no N+1)", async () => {
      mockDbQuery.comments.findMany.mockResolvedValue([
        {
          id: "c1",
          content: "Hi",
          quotedText: "text",
          authorEmail: "a@b.com",
          resolved: false,
          resolvedBy: null,
          createdAt: new Date("2024-01-01")
        },
        {
          id: "c2",
          content: "Lo",
          quotedText: "text2",
          authorEmail: "x@y.com",
          resolved: true,
          resolvedBy: "a@b.com",
          createdAt: new Date("2024-01-02")
        }
      ])
      mockDbQuery.commentReplies.findMany.mockResolvedValue([
        {
          id: "r1",
          commentId: "c1",
          content: "reply",
          authorEmail: "x@y.com",
          createdAt: new Date("2024-01-01")
        }
      ])

      const handler = getHandler("get", "/:documentId")
      const req = {
        params: { documentId: "doc-uuid" },
        auth: { email: "user@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      const data = (res.json as any).mock.calls[0][0]
      expect(data).toHaveLength(2)
      expect(data[0].replies).toHaveLength(1)
      expect(data[1].replies).toHaveLength(0)
    })

    it("returns empty array when no comments", async () => {
      mockDbQuery.comments.findMany.mockResolvedValue([])

      const handler = getHandler("get", "/:documentId")
      const req = {
        params: { documentId: "doc-uuid" },
        auth: { email: "user@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect((res.json as any).mock.calls[0][0]).toEqual([])
    })
  })

  describe("POST / (add comment)", () => {
    it("rejects viewer", async () => {
      const handler = getHandler("post", "/")
      const req = {
        body: { documentId: "doc-uuid", content: "test", quotedText: "qt" },
        auth: { email: "viewer@test.com", role: "viewer", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it("creates comment for non-viewer", async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "new-comment",
              content: "Great",
              quotedText: "text",
              authorEmail: "user@test.com",
              resolved: false,
              resolvedBy: null,
              createdAt: new Date("2024-01-01")
            }
          ])
        })
      })

      const handler = getHandler("post", "/")
      const req = {
        body: { documentId: "doc-uuid", content: "Great", quotedText: "text" },
        auth: { email: "user@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect((res.json as any).mock.calls[0][0]).toMatchObject({
        id: "new-comment",
        content: "Great",
        authorEmail: "user@test.com",
        replies: []
      })
    })
  })

  describe("POST /reply", () => {
    it("rejects viewer", async () => {
      const handler = getHandler("post", "/reply")
      const req = {
        body: { documentId: "doc-uuid", commentId: "c1", content: "reply" },
        auth: { email: "viewer@test.com", role: "viewer", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it("returns 404 if comment not in document", async () => {
      mockDbQuery.comments.findFirst.mockResolvedValue(null)

      const handler = getHandler("post", "/reply")
      const req = {
        body: { documentId: "doc-uuid", commentId: "c1", content: "reply" },
        auth: { email: "user@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect((res.json as any).mock.calls[0][0]).toEqual({
        error: "Comment not found in this document"
      })
    })

    it("creates reply when comment belongs to document", async () => {
      mockDbQuery.comments.findFirst.mockResolvedValue({ id: "c1", documentId: "doc-uuid" })
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "new-reply",
              content: "reply",
              authorEmail: "user@test.com",
              createdAt: new Date("2024-01-01")
            }
          ])
        })
      })

      const handler = getHandler("post", "/reply")
      const req = {
        body: { documentId: "doc-uuid", commentId: "c1", content: "reply" },
        auth: { email: "user@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe("PATCH /resolve", () => {
    it("rejects viewer", async () => {
      const handler = getHandler("patch", "/resolve")
      const req = {
        body: { documentId: "doc-uuid", commentId: "c1" },
        auth: { email: "viewer@test.com", role: "viewer", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it("returns 404 if comment not in document", async () => {
      mockDbQuery.comments.findFirst.mockResolvedValue(null)

      const handler = getHandler("patch", "/resolve")
      const req = {
        body: { documentId: "doc-uuid", commentId: "c1" },
        auth: { email: "user@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it("toggles resolved state (false → true)", async () => {
      mockDbQuery.comments.findFirst.mockResolvedValue({
        id: "c1",
        documentId: "doc-uuid",
        resolved: false
      })
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      })

      const handler = getHandler("patch", "/resolve")
      const req = {
        body: { documentId: "doc-uuid", commentId: "c1" },
        auth: { email: "user@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect((res.json as any).mock.calls[0][0]).toEqual({ resolved: true })
    })

    it("toggles resolved state (true → false)", async () => {
      mockDbQuery.comments.findFirst.mockResolvedValue({
        id: "c1",
        documentId: "doc-uuid",
        resolved: true
      })
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      })

      const handler = getHandler("patch", "/resolve")
      const req = {
        body: { documentId: "doc-uuid", commentId: "c1" },
        auth: { email: "user@test.com", role: "editor", documentId: "doc-uuid" }
      } as unknown as Request
      const res = mockRes()

      await handler(req, res)

      expect((res.json as any).mock.calls[0][0]).toEqual({ resolved: false })
    })
  })
})
