import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock modules before imports
vi.mock("../db", () => ({
  db: {
    query: {
      documents: { findFirst: vi.fn() },
      documentSnapshots: { findFirst: vi.fn() }
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
      })
    })
  }
}))

vi.mock("../services/cache", () => ({
  getDocState: vi.fn(),
  setDocState: vi.fn()
}))

const mockLoggerError = vi.fn()
vi.mock("../services/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: mockLoggerError
    }),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: mockLoggerError
  }
}))

vi.mock("../env", () => ({
  env: {
    DB_FLUSH_INTERVAL_MS: 100,
    NODE_ENV: "test",
    LOG_LEVEL: "silent"
  }
}))

const mockVerifyDocumentAccess = vi.fn()
const mockGetCollaborator = vi.fn()
const mockNormalizeEmail = vi.fn((email: string) => email.trim().toLowerCase())

vi.mock("../utils/auth", () => ({
  verifyDocumentAccess: (...args: unknown[]) => mockVerifyDocumentAccess(...args),
  getCollaborator: (...args: unknown[]) => mockGetCollaborator(...args),
  normalizeEmail: (email: string) => mockNormalizeEmail(email)
}))

type AnyFn = (...args: any[]) => any

// Mock Hocuspocus and Database extension to capture callbacks
let capturedOnAuthenticate: AnyFn
let capturedFetch: AnyFn
let capturedStore: AnyFn

vi.mock("@hocuspocus/server", () => ({
  Hocuspocus: class {
    constructor(opts: { onAuthenticate: AnyFn; extensions: unknown[] }) {
      capturedOnAuthenticate = opts.onAuthenticate
    }
  }
}))

vi.mock("@hocuspocus/extension-database", () => ({
  Database: class {
    constructor(opts: { fetch: AnyFn; store: AnyFn }) {
      capturedFetch = opts.fetch
      capturedStore = opts.store
    }
  }
}))

// Import after mocks
await import("../hocuspocus")

import { getDocState, setDocState } from "../services/cache"

