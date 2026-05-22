import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  title: text("title").default("Untitled Document").notNull(),
  finalized: boolean("finalized").default(false).notNull(),
  finalizedBy: text("finalized_by"),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})

export const collaborators = pgTable(
  "collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .references(() => documents.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    role: text("role", { enum: ["owner", "editor", "reviewer", "viewer"] }).notNull(),
    color: text("color").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [unique("collaborators_document_email_unique").on(table.documentId, table.email)]
)

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .references(() => documents.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  quotedText: text("quoted_text").notNull(),
  authorEmail: text("author_email").notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})

export const commentReplies = pgTable("comment_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  commentId: uuid("comment_id")
    .references(() => comments.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  authorEmail: text("author_email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})

export const documentSnapshots = pgTable("document_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .references(() => documents.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  state: text("state").notNull(), // base64 encoded Yjs state
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
})
