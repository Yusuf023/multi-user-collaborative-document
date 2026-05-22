import type { NextFunction, Request, Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { type AuthenticatedRequest, authenticate } from "../middleware/authenticate"

// Mock auth helpers
const mockVerifyDocumentAccess = vi.fn()
const mockGetCollaborator = vi.fn()
const mockNormalizeEmail = vi.fn((email: string) => email.trim().toLowerCase())

vi.mock("../utils/auth", () => ({
  verifyDocumentAccess: (...args: unknown[]) => mockVerifyDocumentAccess(...args),
  getCollaborator: (...args: unknown[]) => mockGetCollaborator(...args),
  normalizeEmail: (email: string) => mockNormalizeEmail(email)
}))

function createMockReqResNext(overrides: Partial<Request> = {}) {
  const req = {
    headers: {},
    params: {},
    body: {},
    ...overrides
  } as unknown as Request

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response

  const next = vi.fn() as NextFunction

  return { req, res, next }
}

describe("authenticate middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 if x-auth-email header is missing", () => {
    const { req, res, next } = createMockReqResNext({
      headers: { "x-auth-token": "abc123" }
    } as Partial<Request>)

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing authentication headers (x-auth-email, x-auth-token)"
    })
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 401 if x-auth-token header is missing", () => {
    const { req, res, next } = createMockReqResNext({
      headers: { "x-auth-email": "user@test.com" }
    } as Partial<Request>)

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 400 if documentId cannot be determined", () => {
    const { req, res, next } = createMockReqResNext({
      headers: { "x-auth-email": "user@test.com", "x-auth-token": "abc123" },
      params: {},
      body: {}
    } as Partial<Request>)

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "Missing documentId" })
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 404 if document not found", async () => {
    mockVerifyDocumentAccess.mockResolvedValue(null)

    const { req, res, next } = createMockReqResNext({
      headers: { "x-auth-email": "user@test.com", "x-auth-token": "abc123" },
      params: { documentId: "doc-uuid" }
    } as Partial<Request>)

    authenticate(req, res, next)
    await vi.waitFor(() => expect(res.status).toHaveBeenCalled())

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: "Document not found or invalid token" })
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 403 if user is not a collaborator", async () => {
    mockVerifyDocumentAccess.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
    mockGetCollaborator.mockResolvedValue(null)

    const { req, res, next } = createMockReqResNext({
      headers: { "x-auth-email": "user@test.com", "x-auth-token": "abc123" },
      params: { documentId: "doc-uuid" }
    } as Partial<Request>)

    authenticate(req, res, next)
    await vi.waitFor(() => expect(res.status).toHaveBeenCalled())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: "You do not have access to this document" })
  })

  it("calls next and attaches auth on success", async () => {
    mockVerifyDocumentAccess.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
    mockGetCollaborator.mockResolvedValue({ role: "editor" })

    const { req, res, next } = createMockReqResNext({
      headers: { "x-auth-email": "User@Test.com", "x-auth-token": "abc123" },
      params: { documentId: "doc-uuid" }
    } as Partial<Request>)

    authenticate(req, res, next)
    await vi.waitFor(() => expect(next).toHaveBeenCalled())

    const authReq = req as AuthenticatedRequest
    expect(authReq.auth).toEqual({
      email: "user@test.com",
      role: "editor",
      documentId: "doc-uuid"
    })
  })

  it("extracts documentId from body if not in params", async () => {
    mockVerifyDocumentAccess.mockResolvedValue({ id: "doc-uuid", token: "abc123" })
    mockGetCollaborator.mockResolvedValue({ role: "owner" })

    const { req, res, next } = createMockReqResNext({
      headers: { "x-auth-email": "user@test.com", "x-auth-token": "abc123" },
      params: {},
      body: { documentId: "doc-uuid" }
    } as Partial<Request>)

    authenticate(req, res, next)
    await vi.waitFor(() => expect(next).toHaveBeenCalled())

    expect(mockVerifyDocumentAccess).toHaveBeenCalledWith("doc-uuid", "abc123")
  })

  it("returns 500 on internal error", async () => {
    mockVerifyDocumentAccess.mockRejectedValue(new Error("DB connection failed"))

    const { req, res, next } = createMockReqResNext({
      headers: { "x-auth-email": "user@test.com", "x-auth-token": "abc123" },
      params: { documentId: "doc-uuid" }
    } as Partial<Request>)

    authenticate(req, res, next)
    await vi.waitFor(() => expect(res.status).toHaveBeenCalled())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" })
  })
})
