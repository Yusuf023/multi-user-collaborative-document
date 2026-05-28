import "dotenv/config"
import { cleanEnv, num, port, str, url } from "envalid"

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "test", "production"], default: "development" }),
  LOG_LEVEL: str({
    choices: ["fatal", "error", "warn", "info", "debug", "trace", "silent"],
    default: "info",
    desc: "Pino log level"
  }),
  PORT: port({ default: 4000 }),
  SQLITE_PATH: str({ default: "./data/poc.db", desc: "Path to SQLite database file" }),
  CACHE_DIR: str({ default: "./data/cache", desc: "Directory for per-doc cache files" }),
  RESEND_API_KEY: str({ default: "", desc: "Leave blank to disable email sending" }),
  RESEND_FROM_EMAIL: str({ default: "noreply@example.com" }),
  FRONTEND_URL: url({ default: "http://localhost:3000" }),
  CORS_ORIGIN: str({ default: "http://localhost:3000" }),
  DB_FLUSH_INTERVAL_MS: num({ default: 3000, desc: "Debounce interval for Yjs→SQLite writes" }),
  RATE_LIMIT_WINDOW_MS: num({ default: 60000, desc: "Rate limit window in ms" }),
  RATE_LIMIT_MAX_REQUESTS: num({
    default: 10,
    desc: "Max requests per window for rate-limited routes"
  })
})
