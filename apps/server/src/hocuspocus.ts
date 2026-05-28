import { Database } from "@hocuspocus/extension-database"
import { Hocuspocus } from "@hocuspocus/server"
import { eq } from "drizzle-orm"
import { db } from "./db"
import { documentSnapshots } from "./db/schema"
import { env } from "./env"
import { getDocState, setDocState } from "./services/cache"
import { logger } from "./services/logger"
import { getCollaborator, normalizeEmail, verifyDocumentAccess } from "./utils/auth"

const log = logger.child({ component: "hocuspocus" })

// Track pending flush timers and their latest state
const pendingFlushes = new Map<string, ReturnType<typeof setTimeout>>()
const pendingStates = new Map<string, Uint8Array>()

async function flushToDb(documentName: string, state: Uint8Array) {
  const base64State = Buffer.from(state).toString("base64")
  await db
    .insert(documentSnapshots)
    .values({ documentId: documentName, state: base64State })
    .onConflictDoUpdate({
      target: documentSnapshots.documentId,
      set: { state: base64State, updatedAt: new Date() }
    })
}

function debouncedDbFlush(documentName: string, state: Uint8Array) {
  const existing = pendingFlushes.get(documentName)
  if (existing) clearTimeout(existing)

  // Always keep latest state for shutdown flush
  pendingStates.set(documentName, state)

  const timeout = setTimeout(async () => {
    pendingFlushes.delete(documentName)
    pendingStates.delete(documentName)
    try {
      await flushToDb(documentName, state)
      log.debug({ documentName, bytes: state.length }, "debounced db flush")
    } catch (err) {
      log.error({ err, documentName }, "debounced db flush failed")
    }
  }, env.DB_FLUSH_INTERVAL_MS)

  pendingFlushes.set(documentName, timeout)
}

export const hocuspocus = new Hocuspocus({
  async onConnect({ documentName }) {
    log.info({ documentName }, "connect")
  },

  async onDisconnect({ documentName }) {
    log.info({ documentName }, "disconnect")
  },

  async onAuthenticate({ token, documentName, connectionConfig }) {
    log.debug({ documentName }, "authenticate")
    // token format: "email|docToken" — pipe delimiter avoids issues with : in emails
    const separatorIndex = token.lastIndexOf("|")

    if (separatorIndex === -1) {
      throw new Error("Invalid authentication token format")
    }

    const email = normalizeEmail(token.slice(0, separatorIndex))
    const docToken = token.slice(separatorIndex + 1)

    if (!email || !docToken) {
      throw new Error("Invalid authentication token")
    }

    const document = await verifyDocumentAccess(documentName, docToken)
    if (!document) {
      throw new Error("Document not found")
    }

    const collaborator = await getCollaborator(documentName, email)
    if (!collaborator) {
      throw new Error("Access denied")
    }

    // Finalized documents are read-only for everyone, regardless of role
    if (document.finalized) {
      connectionConfig.readOnly = true
    } else if (collaborator.role === "viewer" || collaborator.role === "reviewer") {
      connectionConfig.readOnly = true
    }

    return {
      user: {
        email,
        role: collaborator.role,
        color: collaborator.color
      }
    }
  },

  extensions: [
    new Database({
      async fetch({ documentName }) {
        // Try cache first (in-memory + volume file)
        const cached = await getDocState(documentName)
        if (cached) {
          log.debug({ documentName, source: "cache", bytes: cached.length }, "fetch hit")
          return new Uint8Array(cached)
        }

        // Fall back to SQLite
        const snapshot = await db.query.documentSnapshots.findFirst({
          where: eq(documentSnapshots.documentId, documentName)
        })

        if (snapshot) {
          const buffer = Buffer.from(snapshot.state, "base64")
          log.debug({ documentName, source: "sqlite", bytes: buffer.length }, "fetch hit")
          await setDocState(documentName, buffer)
          return new Uint8Array(buffer)
        }

        log.debug({ documentName }, "fetch miss (new doc)")
        return null
      },

      async store({ documentName, state }) {
        log.debug({ documentName, bytes: state.length }, "store")
        const buffer = Buffer.from(state)

        try {
          await setDocState(documentName, buffer)
        } catch (err) {
          log.error({ err, documentName }, "cache store failed")
        }

        debouncedDbFlush(documentName, state)
      }
    })
  ]
})

// Flush all pending DB writes on shutdown
async function flushAllPending() {
  const entries = [...pendingStates.entries()]
  for (const [documentName, timeout] of pendingFlushes) {
    clearTimeout(timeout)
    pendingFlushes.delete(documentName)
  }

  await Promise.allSettled(
    entries.map(async ([documentName, state]) => {
      try {
        await flushToDb(documentName, state)
        log.info({ documentName, bytes: state.length }, "shutdown flush complete")
      } catch (err) {
        log.error({ err, documentName }, "shutdown flush failed")
      }
    })
  )

  pendingStates.clear()
}

async function gracefulShutdown() {
  await flushAllPending()
  process.exit(0)
}

process.on("SIGTERM", () => {
  void gracefulShutdown()
})
process.on("SIGINT", () => {
  void gracefulShutdown()
})

// Exported for testing
export { debouncedDbFlush, flushAllPending, flushToDb, pendingFlushes, pendingStates }
