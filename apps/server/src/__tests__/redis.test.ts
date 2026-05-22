import { describe, expect, it, vi } from "vitest"

const mockGetBuffer = vi.hoisted(() => vi.fn())
const mockSet = vi.hoisted(() => vi.fn())

vi.mock("ioredis", () => ({
  default: class {
    getBuffer = mockGetBuffer
    set = mockSet
  }
}))

vi.mock("../env", () => ({
  env: { REDIS_URL: "redis://localhost:6379" }
}))

import { getDocKey, getDocState, setDocState } from "../services/redis"

describe("redis helpers", () => {
  describe("getDocKey", () => {
    it("prefixes with doc:", () => {
      expect(getDocKey("my-document")).toBe("doc:my-document")
    })
  })

  describe("getDocState", () => {
    it("calls getBuffer with correct key", async () => {
      const buffer = Buffer.from("state")
      mockGetBuffer.mockResolvedValue(buffer)

      const result = await getDocState("doc-id")

      expect(mockGetBuffer).toHaveBeenCalledWith("doc:doc-id")
      expect(result).toBe(buffer)
    })

    it("returns null when no state exists", async () => {
      mockGetBuffer.mockResolvedValue(null)

      const result = await getDocState("doc-id")

      expect(result).toBeNull()
    })
  })

  describe("setDocState", () => {
    it("calls set with correct key and buffer", async () => {
      const buffer = Buffer.from("new-state")
      mockSet.mockResolvedValue("OK")

      await setDocState("doc-id", buffer)

      expect(mockSet).toHaveBeenCalledWith("doc:doc-id", buffer)
    })
  })
})
