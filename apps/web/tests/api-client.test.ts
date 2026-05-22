import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod/v4"

// Mock env
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:4000",
    NEXT_PUBLIC_WS_URL: "ws://localhost:4000"
  }
}))

// Mock @collab/shared
vi.mock("@collab/shared", () => ({
  errorResponseSchema: z.object({ error: z.string(), message: z.string().optional() })
}))

import { type APIError, api, apiGet, apiPatch, apiPost, authHeaders } from "../lib/api-client"

describe("api-client", () => {
  describe("authHeaders", () => {
    it("returns correct header object", () => {
      expect(authHeaders("user@test.com", "abc123")).toEqual({
        "x-auth-email": "user@test.com",
        "x-auth-token": "abc123"
      })
    })
  })

  describe("apiGet", () => {
    beforeEach(() => {
      vi.spyOn(api, "get")
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("returns parsed data on success", async () => {
      const schema = z.object({ name: z.string() })
      vi.mocked(api.get).mockResolvedValue({ data: { name: "test" } })

      const result = await apiGet("/test", schema)

      expect(result).toEqual({ name: "test" })
    })

    it("passes options to axios", async () => {
      const schema = z.object({ id: z.number() })
      vi.mocked(api.get).mockResolvedValue({ data: { id: 1 } })

      await apiGet("/test", schema, { headers: { "x-custom": "val" } })

      expect(api.get).toHaveBeenCalledWith("/test", { headers: { "x-custom": "val" } })
    })

    it("throws on validation failure", async () => {
      const schema = z.object({ name: z.string() })
      vi.mocked(api.get).mockResolvedValue({ data: { wrong: 123 } })

      await expect(apiGet("/test", schema)).rejects.toThrow("API response validation failed")
    })
  })

  describe("apiPost", () => {
    beforeEach(() => {
      vi.spyOn(api, "post")
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("returns null if no schema provided", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { anything: true } })

      const result = await apiPost("/test", { data: "x" })

      expect(result).toBeNull()
    })

    it("returns parsed data with schema", async () => {
      const schema = z.object({ id: z.string() })
      vi.mocked(api.post).mockResolvedValue({ data: { id: "abc" } })

      const result = await apiPost("/test", { name: "x" }, schema)

      expect(result).toEqual({ id: "abc" })
    })

    it("throws on validation failure", async () => {
      const schema = z.object({ id: z.number() })
      vi.mocked(api.post).mockResolvedValue({ data: { id: "not-a-number" } })

      await expect(apiPost("/test", {}, schema)).rejects.toThrow("API response validation failed")
    })

    it("passes options including headers", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: null })

      await apiPost("/test", { a: 1 }, undefined, {
        headers: { "x-auth-email": "x" }
      })

      expect(api.post).toHaveBeenCalledWith(
        "/test",
        { a: 1 },
        {
          headers: { "x-auth-email": "x" }
        }
      )
    })
  })

  describe("apiPatch", () => {
    beforeEach(() => {
      vi.spyOn(api, "patch")
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("returns null if no schema provided", async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: {} })

      const result = await apiPatch("/test", { data: "x" })

      expect(result).toBeNull()
    })

    it("returns parsed data with schema", async () => {
      const schema = z.object({ success: z.boolean() })
      vi.mocked(api.patch).mockResolvedValue({ data: { success: true } })

      const result = await apiPatch("/test", {}, schema)

      expect(result).toEqual({ success: true })
    })

    it("throws on validation failure", async () => {
      const schema = z.object({ ok: z.boolean() })
      vi.mocked(api.patch).mockResolvedValue({ data: { wrong: "x" } })

      await expect(apiPatch("/test", {}, schema)).rejects.toThrow("API response validation failed")
    })
  })

  describe("error interceptor", () => {
    it("transforms error response matching errorResponseSchema into APIError", async () => {
      // Access the interceptor directly from axios instance
      const interceptors = (api.interceptors.response as any).handlers
      const errorHandler = interceptors[0].rejected

      // Simulate an AxiosError with response data matching errorResponseSchema
      const axiosError = {
        response: {
          data: { error: "Not found", message: "Document not found" }
        }
      }

      try {
        await errorHandler(axiosError)
        expect.fail("Should have rejected")
      } catch (err: unknown) {
        const apiError = err as APIError
        expect(apiError.message).toBe("Document not found")
        expect(apiError.errorResponse).toEqual({
          error: "Not found",
          message: "Document not found"
        })
      }
    })

    it("transforms error without message field", async () => {
      const interceptors = (api.interceptors.response as any).handlers
      const errorHandler = interceptors[0].rejected

      const axiosError = {
        response: {
          data: { error: "Forbidden" }
        }
      }

      try {
        await errorHandler(axiosError)
        expect.fail("Should have rejected")
      } catch (err: unknown) {
        const apiError = err as APIError
        expect(apiError.message).toBe("Forbidden")
      }
    })

    it("passes through errors that don't match errorResponseSchema", async () => {
      const interceptors = (api.interceptors.response as any).handlers
      const errorHandler = interceptors[0].rejected

      const axiosError = {
        response: {
          data: { invalid: "structure" }
        }
      }

      try {
        await errorHandler(axiosError)
        expect.fail("Should have rejected")
      } catch (err: unknown) {
        // Should pass through the original error
        expect(err).toBe(axiosError)
      }
    })

    it("passes through errors without response data", async () => {
      const interceptors = (api.interceptors.response as any).handlers
      const errorHandler = interceptors[0].rejected

      const axiosError = { response: null }

      try {
        await errorHandler(axiosError)
        expect.fail("Should have rejected")
      } catch (err: unknown) {
        expect(err).toBe(axiosError)
      }
    })

    it("success interceptor passes response through", () => {
      const interceptors = (api.interceptors.response as any).handlers
      const successHandler = interceptors[0].fulfilled

      const response = { data: { test: true }, status: 200 }
      expect(successHandler(response)).toBe(response)
    })
  })
})
