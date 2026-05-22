"use client"

import type { Collaborator } from "@collab/shared"
import type { HocuspocusProvider } from "@hocuspocus/provider"
import type { Editor } from "@tiptap/react"
import { useState } from "react"
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
  provider: HocuspocusProvider | null
  connected: boolean
  activeEmails: string[]
}

export function DocumentEditor({
  documentId,
  token,
  currentUser,
  collaborators,
  provider,
  connected,
  activeEmails
}: DocumentEditorProps) {
  const [selectedText, setSelectedText] = useState("")
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)

  const { comments, notifyCommentsChanged } = useCommentsSync(
    provider,
    documentId,
    currentUser.email,
    token
  )

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
