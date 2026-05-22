"use client"

import type { Editor } from "@tiptap/react"
import { MessageSquarePlus } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface FloatingCommentButtonProps {
  editor: Editor
}

export function FloatingCommentButton({ editor }: FloatingCommentButtonProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const updatePosition = () => {
      const { from, to } = editor.state.selection
      if (from === to) {
        setPosition(null)
        return
      }

      const coords = editor.view.coordsAtPos(to)
      const editorRect = editor.view.dom.closest(".overflow-y-auto")?.getBoundingClientRect()
      if (!editorRect) {
        setPosition(null)
        return
      }

      setPosition({
        top: coords.top - editorRect.top + 4,
        left: coords.left - editorRect.left + 8
      })
    }

    editor.on("selectionUpdate", updatePosition)
    return () => {
      editor.off("selectionUpdate", updatePosition)
    }
  }, [editor])

  if (!position) return null

  return (
    <Button
      size="icon"
      variant="outline"
      className="absolute z-10 h-7 w-7 rounded-full shadow-md bg-background"
      style={{ top: position.top, left: position.left }}
      aria-label="Add comment on selected text"
      title="Add comment"
      onClick={() => {
        const panel = document.querySelector("[data-comments-panel]")
        const input = panel?.querySelector("input")
        input?.focus()
        input?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }}
    >
      <MessageSquarePlus className="h-3.5 w-3.5" />
    </Button>
  )
}
