"use client"

import type { Editor } from "@tiptap/react"
import { MessageSquarePlus } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface FloatingCommentButtonProps {
  editor: Editor
  /**
   * Called when the user clicks the button to open OR update a draft.
   * Receives the currently-selected text and its range so the draft can be
   * anchored to exactly what the user was looking at when they clicked.
   */
  onRequestComment: (quotedText: string, range: { from: number; to: number }) => void
}

export function FloatingCommentButton({ editor, onRequestComment }: FloatingCommentButtonProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const updatePosition = () => {
      // ProseMirror keeps the internal selection alive even when DOM focus
      // moves away from the editor (e.g., the user clicks into the comments
      // input). Hide the button in that case — the user has moved on.
      if (!editor.isFocused) {
        setPosition(null)
        return
      }

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

      // Position the button ABOVE the line where the selection ends, slightly
      // to the right of the last selected char. Placing it below was
      // overlapping the next word and obscuring it.
      // Button is h-7 (28px) + 4px gap = 32px above the line top.
      setPosition({
        top: coords.top - editorRect.top - 32,
        left: coords.left - editorRect.left + 4
      })
    }

    // Compute immediately on mount — important for double-click selection,
    // where the selectionUpdate event fires BEFORE this component mounts.
    updatePosition()

    editor.on("selectionUpdate", updatePosition)
    editor.on("focus", updatePosition)
    editor.on("blur", () => setPosition(null))
    return () => {
      editor.off("selectionUpdate", updatePosition)
      editor.off("focus", updatePosition)
      editor.off("blur")
    }
  }, [editor])

  if (!position) return null

  return (
    <Button
      size="icon"
      variant="outline"
      // bg-popover is a solid surface color in both themes.
      // !important overrides the outline variant's translucent `dark:bg-input/30`.
      className="absolute z-10 h-7 w-7 rounded-full bg-popover! shadow-md hover:bg-muted!"
      style={{ top: position.top, left: position.left }}
      aria-label="Add comment on selected text"
      title="Add comment"
      // Prevent the mousedown from blurring the editor — otherwise our blur
      // handler would unmount this button before the click handler fires.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        const { from, to } = editor.state.selection
        if (from === to) return
        const text = editor.state.doc.textBetween(from, to, " ")
        // Open the draft (or update an existing draft's target text/range)
        onRequestComment(text, { from, to })

        // Focus the input in the side panel so the user can start typing
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
