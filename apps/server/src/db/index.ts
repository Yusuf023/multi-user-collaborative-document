import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { env } from "../env"
import * as schema from "./schema"

const dbPath = resolve(env.SQLITE_PATH)
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")
sqlite.pragma("synchronous = NORMAL")

export const db = drizzle(sqlite, { schema })
