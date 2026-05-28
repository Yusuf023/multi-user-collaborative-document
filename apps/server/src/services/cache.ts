import { mkdirSync, readFileSync } from "node:fs"
import { rename, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { env } from "../env"
import { logger } from "./logger"

// Bare-metal cache: in-process Map (hot) + per-doc file on a mounted volume (warm).
// Same shape as the previous redis-backed service so call sites don't change.

const log = logger.child({ component: "cache" })

const cacheDir = resolve(env.CACHE_DIR)
mkdirSync(cacheDir, { recursive: true })

const memory = new Map<string, Buffer>()

function fileFor(documentId: string): string {
  // documentId is a UUID so it's filesystem-safe; guard anyway against path traversal.
  if (documentId.includes("/") || documentId.includes("..")) {
    throw new Error(`invalid documentId for cache key: ${documentId}`)
  }
  return join(cacheDir, `${documentId}.ybin`)
}

export async function getDocState(documentId: string): Promise<Buffer | null> {
  const hit = memory.get(documentId)
  if (hit) return hit

  try {
    const buf = readFileSync(fileFor(documentId))
    memory.set(documentId, buf)
    return buf
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null
    log.error({ err, documentId }, "cache file read failed")
    throw err
  }
}

export async function setDocState(documentId: string, state: Buffer): Promise<void> {
  memory.set(documentId, state)
  const target = fileFor(documentId)
  const tmp = `${target}.${process.pid}.tmp`
  await writeFile(tmp, state)
  await rename(tmp, target)
}
