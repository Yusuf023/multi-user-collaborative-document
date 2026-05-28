import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"

const newId = () => randomUUID()
const nowMs = sql`(unixepoch() * 1000)`

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey().$defaultFn(newId),
  token: text("token").notNull(),
  title: text("title").default("Untitled Document").notNull(),
  finalized: integer("finalized", { mode: "boolean" }).default(false).notNull(),
  finalizedBy: text("finalized_by"),
  finalizedAt: integer("finalized_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs)
})

export const collaborators = sqliteTable(
  "collaborators",
  {
    id: text("id").primaryKey().$defaultFn(newId),
    documentId: text("document_id")
      .references(() => documents.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    role: text("role", { enum: ["owner", "editor", "reviewer", "viewer"] }).notNull(),
    color: text("color").notNull(),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull().default(nowMs)
  },
  (table) => [unique("collaborators_document_email_unique").on(table.documentId, table.email)]
)

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey().$defaultFn(newId),
  documentId: text("document_id")
    .references(() => documents.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  quotedText: text("quoted_text").notNull(),
  authorEmail: text("author_email").notNull(),
  resolved: integer("resolved", { mode: "boolean" }).default(false).notNull(),
  resolvedBy: text("resolved_by"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs)
})

export const commentReplies = sqliteTable("comment_replies", {
  id: text("id").primaryKey().$defaultFn(newId),
  commentId: text("comment_id")
    .references(() => comments.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  authorEmail: text("author_email").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs)
})

export const documentSnapshots = sqliteTable("document_snapshots", {
  id: text("id").primaryKey().$defaultFn(newId),
  documentId: text("document_id")
    .references(() => documents.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  state: text("state").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs)
})
