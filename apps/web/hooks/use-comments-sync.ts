"use client"

import type { Comment } from "@collab/shared"
import { commentSchema } from "@collab/shared"
import type { HocuspocusProvider } from "@hocuspocus/provider"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { z } from "zod/v4"
import { apiGet, authHeaders } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"

const commentsListSchema = z.array(commentSchema)
const COMMENTS_META_KEY = "commentsVersion"

/**
 * Real-time comments sync via Yjs shared map.
 * When any client mutates comments, it increments a version counter
 * in the Yjs doc's "meta" map. All clients observe this and refetch.
 */
export function useCommentsSync(
  provider: HocuspocusProvider | null,
  documentId: string,
  email: string,
  token: string
) {
  const [comments, setComments] = useState<Comment[]>([])
  const fetchErrorCount = useRef(0)
  const lastVersion = useRef(0)

  const fetchComments = useCallback(async () => {
    try {
      const data = await apiGet(API_ROUTES.comments.list(documentId), commentsListSchema, {
        headers: authHeaders(email, token)
      })
      setComments(data)
      fetchErrorCount.current = 0
    } catch {
      fetchErrorCount.current += 1
      if (fetchErrorCount.current === 3) {
        toast.error("Failed to load comments. Will keep retrying.")
      }
    }
  }, [documentId, email, token])

  // Signal other clients that comments changed and immediately refetch locally
  const notifyCommentsChanged = useCallback(() => {
    if (!provider) return
    const meta = provider.document.getMap("meta")
    const current = (meta.get(COMMENTS_META_KEY) as number) || 0
    const next = current + 1
    meta.set(COMMENTS_META_KEY, next)
    // Update lastVersion so the observer doesn't double-fetch
    lastVersion.current = next
    fetchComments()
  }, [provider, fetchComments])

  useEffect(() => {
    if (!provider) return

    const meta = provider.document.getMap("meta")

    // Observe version changes from other clients
    const observer = () => {
      const version = (meta.get(COMMENTS_META_KEY) as number) || 0
      if (version !== lastVersion.current) {
        lastVersion.current = version
        fetchComments()
      }
    }

    meta.observe(observer)

    // Reset lastVersion and refetch on reconnect so we don't miss updates
    const onStatus = ({ status }: { status: string }) => {
      if (status === "connected") {
        lastVersion.current = 0
        fetchComments()
      }
    }
    provider.on("status", onStatus)

    // Initial fetch
    fetchComments()

    return () => {
      meta.unobserve(observer)
      provider.off("status", onStatus)
    }
  }, [provider, fetchComments])

  return { comments, fetchComments, notifyCommentsChanged }
}
