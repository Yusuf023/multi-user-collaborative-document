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
  finalized: boolean
}

export function DocumentEditor({
  documentId,
  token,
  currentUser,
  collaborators,
  provider,
  connected,
  activeEmails,
  finalized
}: DocumentEditorProps) {
  const [selectedText, setSelectedText] = useState("")
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  // Comment draft is opened ONLY by an explicit click on the floating button —
  // never just by selecting text (selection has many other uses: bold, copy,
  // etc.). The same floating button also updates an existing draft's target
  // text/range so the user can re-aim their comment without losing what they
  // already typed. The draft persists until the user submits or closes it.
  const [commentDraft, setCommentDraft] = useState<{
    quotedText: string
    range: { from: number; to: number }
  } | null>(null)

  const handleSelectionChange = (text: string) => {
    setSelectedText(text)
  }

  const openOrUpdateDraft = (quotedText: string, range: { from: number; to: number }) => {
    setCommentDraft({ quotedText, range })
  }

  const closeDraft = () => setCommentDraft(null)

  const { comments, notifyCommentsChanged } = useCommentsSync(
    provider,
    documentId,
    currentUser.email,
    token
  )

  // Finalized documents are fully locked — no edits, no comments, regardless of role
  const canEdit = !finalized && (currentUser.role === "owner" || currentUser.role === "editor")
  const canComment = !finalized && currentUser.role !== "viewer"

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
              onSelectionChange={handleSelectionChange}
              onEditorReady={setEditorInstance}
              connected={connected}
            />
          )}
          {canComment && selectedText && editorInstance && (
            <FloatingCommentButton editor={editorInstance} onRequestComment={openOrUpdateDraft} />
          )}
        </div>
      </div>

      <CommentsPanel
        documentId={documentId}
        token={token}
        comments={comments}
        currentUser={currentUser}
        canComment={canComment}
        commentDraft={commentDraft}
        onCommentAdded={notifyCommentsChanged}
        onDraftClose={closeDraft}
        collaborators={collaborators}
        activeEmails={activeEmails}
        editor={editorInstance}
      />
    </div>
  )
}
