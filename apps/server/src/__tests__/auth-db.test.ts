import { describe, expect, it, vi } from "vitest"

const mockFindFirstCollaborator = vi.fn()
const mockFindFirstDocument = vi.fn()

vi.mock("../db", () => ({
  db: {
    query: {
      collaborators: { findFirst: (...args: unknown[]) => mockFindFirstCollaborator(...args) },
      documents: { findFirst: (...args: unknown[]) => mockFindFirstDocument(...args) }
    }
  }
}))

vi.mock("../db/schema", () => ({
  documents: { id: "id", token: "token" },
  collaborators: { documentId: "document_id", email: "email" }
}))

import { getCollaborator, verifyDocumentAccess } from "../utils/auth"

describe("auth DB helpers", () => {
  describe("getCollaborator", () => {
    it("calls findFirst with documentId and email", async () => {
      mockFindFirstCollaborator.mockResolvedValue({ email: "user@test.com", role: "editor" })

      const result = await getCollaborator("doc-id", "user@test.com")

      expect(mockFindFirstCollaborator).toHaveBeenCalled()
      expect(result).toEqual({ email: "user@test.com", role: "editor" })
    })

    it("returns undefined when not found", async () => {
      mockFindFirstCollaborator.mockResolvedValue(undefined)

      const result = await getCollaborator("doc-id", "unknown@test.com")

      expect(result).toBeUndefined()
    })
  })

  describe("verifyDocumentAccess", () => {
    it("calls findFirst with documentId and token", async () => {
      mockFindFirstDocument.mockResolvedValue({ id: "doc-id", token: "abc123" })

      const result = await verifyDocumentAccess("doc-id", "abc123")

      expect(mockFindFirstDocument).toHaveBeenCalled()
      expect(result).toEqual({ id: "doc-id", token: "abc123" })
    })

    it("returns undefined when not found", async () => {
      mockFindFirstDocument.mockResolvedValue(undefined)

      const result = await verifyDocumentAccess("doc-id", "wrong-token")

      expect(result).toBeUndefined()
    })
  })
})
