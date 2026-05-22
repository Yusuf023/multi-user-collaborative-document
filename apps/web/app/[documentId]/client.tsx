"use client"

import type { Collaborator, DocumentDetails } from "@collab/shared"
import { documentDetailsSchema } from "@collab/shared"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { useCallback, useEffect, useState } from "react"
import { DocumentEditor } from "@/components/document/document-editor"
import { DocumentHeader } from "@/components/document/document-header"
import { env } from "@/env"
import { useActiveUsers } from "@/hooks/use-active-users"
import { apiGet, authHeaders } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"

const COLLABORATORS_META_KEY = "collaboratorsVersion"

interface DocumentPageClientProps {
  documentId: string
  email: string
  token: string
}

export function DocumentPageClient({ documentId, email, token }: DocumentPageClientProps) {
  const [document, setDocument] = useState<DocumentDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

  const currentUser = document?.collaborators.find((c) => c.email === email)
  const activeEmails = useActiveUsers(provider)

  const fetchDocument = useCallback(async () => {
    try {
      const data = await apiGet(API_ROUTES.documents.get(documentId), documentDetailsSchema, {
        headers: authHeaders(email, token)
      })
      setDocument(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document")
    } finally {
      setLoading(false)
    }
  }, [documentId, email, token])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  // Create the Hocuspocus provider once we have a valid user.
  // IMPORTANT: depend on primitives (email), not on the currentUser object —
  // otherwise every re-render creates a fresh provider and edits never persist.
  const currentUserEmail = currentUser?.email
  useEffect(() => {
    if (!currentUserEmail) return

    const hocuspocusProvider = new HocuspocusProvider({
      url: `${env.NEXT_PUBLIC_WS_URL}/collaboration`,
      name: documentId,
      token: `${currentUserEmail}|${token}`,
      onStatus({ status }) {
        setConnected(status === "connected")
      }
    })

    setProvider(hocuspocusProvider)

    return () => {
      hocuspocusProvider.destroy()
      setProvider(null)
      setConnected(false)
    }
  }, [documentId, token, currentUserEmail])

  // Listen for collaborator-list changes broadcast from other clients via Yjs meta
  useEffect(() => {
    if (!provider) return
    const meta = provider.document.getMap("meta")
    let lastVersion = (meta.get(COLLABORATORS_META_KEY) as number | undefined) ?? 0

    const observer = () => {
      const version = (meta.get(COLLABORATORS_META_KEY) as number | undefined) ?? 0
      if (version !== lastVersion) {
        lastVersion = version
        fetchDocument()
      }
    }

    meta.observe(observer)
    return () => meta.unobserve(observer)
  }, [provider, fetchDocument])

  const notifyCollaboratorsChanged = useCallback(() => {
    if (!provider) return
    const meta = provider.document.getMap("meta")
    const current = (meta.get(COLLABORATORS_META_KEY) as number | undefined) ?? 0
    meta.set(COLLABORATORS_META_KEY, current + 1)
  }, [provider])

  const handleCollaboratorsUpdate = useCallback(
    (collaborators: Collaborator[]) => {
      setDocument((prev) => (prev ? { ...prev, collaborators } : prev))
      notifyCollaboratorsChanged()
    },
    [notifyCollaboratorsChanged]
  )

  const handleFinalizedChange = useCallback(
    (finalized: boolean) => {
      // Optimistic local update; we always refetch shortly via the version bump
      // so the canonical state will be re-applied from the server (incl. finalizedBy/At).
      setDocument((prev) => (prev ? { ...prev, finalized } : prev))
      notifyCollaboratorsChanged()
      // Trigger another refetch after a short delay so we pick up the
      // server-side finalizedBy/finalizedAt audit fields and let the closed
      // WS connections from the server-side closeConnections reconnect.
      setTimeout(fetchDocument, 400)
    },
    [notifyCollaboratorsChanged, fetchDocument]
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading document...</p>
      </div>
    )
  }

  if (error || !document || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">{error || "Access denied"}</p>
          <a href="/" className="text-sm text-muted-foreground underline">
            Go back home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <DocumentHeader
        document={document}
        currentUser={currentUser}
        connected={connected}
        activeEmails={activeEmails}
        token={token}
        provider={provider}
        onCollaboratorsUpdate={handleCollaboratorsUpdate}
        onFinalizedChange={handleFinalizedChange}
      />
      <DocumentEditor
        documentId={documentId}
        token={token}
        currentUser={currentUser}
        collaborators={document.collaborators}
        provider={provider}
        connected={connected}
        activeEmails={activeEmails}
        finalized={document.finalized}
      />
    </div>
  )
}
