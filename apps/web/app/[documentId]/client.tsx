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

  // Create the Hocuspocus provider once we have a valid user
  useEffect(() => {
    if (!currentUser) return

    const hocuspocusProvider = new HocuspocusProvider({
      url: `${env.NEXT_PUBLIC_WS_URL}/collaboration`,
      name: documentId,
      token: `${currentUser.email}|${token}`,
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
  }, [documentId, token, currentUser])

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
        onCollaboratorsUpdate={(collaborators: Collaborator[]) =>
          setDocument({ ...document, collaborators })
        }
      />
      <DocumentEditor
        documentId={documentId}
        token={token}
        currentUser={currentUser}
        collaborators={document.collaborators}
        provider={provider}
        connected={connected}
        activeEmails={activeEmails}
      />
    </div>
  )
}
