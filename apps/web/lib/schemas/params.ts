import { TOKEN_LENGTH } from "@collab/shared"
import { z } from "zod/v4"

export const documentPageParamsSchema = z.object({
  documentId: z.uuid()
})

export const documentPageSearchParamsSchema = z.object({
  email: z.email(),
  token: z.string().length(TOKEN_LENGTH)
})
