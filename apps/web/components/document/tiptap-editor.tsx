"use client"

import type { Collaborator } from "@collab/shared"
import type { HocuspocusProvider } from "@hocuspocus/provider"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCaret from "@tiptap/extension-collaboration-caret"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import type { Editor } from "@tiptap/react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect } from "react"

interface TiptapEditorProps {
  provider: HocuspocusProvider
  currentUser: Collaborator
  canEdit: boolean
  onSelectionChange: (text: string) => void
  onEditorReady: (editor: Editor) => void
  connected: boolean
}

export function TiptapEditor({
  provider,
  currentUser,
  canEdit,
  onSelectionChange,
  onEditorReady,
  connected
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: "Start typing..."
      }),
      Collaboration.configure({
        document: provider.document
      }),
      CollaborationCaret.configure({
        provider,
        user: {
          name: currentUser.email,
          color: currentUser.color
        }
      })
    ],
    editable: canEdit,
    onSelectionUpdate({ editor }) {
      const { from, to } = editor.state.selection
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, " ")
        onSelectionChange(text)
      } else {
        onSelectionChange("")
      }
    }
  })

  // Expose editor instance to parent
  useEffect(() => {
    if (editor) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Connecting to document...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <EditorContent editor={editor} className="tiptap" />
    </div>
  )
}
