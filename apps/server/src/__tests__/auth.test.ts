import { describe, expect, it, vi } from "vitest"
import { normalizeEmail, requireRole } from "../utils/auth"

// Mock db module
vi.mock("../db", () => ({
  db: {
    query: {
      collaborators: { findFirst: vi.fn() },
      documents: { findFirst: vi.fn() }
    }
  }
}))

describe("auth helpers", () => {
  describe("normalizeEmail", () => {
    it("lowercases email", () => {
      expect(normalizeEmail("User@Example.COM")).toBe("user@example.com")
    })

    it("trims whitespace", () => {
      expect(normalizeEmail("  user@test.com  ")).toBe("user@test.com")
    })

    it("handles already normalized email", () => {
      expect(normalizeEmail("user@test.com")).toBe("user@test.com")
    })

    it("handles mixed case with whitespace", () => {
      expect(normalizeEmail("  UsEr@Test.Com ")).toBe("user@test.com")
    })
  })

  describe("requireRole", () => {
    it("returns true when role is in allowed list", () => {
      expect(requireRole("owner", ["owner", "editor"])).toBe(true)
    })

    it("returns false when role is not in allowed list", () => {
      expect(requireRole("viewer", ["owner", "editor"])).toBe(false)
    })

    it("works with single role", () => {
      expect(requireRole("owner", ["owner"])).toBe(true)
      expect(requireRole("editor", ["owner"])).toBe(false)
    })

    it("works with all roles", () => {
      expect(requireRole("reviewer", ["owner", "editor", "reviewer", "viewer"])).toBe(true)
    })
  })
})
