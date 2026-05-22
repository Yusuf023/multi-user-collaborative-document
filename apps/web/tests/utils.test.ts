import { describe, expect, it } from "vitest"
import { cn, getInitials } from "../lib/utils"

describe("utils", () => {
  describe("cn", () => {
    it("merges class names", () => {
      expect(cn("px-2", "py-1")).toBe("px-2 py-1")
    })

    it("handles conflicting tailwind classes", () => {
      expect(cn("px-2", "px-4")).toBe("px-4")
    })

    it("handles conditional classes", () => {
      expect(cn("base", false && "hidden", "visible")).toBe("base visible")
    })

    it("handles undefined and null", () => {
      expect(cn("base", undefined, null, "end")).toBe("base end")
    })

    it("handles empty input", () => {
      expect(cn()).toBe("")
    })
  })

  describe("getInitials", () => {
    it("returns first two chars for simple email", () => {
      expect(getInitials("john@example.com")).toBe("JO")
    })

    it("returns initials from dot-separated name", () => {
      expect(getInitials("john.doe@example.com")).toBe("JD")
    })

    it("returns initials from underscore-separated name", () => {
      expect(getInitials("jane_smith@example.com")).toBe("JS")
    })

    it("returns initials from hyphen-separated name", () => {
      expect(getInitials("bob-jones@example.com")).toBe("BJ")
    })

    it("returns ? for empty email prefix", () => {
      expect(getInitials("@example.com")).toBe("?")
    })

    it("uppercases result", () => {
      expect(getInitials("alice@example.com")).toBe("AL")
    })
  })
})
