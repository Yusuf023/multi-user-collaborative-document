import cors from "cors"
import express from "express"
import rateLimit from "express-rate-limit"
import expressWebsockets from "express-ws"
import { pinoHttp } from "pino-http"
import { env } from "./env"
import { hocuspocus } from "./hocuspocus"
import { commentsRouter } from "./routes/comments"
import { documentsRouter } from "./routes/documents"
import { logger } from "./services/logger"

const { app } = expressWebsockets(express())

app.use(
  pinoHttp({
    logger,
    // Skip OPTIONS pre-flights and only emit at info on success — the message
    // already has method/URL/status so we don't need req/res serializers.
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error"
      if (res.statusCode >= 400) return "warn"
      if (req.method === "OPTIONS") return "debug"
      return "info"
    },
    customSuccessMessage: (req, res, responseTime) =>
      `${req.method} ${req.url} ${res.statusCode} (${responseTime}ms)`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${res.statusCode}: ${err.message}`,
    // Don't include req/res objects in the log — message has everything we need
    serializers: { req: () => undefined, res: () => undefined, responseTime: () => undefined }
  })
)

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json())

// Rate limit for unauthenticated endpoints (create, join)
const unauthenticatedLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" }
})

app.post("/api/documents", unauthenticatedLimiter)
app.post("/api/documents/join", unauthenticatedLimiter)

// REST routes
app.use("/api/documents", documentsRouter)
app.use("/api/comments", commentsRouter)

// WebSocket route for Hocuspocus.
// v3.4.3's handleConnection returns void and wires the websocket's
// message/close/error handling internally via its ClientConnection.
app.ws("/collaboration", (websocket, request) => {
  logger.info({ remoteAddress: request.socket.remoteAddress }, "ws /collaboration connection")

  hocuspocus.handleConnection(websocket, request)
})

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`)
})
