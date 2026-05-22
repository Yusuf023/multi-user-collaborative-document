import "dotenv/config"
import { cleanEnv, num, port, str, url } from "envalid"

export const env = cleanEnv(process.env, {
  PORT: port({ default: 4000 }),
  DATABASE_URL: url(),
  REDIS_URL: url(),
  RESEND_API_KEY: str(),
  RESEND_FROM_EMAIL: str({ default: "noreply@example.com" }),
  FRONTEND_URL: url({ default: "http://localhost:3000" }),
  CORS_ORIGIN: str({ default: "http://localhost:3000" }),
  DB_FLUSH_INTERVAL_MS: num({ default: 3000, desc: "Debounce interval for Yjs→Postgres writes" }),
  RATE_LIMIT_WINDOW_MS: num({ default: 60000, desc: "Rate limit window in ms" }),
  RATE_LIMIT_MAX_REQUESTS: num({
    default: 10,
    desc: "Max requests per window for rate-limited routes"
  })
})
