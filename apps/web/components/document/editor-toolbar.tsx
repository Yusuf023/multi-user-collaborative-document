"use client"

import type { Editor } from "@tiptap/react"
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"

interface EditorToolbarProps {
  editor: Editor | null
  canEdit: boolean
}

export function EditorToolbar({ editor, canEdit }: EditorToolbarProps) {
  const [, forceUpdate] = useState(0)

  // Re-render toolbar when editor state changes
  useEffect(() => {
    if (!editor) return
    const update = () => forceUpdate((n) => n + 1)
    editor.on("selectionUpdate", update)
    editor.on("transaction", update)
    return () => {
      editor.off("selectionUpdate", update)
      editor.off("transaction", update)
    }
  }, [editor])

  const toggle = useCallback(
    (command: () => void) => {
      if (editor) command()
    },
    [editor]
  )

  if (!canEdit) {
    return (
      <div className="flex items-center gap-1 border-b px-4 py-2">
        <span className="text-xs text-muted-foreground">Read only</span>
      </div>
    )
  }

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor?.isActive(name, attrs) ?? false

  return (
    <div className="flex items-center gap-1 border-b px-4 py-2">
      <Toggle
        size="sm"
        aria-label="Bold"
        pressed={isActive("bold")}
        onPressedChange={() => toggle(() => editor?.chain().focus().toggleBold().run())}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Italic"
        pressed={isActive("italic")}
        onPressedChange={() => toggle(() => editor?.chain().focus().toggleItalic().run())}
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Underline"
        pressed={isActive("underline")}
        onPressedChange={() => toggle(() => editor?.chain().focus().toggleUnderline().run())}
      >
        <Underline className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Strikethrough"
        pressed={isActive("strike")}
        onPressedChange={() => toggle(() => editor?.chain().focus().toggleStrike().run())}
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        aria-label="Heading 1"
        pressed={isActive("heading", { level: 1 })}
        onPressedChange={() =>
          toggle(() => editor?.chain().focus().toggleHeading({ level: 1 }).run())
        }
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Heading 2"
        pressed={isActive("heading", { level: 2 })}
        onPressedChange={() =>
          toggle(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())
        }
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        aria-label="Bullet List"
        pressed={isActive("bulletList")}
        onPressedChange={() => toggle(() => editor?.chain().focus().toggleBulletList().run())}
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Ordered List"
        pressed={isActive("orderedList")}
        onPressedChange={() => toggle(() => editor?.chain().focus().toggleOrderedList().run())}
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
    </div>
  )
}
