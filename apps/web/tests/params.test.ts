import { describe, expect, it } from "vitest"

vi.mock("@collab/shared", () => ({
  TOKEN_LENGTH: 6
}))

import { vi } from "vitest"
import { documentPageParamsSchema, documentPageSearchParamsSchema } from "../lib/schemas/params"

describe("page params schemas", () => {
  describe("documentPageParamsSchema", () => {
    it("accepts valid UUID documentId", () => {
      const result = documentPageParamsSchema.safeParse({
        documentId: "550e8400-e29b-41d4-a716-446655440000"
      })
      expect(result.success).toBe(true)
    })

    it("rejects invalid UUID", () => {
      const result = documentPageParamsSchema.safeParse({ documentId: "not-uuid" })
      expect(result.success).toBe(false)
    })

    it("rejects missing documentId", () => {
      const result = documentPageParamsSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe("documentPageSearchParamsSchema", () => {
    it("accepts valid email and token", () => {
      const result = documentPageSearchParamsSchema.safeParse({
        email: "user@test.com",
        token: "abc123"
      })
      expect(result.success).toBe(true)
    })

    it("rejects invalid email", () => {
      const result = documentPageSearchParamsSchema.safeParse({
        email: "not-email",
        token: "abc123"
      })
      expect(result.success).toBe(false)
    })

    it("rejects wrong token length", () => {
      const result = documentPageSearchParamsSchema.safeParse({
        email: "user@test.com",
        token: "ab"
      })
      expect(result.success).toBe(false)
    })

    it("rejects missing fields", () => {
      expect(documentPageSearchParamsSchema.safeParse({}).success).toBe(false)
      expect(documentPageSearchParamsSchema.safeParse({ email: "a@b.com" }).success).toBe(false)
    })
  })
})
