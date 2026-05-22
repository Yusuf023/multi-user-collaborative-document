import type { NextFunction, Request, Response } from "express"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod/v4"
import { validate } from "../middleware/validate"

function createMockReqResNext(body: unknown) {
  const req = { body } as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response
  const next = vi.fn() as NextFunction
  return { req, res, next }
}

describe("validate middleware", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive()
  })

  it("calls next when validation passes", () => {
    const { req, res, next } = createMockReqResNext({ name: "Alice", age: 30 })

    validate(schema)(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("sets req.body to parsed data", () => {
    const { req, res, next } = createMockReqResNext({ name: "Alice", age: 30, extra: true })

    validate(schema)(req, res, next)

    expect(req.body).toEqual({ name: "Alice", age: 30 })
  })

  it("returns 400 with error message on invalid input", () => {
    const { req, res, next } = createMockReqResNext({ name: "", age: -1 })

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
        message: expect.any(String)
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 400 when body is missing", () => {
    const { req, res, next } = createMockReqResNext(undefined)

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it("includes all error messages joined by comma", () => {
    const { req, res, next } = createMockReqResNext({})

    validate(schema)(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
        message: expect.stringContaining(",")
      })
    )
  })
})
