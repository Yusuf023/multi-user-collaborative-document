import cors from "cors"
import express from "express"
import rateLimit from "express-rate-limit"
import expressWebsockets from "express-ws"
import { env } from "./env"
import { hocuspocus } from "./hocuspocus"
import { commentsRouter } from "./routes/comments"
import { documentsRouter } from "./routes/documents"

const { app } = expressWebsockets(express())

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

// WebSocket route for Hocuspocus
app.ws("/collaboration", (websocket, request) => {
  hocuspocus.handleConnection(websocket, request as unknown as Request)
})

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`)
})
