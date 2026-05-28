"use client"

import { ShieldCheck } from "lucide-react"
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
import { apiPatch, authHeaders } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"

interface ApproveButtonProps {
  documentId: string
  token: string
  currentUserEmail: string
  onApproved: () => void
}

export function ApproveButton({
  documentId,
  token,
  currentUserEmail,
  onApproved
}: ApproveButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await apiPatch(API_ROUTES.documents.approve, { documentId }, undefined, {
        headers: authHeaders(currentUserEmail, token)
      })
      onApproved()
      toast.success("Document approved")
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve document")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
        Approve
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as approved?</DialogTitle>
          <DialogDescription>
            Confirm that you have reviewed this finalised document and approve it. This will be
            visible to all collaborators.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Approving..." : "Approve"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
