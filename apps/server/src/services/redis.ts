import Redis from "ioredis"
import { env } from "../env"

export const redis = new Redis(env.REDIS_URL)

const DOC_PREFIX = "doc:"

export function getDocKey(documentId: string) {
  return `${DOC_PREFIX}${documentId}`
}

export async function getDocState(documentId: string): Promise<Buffer | null> {
  const data = await redis.getBuffer(getDocKey(documentId))
  return data
}

export async function setDocState(documentId: string, state: Buffer): Promise<void> {
  await redis.set(getDocKey(documentId), state)
}
