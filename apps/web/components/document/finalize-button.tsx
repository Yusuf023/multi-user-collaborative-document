"use client"

import { Lock, Unlock } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { apiPatch, authHeaders } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"

interface FinalizeButtonProps {
  documentId: string
  token: string
  currentUserEmail: string
  finalized: boolean
  onFinalized: (finalized: boolean) => void
}

export function FinalizeButton({
  documentId,
  token,
  currentUserEmail,
  finalized,
  onFinalized
}: FinalizeButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await apiPatch(
        API_ROUTES.documents.finalize,
        { documentId, finalized: !finalized },
        undefined,
        { headers: authHeaders(currentUserEmail, token) }
      )
      onFinalized(!finalized)
      toast.success(finalized ? "Document reopened" : "Document finalised")
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update document")
    } finally {
      setLoading(false)
    }
  }

  // Reopening is reversible and low-stakes — skip confirm and call directly
  if (finalized) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={<Button size="sm" variant="default" onClick={submit} disabled={loading} />}
        >
          <Unlock className="mr-1.5 h-3.5 w-3.5" />
          Reopen
        </TooltipTrigger>
        <TooltipContent>Reopen this document for further changes</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Finalise
            </DialogTrigger>
          }
        />
        <TooltipContent>
          Lock this document. No further edits, comments, or title changes will be allowed.
        </TooltipContent>
      </Tooltip>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Finalise this document?</DialogTitle>
          <DialogDescription>
            Once finalised, this document becomes read-only for everyone. No edits, comments, or
            title changes will be allowed until it is reopened. You and other owners/editors can
            reopen it at any time.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Finalising..." : "Finalise"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
