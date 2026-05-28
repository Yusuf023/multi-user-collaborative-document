"use client"

import type { Collaborator, DocumentDetails } from "@collab/shared"
import { documentDetailsSchema } from "@collab/shared"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { ShieldAlert } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { DocumentEditor } from "@/components/document/document-editor"
import { DocumentHeader } from "@/components/document/document-header"
import { Button } from "@/components/ui/button"
import { GradientIcon } from "@/components/ui/gradient-icon"
import { env } from "@/env"
import { useActiveUsers } from "@/hooks/use-active-users"
import { apiGet, authHeaders } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"

const COLLABORATORS_META_KEY = "collaboratorsVersion"
const FINALIZED_META_KEY = "finalized"
const APPROVED_META_KEY = "approved"

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

  // Observe Yjs meta for changes broadcast by other clients:
  //  - collaboratorsVersion: a counter that triggers a document refetch
  //  - finalized: a boolean that directly drives the read-only state
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

      const finalized = meta.get(FINALIZED_META_KEY)
      if (typeof finalized === "boolean") {
        setDocument((prev) =>
          prev && prev.finalized !== finalized ? { ...prev, finalized } : prev
        )
      }

      const approved = meta.get(APPROVED_META_KEY)
      if (typeof approved === "boolean") {
        setDocument((prev) => (prev && prev.approved !== approved ? { ...prev, approved } : prev))
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
      // Reopening clears approval (server resets the DB flag too).
      setDocument((prev) =>
        prev ? { ...prev, finalized, approved: finalized ? prev.approved : false } : prev
      )
      // Drive every other connected client instantly via booleans in the Yjs
      // meta map (same mechanism as the title). The observer above applies them.
      const meta = provider?.document.getMap("meta")
      meta?.set(FINALIZED_META_KEY, finalized)
      if (!finalized) meta?.set(APPROVED_META_KEY, false)
    },
    [provider]
  )

  const handleApprovedChange = useCallback((approved: boolean) => {
    // Optimistic local feedback for the reviewer. The reviewer's WS connection
    // is read-only, so the authoritative broadcast comes from the server (the
    // approve controller writes meta.approved); the observer above applies it
    // for every client, including this one.
    setDocument((prev) => (prev ? { ...prev, approved } : prev))
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading document...</p>
      </main>
    )
  }

  if (error || !document || !currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <GradientIcon color="#ef4444" size="xl">
              <ShieldAlert className="size-7 text-foreground" strokeWidth={1.75} />
            </GradientIcon>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Access denied</h1>
            <p className="text-sm text-muted-foreground">
              {error || "You do not have access to this document. Ask the owner to invite you."}
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Go back home</Button>
          </Link>
        </div>
      </main>
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
        onApprovedChange={handleApprovedChange}
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
