# High-Level Design — Collaborative Document

## 1. Goals & Constraints

**Goals.** Multi-user, real-time collaborative document editor with:

- Concurrent rich-text editing (CRDT-backed, conflict-free)
- Live awareness (cursors, presence, user colors)
- Threaded inline comments + replies + resolve
- Per-document collaborator roles (owner / editor / reviewer / viewer)
- Document finalization (read-only lock)
- Real-time title editing

**Environment constraints.**

- **Restricted package registry.** `@hocuspocus/provider` and `@hocuspocus/common` are available, but `@hocuspocus/server` is **not**. The server must be implemented in-house while remaining wire-compatible with the provider.
- **Cache layer is flexible.** Either Redis (preferred when available) or a volume-mounted on-disk cache co-located with the server process. The cache interface is abstracted so either backend can slot in.

---

## 2. Architecture Overview

```text
                            ┌─────────────────────────────┐
                            │           Browser           │
                            │  (Next.js + TipTap + Yjs)   │
                            └────────────┬────────────────┘
                                         │
                       ┌─────────────────┼──────────────────┐
                       │  REST/HTTPS     │   WebSocket      │
                       │  (CRUD + auth)  │   (Yjs sync +    │
                       │                 │    awareness)    │
                       ▼                 ▼                  │
              ┌──────────────────────────────────┐          │
              │       Backend (Node + Express)   │          │
              │  ┌──────────────┐ ┌────────────┐ │          │
              │  │  REST API    │ │  Custom    │ │          │
              │  │  Controllers │ │  Yjs WS    │ │          │
              │  │              │ │  Server    │ │          │
              │  └──────┬───────┘ └─────┬──────┘ │          │
              │         │  Auth         │        │          │
              │         │  middleware   │        │          │
              └─────────┼───────────────┼────────┘          │
                        │               │                   │
            ┌───────────┴───┐    ┌──────┴──────┐            │
            │   Postgres    │    │    Cache    │            │
            │  (durable)    │    │  (hot doc   │            │
            │               │    │   state)    │            │
            │ documents     │    │             │            │
            │ collaborators │    │ Redis  OR   │            │
            │ comments      │    │ Volume mount│            │
            │ comment_replies│   │             │            │
            │ document_snapshots │             │            │
            └───────────────┘    └─────────────┘            │
                                                            │
                       ┌────────────────────────────────────┘
                       │
                       ▼
              ┌───────────────────┐
              │   Email (Resend)  │  ← invitation links
              └───────────────────┘
```

---

## 3. Technology Choices Per Layer

### 3.1 Frontend

| Concern               | Choice                                          | Why                                                                 |
|-----------------------|-------------------------------------------------|---------------------------------------------------------------------|
| App framework         | **Next.js (App Router)**                        | Server components for landing/list views, client islands for editor |
| Rich-text editor      | **TipTap 3** (ProseMirror under the hood)       | First-class Yjs integration via `@tiptap/extension-collaboration`   |
| CRDT runtime          | **Yjs**                                         | Mature, small, the wire format the provider speaks                  |
| Realtime client       | **`@hocuspocus/provider`**                      | Available in the registry; handles reconnect, sync, awareness       |
| Awareness UI          | **`@tiptap/extension-collaboration-caret`**     | Renders remote cursors/selections from awareness state              |
| State sync (comments) | Custom hook over Yjs meta map (see §6)          | Reuses the WS channel as a pub/sub bus — no extra infra             |
| UI primitives         | Radix UI / Base UI + Tailwind                   | Accessible primitives, design freedom                               |
| Forms / validation    | `react-hook-form` + Zod (`@collab/shared`)      | Shared schemas with backend                                         |

### 3.2 Backend

| Concern               | Choice                                          | Why                                                                 |
|-----------------------|-------------------------------------------------|---------------------------------------------------------------------|
| Runtime               | **Node.js 20+** (TypeScript via `tsx`)          | Mature Yjs ecosystem                                                |
| HTTP framework        | **Express 5** + `express-ws`                    | HTTP and WS share one process/port; minimal surface area            |
| **Yjs WS server**     | **In-house** (uses `yjs` + `y-protocols` + `ws`)| `@hocuspocus/server` unavailable; we implement the protocol         |
| Schema validation     | Zod (`@collab/shared`)                          | One schema definition shared web ↔ server                           |
| ORM                   | Drizzle                                         | Type-safe, lightweight, plays well with Postgres                    |
| Logging               | Pino + pino-http                                | Structured JSON logs, low overhead                                  |
| Email                 | Resend                                          | Used only for invitation links                                      |
| Rate limiting         | `express-rate-limit`                            | Protect unauthenticated endpoints (create/join)                     |

### 3.3 Database (durable storage)

**Postgres.** All durable state lives here. Tables (see `apps/server/src/db/schema.ts`):

- `documents` — id, token (join secret), title, finalized flag/by/at, createdAt
- `collaborators` — (documentId, email) unique; role + display color
- `comments` — id, documentId, content, quotedText, authorEmail, resolved
- `comment_replies` — id, commentId, content, authorEmail
- `document_snapshots` — one row per document; base64-encoded Yjs binary state (the latest snapshot, upserted on flush)

