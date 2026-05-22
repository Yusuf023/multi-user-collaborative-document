import type { NextFunction, Request, Response } from "express"
import type { ZodType } from "zod/v4"

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        message: result.error.issues.map((i) => i.message).join(", ")
      })
      return
    }
    req.body = result.data
    next()
  }
}