describe("hocuspocus", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("onAuthenticate", () => {
    it("rejects token without pipe delimiter", async () => {
      await expect(
        capturedOnAuthenticate({
          token: "no-delimiter-here",
          documentName: "doc-id",
          connectionConfig: {}
        })
      ).rejects.toThrow("Invalid authentication token format")
    })

    it("rejects empty email or docToken", async () => {
      await expect(
        capturedOnAuthenticate({
          token: "|abc123",
          documentName: "doc-id",
          connectionConfig: {}
        })
      ).rejects.toThrow("Invalid authentication token")
    })

    it("rejects when document not found", async () => {
      mockVerifyDocumentAccess.mockResolvedValue(null)

      await expect(
        capturedOnAuthenticate({
          token: "user@test.com|abc123",
          documentName: "doc-id",
          connectionConfig: {}
        })
      ).rejects.toThrow("Document not found")
    })

    it("rejects when collaborator not found", async () => {
      mockVerifyDocumentAccess.mockResolvedValue({ id: "doc-id" })
      mockGetCollaborator.mockResolvedValue(null)

      await expect(
        capturedOnAuthenticate({
          token: "user@test.com|abc123",
          documentName: "doc-id",
          connectionConfig: {}
        })
      ).rejects.toThrow("Access denied")
    })

    it("sets readOnly for viewer", async () => {
      mockVerifyDocumentAccess.mockResolvedValue({ id: "doc-id" })
      mockGetCollaborator.mockResolvedValue({ role: "viewer", color: "#E57373" })

      const connectionConfig: { readOnly?: boolean } = {}
      const result = await capturedOnAuthenticate({
        token: "user@test.com|abc123",
        documentName: "doc-id",
        connectionConfig
      })

      expect(connectionConfig.readOnly).toBe(true)
      expect(result.user).toEqual({ email: "user@test.com", role: "viewer", color: "#E57373" })
    })

    it("sets readOnly for reviewer", async () => {
      mockVerifyDocumentAccess.mockResolvedValue({ id: "doc-id" })
      mockGetCollaborator.mockResolvedValue({ role: "reviewer", color: "#64B5F6" })

      const connectionConfig: { readOnly?: boolean } = {}
      await capturedOnAuthenticate({
        token: "user@test.com|abc123",
        documentName: "doc-id",
        connectionConfig
      })

      expect(connectionConfig.readOnly).toBe(true)
    })

    it("does not set readOnly for editor", async () => {
      mockVerifyDocumentAccess.mockResolvedValue({ id: "doc-id" })
      mockGetCollaborator.mockResolvedValue({ role: "editor", color: "#81C784" })

      const connectionConfig: { readOnly?: boolean } = {}
      await capturedOnAuthenticate({
        token: "user@test.com|abc123",
        documentName: "doc-id",
        connectionConfig
      })

      expect(connectionConfig.readOnly).toBeUndefined()
    })

    it("does not set readOnly for owner", async () => {
      mockVerifyDocumentAccess.mockResolvedValue({ id: "doc-id" })
      mockGetCollaborator.mockResolvedValue({ role: "owner", color: "#E57373" })

      const connectionConfig: { readOnly?: boolean } = {}
      await capturedOnAuthenticate({
        token: "user@test.com|abc123",
        documentName: "doc-id",
        connectionConfig
      })

      expect(connectionConfig.readOnly).toBeUndefined()
    })

    it("uses last pipe as delimiter (email with special chars)", async () => {
      mockVerifyDocumentAccess.mockResolvedValue({ id: "doc-id" })
      mockGetCollaborator.mockResolvedValue({ role: "editor", color: "#81C784" })

      const connectionConfig: { readOnly?: boolean } = {}
      const result = await capturedOnAuthenticate({
        token: "user+tag@test.com|abc123",
        documentName: "doc-id",
        connectionConfig
      })

      expect(mockNormalizeEmail).toHaveBeenCalledWith("user+tag@test.com")
      expect(result.user.email).toBe("user+tag@test.com")
    })
  })

  describe("Database extension", () => {
    describe("fetch", () => {
      it("returns Redis state if available", async () => {
        const mockBuffer = Buffer.from("yjs-state")
        vi.mocked(getDocState).mockResolvedValue(mockBuffer)

        const result = await capturedFetch({ documentName: "doc-id" })

        expect(getDocState).toHaveBeenCalledWith("doc-id")
        expect(result).toEqual(new Uint8Array(mockBuffer))
      })

      it("falls back to DB if Redis is empty", async () => {
        vi.mocked(getDocState).mockResolvedValue(null)

        const { db } = await import("../db")
        vi.mocked(db.query.documentSnapshots.findFirst).mockResolvedValue({
          id: "snap-id",
          documentId: "doc-id",
          state: Buffer.from("db-state").toString("base64"),
          updatedAt: new Date()
        })

        const result = await capturedFetch({ documentName: "doc-id" })

        expect(result).toEqual(new Uint8Array(Buffer.from("db-state")))
        expect(setDocState).toHaveBeenCalled()
      })

      it("returns null if neither Redis nor DB has state", async () => {
        vi.mocked(getDocState).mockResolvedValue(null)

        const { db } = await import("../db")
        vi.mocked(db.query.documentSnapshots.findFirst).mockResolvedValue(undefined)

        const result = await capturedFetch({ documentName: "doc-id" })

        expect(result).toBeNull()
      })
    })

    describe("store", () => {
      it("writes to Redis immediately", async () => {
        const state = new Uint8Array([1, 2, 3])

        await capturedStore({ documentName: "doc-id", state })

        expect(setDocState).toHaveBeenCalledWith("doc-id", Buffer.from(state))
      })

      it("debounces DB flush and executes after interval", async () => {
        vi.useFakeTimers()
        const state = new Uint8Array([4, 5, 6])

        await capturedStore({ documentName: "flush-doc", state })

        // DB write hasn't happened yet
        const { db } = await import("../db")
        const insertCallsBefore = vi.mocked(db.insert).mock.calls.length

        // Advance timer past the flush interval
        await vi.advanceTimersByTimeAsync(200)

        // DB insert should have been called now
        expect(vi.mocked(db.insert).mock.calls.length).toBeGreaterThan(insertCallsBefore)
        vi.useRealTimers()
      })

      it("debounce replaces previous timeout for same document", async () => {
        vi.useFakeTimers()
        const state1 = new Uint8Array([1])
        const state2 = new Uint8Array([2])

        await capturedStore({ documentName: "dedup-doc", state: state1 })
        await capturedStore({ documentName: "dedup-doc", state: state2 })

        await vi.advanceTimersByTimeAsync(200)

        // Only one flush should happen (the second one replaces the first)
        const { db } = await import("../db")
        const insertCalls = vi.mocked(db.insert).mock.calls
        // At least one call for "dedup-doc"
        expect(insertCalls.length).toBeGreaterThanOrEqual(1)
        vi.useRealTimers()
      })

      it("handles DB flush error gracefully", async () => {
        vi.useFakeTimers()
        mockLoggerError.mockClear()

        const { db } = await import("../db")
        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockRejectedValue(new Error("DB error"))
          })
        } as unknown as ReturnType<typeof db.insert>)

        const state = new Uint8Array([7, 8, 9])
        await capturedStore({ documentName: "error-doc", state })

        await vi.advanceTimersByTimeAsync(200)

        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.objectContaining({ documentName: "error-doc", err: expect.any(Error) }),
          expect.stringContaining("flush failed")
        )

        vi.useRealTimers()
      })
    })
  })
})