Snapshots are the **source of truth for document content**. The cache is just a fast-path; if the cache is wiped, snapshots can be replayed.

### 3.4 Cache (hot document state)

The cache holds the **current binary Yjs state** of every actively-edited document, keyed by `doc:<documentId>`. Reads on document load hit the cache first; writes go to cache on every `store` tick and to Postgres on a debounced timer.

Two backends, behind one interface (`get(id) → Buffer|null`, `set(id, Buffer)`):

| Aspect        | Redis                                    | Volume-mount file cache                           |
|---------------|------------------------------------------|---------------------------------------------------|
| Topology      | Separate process; shared across replicas | Local to the server pod; one cache per replica    |
| Multi-replica | ✅ Works out of the box                  | ⚠️ Requires sticky sessions per document          |
| Failover      | ✅ Survives server pod restart           | ⚠️ Lost on pod replacement (DB snapshot recovers) |
| Latency       | ~1ms (network)                           | ~0.1ms (local disk / page cache)                  |
| Ops burden    | Need Redis available                     | Just a PVC                                        |
| When to pick  | Multi-replica deploys                    | Single-replica or restricted environments         |

**Both backends fall back to Postgres on miss**, so neither cache being unavailable causes data loss — only added load on Postgres.

---

## 4. The In-House Yjs WebSocket Server

This is the only part that materially differs from the POC. The wire protocol the provider speaks is **`y-protocols/sync` + `y-protocols/awareness` framed as binary WS messages**. We implement the protocol against `ws` + `yjs` directly.

**Responsibilities:**

1. **Connection lifecycle** — accept WS upgrade on `/collaboration?documentName=<id>`, run the auth handshake (a custom AUTH message the provider sends), then enter sync mode.
2. **Per-document `Y.Doc` registry** — one server-side `Y.Doc` instance per active document, shared across all connected clients for that doc. Created on first connection (state loaded from cache → DB), destroyed when the last client disconnects (after a grace period).
3. **Sync protocol** — handle sync step 1 / step 2 / update messages using `y-protocols/sync`. On any update: apply to the server's `Y.Doc`, broadcast to other connected clients, mark dirty.
4. **Awareness** — handle awareness messages using `y-protocols/awareness`. Awareness is NOT persisted; it's ephemeral broadcast only.
5. **Persistence hooks** — on `Y.Doc` update event: write binary state to cache immediately; schedule a debounced flush to `document_snapshots`. On graceful shutdown: flush all pending writes.
6. **Auth + read-only enforcement** — verify `email|docToken`, look up role, set per-connection `readOnly` if role ∈ {viewer, reviewer} or the document is finalized. Read-only connections receive updates but their inbound update messages are dropped.

**Why this is tractable.** The protocol is small (~3 message types for sync, 1 for awareness, plus our custom AUTH). The POC's `apps/server/src/hocuspocus.ts` is essentially the same logic minus the protocol plumbing — `fetch`/`store`/auth callbacks port over almost verbatim into the in-house server's hooks.

---

## 5. Auth Flow

1. User creates a doc → server returns `{ documentId, token }`. Token is the join secret.
2. User shares a join link `/<documentId>?token=...&email=...`. Recipient hits the join endpoint, server adds them to `collaborators`.
3. Client constructs an auth token `email|docToken` and passes it to `HocuspocusProvider`.
4. On WS connect, server validates the token, looks up the collaborator row, attaches `{ email, role, color }` to the connection context, and decides read-only status.
5. REST endpoints use the same `email|docToken` via an `authenticate` middleware that re-runs the same lookup.

---

## 6. Comments & Meta Sync Flow

This is the most interesting design point: **comments are stored in Postgres, but real-time fan-out uses the Yjs `meta` map as a lightweight pub/sub channel.** Two different patterns live in the same map:

| Key                    | Type              | Pattern                                                                          |
|------------------------|-------------------|----------------------------------------------------------------------------------|
| `meta.title`           | string (value)    | Yjs is the source of truth; debounced mirror to `documents.title` for list views |
| `meta.commentsVersion` | integer (counter) | Bump-and-refetch signal; data itself lives in Postgres                           |

### 6.1 Why this split

- **Title** is a single short string with no merge complexity worth modeling outside Yjs. Letting Yjs own it gives free real-time editing.
- **Comments** are relational (replies, resolution, author lookups), have non-trivial validation, and benefit from REST endpoints for non-collaborative views (e.g., notifications, audit). Storing the full comments list in Yjs would duplicate the source of truth and complicate consistency.

The version counter gets the best of both: REST owns the write, Yjs handles the "tell every connected client to refetch" fan-out — for free, over the WebSocket connection they already have.

### 6.2 Create-comment sequence

