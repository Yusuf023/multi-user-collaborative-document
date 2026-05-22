import { type ErrorResponse, errorResponseSchema } from "@collab/shared"
import axios, { type AxiosError, type AxiosRequestConfig } from "axios"
import type { ZodType } from "zod/v4"
import { env } from "@/env"

export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" }
})

export interface APIError extends Error {
  errorResponse: ErrorResponse
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.data) {
      const parsed = errorResponseSchema.safeParse(error.response.data)
      if (parsed.success) {
        const apiError = new Error(parsed.data.message || parsed.data.error) as APIError
        apiError.errorResponse = parsed.data
        return Promise.reject(apiError)
      }
    }
    return Promise.reject(error)
  }
)

/** Build auth headers from email + token */
export function authHeaders(email: string, token: string): Record<string, string> {
  return {
    "x-auth-email": email,
    "x-auth-token": token
  }
}

export async function apiGet<T>(
  url: string,
  schema: ZodType<T>,
  options?: AxiosRequestConfig
): Promise<T> {
  const response = await api.get(url, options)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    console.error("API response validation failed:", parsed.error)
    throw new Error("API response validation failed")
  }
  return parsed.data
}

export async function apiPost<TReq, TRes>(
  url: string,
  data: TReq,
  schema?: ZodType<TRes>,
  options?: AxiosRequestConfig
): Promise<TRes | null> {
  const response = await api.post(url, data, options)
  if (!schema) return null
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    console.error("API response validation failed:", parsed.error)
    throw new Error("API response validation failed")
  }
  return parsed.data
}

export async function apiPatch<TReq, TRes>(
  url: string,
  data: TReq,
  schema?: ZodType<TRes>,
  options?: AxiosRequestConfig
): Promise<TRes | null> {
  const response = await api.patch(url, data, options)
  if (!schema) return null
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    console.error("API response validation failed:", parsed.error)
    throw new Error("API response validation failed")
  }
  return parsed.data
}
