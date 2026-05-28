import "dotenv/config"
import { bool, cleanEnv, num, port, str, url } from "envalid"

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
  SMTP_HOST: str({ default: "", desc: "SMTP relay host. Leave blank to disable email sending" }),
  SMTP_PORT: port({ default: 587, desc: "SMTP port (587 STARTTLS, 465 implicit TLS)" }),
  SMTP_SECURE: bool({ default: false, desc: "true for port 465 (implicit TLS)" }),
  SMTP_USER: str({ default: "", desc: "SMTP username (blank = unauthenticated relay)" }),
  SMTP_PASS: str({ default: "" }),
  MAIL_FROM: str({ default: "No Reply <noreply@example.com>" }),
  FRONTEND_URL: url({ default: "http://localhost:3000" }),
  CORS_ORIGIN: str({ default: "http://localhost:3000" }),
  DB_FLUSH_INTERVAL_MS: num({ default: 3000, desc: "Debounce interval for Yjs→SQLite writes" }),
  RATE_LIMIT_WINDOW_MS: num({ default: 60000, desc: "Rate limit window in ms" }),
  RATE_LIMIT_MAX_REQUESTS: num({
    default: 10,
    desc: "Max requests per window for rate-limited routes"
  })
})