```text
Client A                  Backend                  Postgres        Cache       Client B
  │                          │                        │              │            │
  │  POST /api/comments      │                        │              │            │
  ├─────────────────────────►│                        │              │            │
  │                          │  INSERT comment        │              │            │
  │                          ├───────────────────────►│              │            │
  │                          │  ✓                     │              │            │
  │                          │◄───────────────────────┤              │            │
  │   201 Created            │                        │              │            │
  │◄─────────────────────────┤                        │              │            │
  │                                                                               │
  │  meta.commentsVersion++  (Yjs update over WS)                                 │
  ├──────────────────────────►──────────────────────────────────────────────────►│
  │                          │ apply to server Y.Doc                              │
  │                          │ write to cache                                     │
  │                          │ debounce write to document_snapshots               │
  │                          │ broadcast update to other clients                  │
  │                                                                               │
  │                                                              observe meta     │
  │                                                              version changed  │
  │                                                                               │
  │                          │◄─── GET /api/comments ─────────────────────────────┤
  │                          │  SELECT comments + replies                         │
  │                          ├───────────────────────►│                           │
  │                          │  ✓                     │                           │
  │                          │◄───────────────────────┤                           │
  │                          ├──── 200 OK ────────────────────────────────────────►│
```

Same pattern for reply / resolve.

### 6.3 Title edit sequence

```text
Client A                Backend (WS)            Cache         Postgres        Client B
  │                          │                    │              │              │
  │ meta.title.set("Foo")    │                    │              │              │
  ├─────────────────────────►│                    │              │              │
  │                          │ apply to Y.Doc     │              │              │
  │                          │ write binary state │              │              │
  │                          ├───────────────────►│              │              │
  │                          │ debounce snapshot  │              │              │
  │                          ├──────────────────────────────────►│              │
  │                          │ broadcast update   │              │              │
  │                          ├─────────────────────────────────────────────────►│
  │                                                                             │
  │  (also, debounced) PATCH /api/documents/title  ← mirrors to documents.title │
  │  so home page / list views see the new title without loading the Y.Doc      │
```

### 6.4 Document content (TipTap) sequence

Identical to title, except the shared type is the `Y.XmlFragment` named `"default"` (TipTap's collaboration field), and there's no REST mirror — content lives only in `document_snapshots`.

---

## 7. Persistence Strategy

- **Write path:** every Yjs update → cache (sync, on the hot path) + debounced snapshot to Postgres (default ~5s after last update).
- **Read path:** on first WS connection for a doc → cache first, fall back to Postgres (and re-warm cache).
- **Snapshot format:** full binary `Y.encodeStateAsUpdate(doc)` blob, base64 in the `document_snapshots.state` text column, one row per doc, upserted in place. Simple; no update log to compact.
- **Shutdown:** SIGTERM/SIGINT triggers a synchronous flush of all pending debounced writes before exit.

Trade-off: a hard crash between debounce ticks loses ≤ `DB_FLUSH_INTERVAL_MS` of edits for active docs. The cache still has them, so as long as the cache survives the restart this is invisible. For Redis: survives pod restart. For volume-mount: survives pod restart on the same node, lost on pod re-schedule.

---

## 8. Read-Only / Finalization

- A collaborator with role `viewer` or `reviewer` connects in read-only mode: they receive sync + awareness, but their inbound update messages are dropped server-side.
- `documents.finalized = true` makes the doc read-only for **everyone** including the owner. Enforced both at WS connect time (no updates accepted) and at REST mutation endpoints.

---

## 9. Failure Modes & Recovery

| Failure                                             | Behavior                                                                                                                                                                                                      |
|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Cache unavailable                                   | All loads fall through to Postgres; writes succeed on flush. Slower but correct.                                                                                                                              |
| Postgres unavailable                                | Writes queue; flush retries; clients keep editing against cache. Persistence eventually catches up or alerts fire.                                                                                            |
| Server pod crash                                    | Active clients reconnect via provider's exponential backoff. State recovers from cache or DB snapshot.                                                                                                        |
| Provider/server protocol skew                       | Pin `@hocuspocus/provider` and `@hocuspocus/common` to versions we've tested against the in-house server. Add a contract test that drives the real provider against a test server instance.                   |
| Comments REST write succeeds but version bump fails | Comment exists in DB but other clients won't see it until next reconnect (which triggers a refetch). Self-healing but delayed. Could be tightened by having the server bump the version after the REST write. |

---

## 10. Open Questions / Decisions for Later

- **Multi-replica scaling.** The current design assumes one server replica per document (a doc's `Y.Doc` lives in one process). Multi-replica requires either (a) sticky routing by `documentId`, or (b) a Redis-backed pub/sub fan-out between replicas. Pick when load justifies it.
- **Snapshot history.** Today we keep only the latest snapshot. If we need history (undo across sessions, audit), switch to an append-only `document_updates` table and periodically compact.
- **Comment positioning.** Comments currently store `quotedText`; anchoring to a Yjs relative position (so highlights survive edits) is a future enhancement and would push more comment state into Yjs.
- **Server-driven version bump.** Move the `meta.commentsVersion++` from client to server (right after the DB write) to eliminate the small window where the REST write commits but the bump never sends.
