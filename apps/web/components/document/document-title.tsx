"use client"

import { TITLE_MAX_LENGTH } from "@collab/shared"
import type { HocuspocusProvider } from "@hocuspocus/provider"
import { Check, Pencil, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiPatch, authHeaders } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"

const TITLE_META_KEY = "title"

interface DocumentTitleProps {
  documentId: string
  initialTitle: string
  provider: HocuspocusProvider | null
  currentUserEmail: string
  token: string
  canEdit: boolean
}

export function DocumentTitle({
  documentId,
  initialTitle,
  provider,
  currentUserEmail,
  token,
  canEdit
}: DocumentTitleProps) {
  const [title, setTitle] = useState(initialTitle)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialTitle)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Subscribe to remote title changes via Yjs meta map
  useEffect(() => {
    if (!provider) return
    const meta = provider.document.getMap("meta")

    const applyRemote = () => {
      const remote = meta.get(TITLE_META_KEY)
      if (typeof remote === "string" && remote.length > 0) {
        setTitle(remote)
      }
    }

    // Hydrate from Yjs if a newer title is already in the doc
    applyRemote()

    meta.observe(applyRemote)
    return () => meta.unobserve(applyRemote)
  }, [provider])

  // Focus input on enter edit
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const startEdit = () => {
    setDraft(title)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(title)
  }

  const saveEdit = async () => {
    const next = draft.trim()
    if (!next) {
      toast.error("Title cannot be empty")
      return
    }
    if (next === title) {
      setEditing(false)
      return
    }
    if (next.length > TITLE_MAX_LENGTH) {
      toast.error(`Title must be ${TITLE_MAX_LENGTH} characters or less`)
      return
    }

    setSaving(true)
    try {
      // Persist to DB
      await apiPatch(API_ROUTES.documents.updateTitle, { documentId, title: next }, undefined, {
        headers: authHeaders(currentUserEmail, token)
      })

      // Broadcast to other clients via Yjs
      if (provider) {
        provider.document.getMap("meta").set(TITLE_META_KEY, next)
      }

      setTitle(next)
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update title")
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={TITLE_MAX_LENGTH}
          disabled={saving}
          className="h-8 max-w-xs text-sm font-medium"
          aria-label="Document title"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={saveEdit}
          disabled={saving}
          aria-label="Save title"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={cancelEdit}
          disabled={saving}
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1 min-w-0">
      <h1 className="truncate text-sm font-medium" title={title}>
        {title}
      </h1>
      {canEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={startEdit}
          aria-label="Rename document"
          className="-translate-x-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 delay-100"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
