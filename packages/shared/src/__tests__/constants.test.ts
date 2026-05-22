import { describe, expect, it } from "vitest"
import { COLLABORATION_COLORS, INACTIVITY_TIMEOUT_MS, ROLES, TOKEN_LENGTH } from "../constants"

describe("constants", () => {
  describe("ROLES", () => {
    it("defines all four roles in order", () => {
      expect(ROLES).toEqual(["owner", "editor", "reviewer", "viewer"])
    })

    it("is a const tuple (readonly at type level)", () => {
      expect(ROLES.length).toBe(4)
    })
  })

  describe("COLLABORATION_COLORS", () => {
    it("has 20 colors", () => {
      expect(COLLABORATION_COLORS).toHaveLength(20)
    })

    it("all are valid hex colors", () => {
      for (const color of COLLABORATION_COLORS) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })

    it("has no duplicates", () => {
      const unique = new Set(COLLABORATION_COLORS)
      expect(unique.size).toBe(COLLABORATION_COLORS.length)
    })
  })

  describe("TOKEN_LENGTH", () => {
    it("is 6", () => {
      expect(TOKEN_LENGTH).toBe(6)
    })
  })

  describe("INACTIVITY_TIMEOUT_MS", () => {
    it("is 5 minutes in milliseconds", () => {
      expect(INACTIVITY_TIMEOUT_MS).toBe(300000)
    })
  })
})
