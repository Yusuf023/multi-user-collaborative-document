"use client"

import type { Collaborator } from "@collab/shared"
import { HocuspocusProvider } from "@hocuspocus/provider"
import type { Editor } from "@tiptap/react"
import { useCallback, useEffect, useState } from "react"
import { env } from "@/env"
import { useActiveUsers } from "@/hooks/use-active-users"
import { useCommentsSync } from "@/hooks/use-comments-sync"
import { CommentsPanel } from "./comments-panel"
import { EditorToolbar } from "./editor-toolbar"
import { FloatingCommentButton } from "./floating-comment-button"
import { TiptapEditor } from "./tiptap-editor"

interface DocumentEditorProps {
  documentId: string
  token: string
  currentUser: Collaborator
  collaborators: Collaborator[]
  onConnectionChange: (connected: boolean) => void
  onActiveUsersChange: (emails: string[]) => void
}

export function DocumentEditor({
  documentId,
  token,
  currentUser,
  collaborators,
  onConnectionChange,
  onActiveUsersChange
}: DocumentEditorProps) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [connected, setConnected] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)

  const activeEmails = useActiveUsers(provider)
  const { comments, notifyCommentsChanged } = useCommentsSync(
    provider,
    documentId,
    currentUser.email,
    token
  )

  useEffect(() => {
    onActiveUsersChange(activeEmails)
  }, [activeEmails, onActiveUsersChange])

  const onConnectionChangeStable = useCallback(
    (isConnected: boolean) => {
      setConnected(isConnected)
      onConnectionChange(isConnected)
    },
    [onConnectionChange]
  )

  useEffect(() => {
    const hocuspocusProvider = new HocuspocusProvider({
      url: `${env.NEXT_PUBLIC_WS_URL}/collaboration`,
      name: documentId,
      token: `${currentUser.email}|${token}`,
      onStatus({ status }) {
        onConnectionChangeStable(status === "connected")
      }
    })

    setProvider(hocuspocusProvider)

    return () => {
      hocuspocusProvider.destroy()
    }
  }, [documentId, token, currentUser.email, onConnectionChangeStable])

  const canEdit = currentUser.role === "owner" || currentUser.role === "editor"
  const canComment = currentUser.role !== "viewer"

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="relative flex flex-1 flex-col">
        <EditorToolbar editor={editorInstance} canEdit={canEdit} />
        <div className="flex-1 overflow-y-auto relative">
          {provider && (
            <TiptapEditor
              provider={provider}
              currentUser={currentUser}
              canEdit={canEdit}
              onSelectionChange={setSelectedText}
              onEditorReady={setEditorInstance}
              connected={connected}
            />
          )}
          {canComment && selectedText && editorInstance && (
            <FloatingCommentButton editor={editorInstance} />
          )}
        </div>
      </div>

      <CommentsPanel
        documentId={documentId}
        token={token}
        comments={comments}
        currentUser={currentUser}
        canComment={canComment}
        selectedText={selectedText}
        onCommentAdded={notifyCommentsChanged}
        collaborators={collaborators}
        activeEmails={activeEmails}
      />
    </div>
  )
}
