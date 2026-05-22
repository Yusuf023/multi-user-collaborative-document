"use client"

import type { Collaborator, InvitableRole } from "@collab/shared"
import { INVITABLE_ROLES } from "@collab/shared"
import { Settings2, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { apiDelete, apiPatch, authHeaders } from "@/lib/api-client"
import { API_ROUTES } from "@/lib/api-routes"
import { getInitials } from "@/lib/utils"

interface RoleManagerProps {
  documentId: string
  token: string
  currentUser: Collaborator
  collaborators: Collaborator[]
  onUpdated: (collaborators: Collaborator[]) => void
}

export function RoleManager({
  documentId,
  token,
  currentUser,
  collaborators,
  onUpdated
}: RoleManagerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const handleRoleChange = async (email: string, newRole: InvitableRole) => {
    setLoading(email)
    try {
      await apiPatch(
        API_ROUTES.documents.updateRole,
        { documentId, email, role: newRole },
        undefined,
        { headers: authHeaders(currentUser.email, token) }
      )
      const updated = collaborators.map((c) => (c.email === email ? { ...c, role: newRole } : c))
      onUpdated(updated)
      toast.success(`Updated ${email} to ${newRole}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role")
    } finally {
      setLoading(null)
    }
  }

  const handleRemove = async (email: string) => {
    setLoading(email)
    try {
      await apiDelete(
        API_ROUTES.documents.removeCollaborator,
        { documentId, email },
        { headers: authHeaders(currentUser.email, token) }
      )
      const updated = collaborators.filter((c) => c.email !== email)
      onUpdated(updated)
      toast.success(`Removed ${email}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove collaborator")
    } finally {
      setLoading(null)
    }
  }

  // Owner can manage everyone else; owners themselves are never editable/removable here.
  const manageable = collaborators.filter(
    (c) => c.email !== currentUser.email && c.role !== "owner"
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <Settings2 className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage collaborators</DialogTitle>
          <DialogDescription>
            Change roles or remove people from this document. Only the owner can do this.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {manageable.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No other collaborators yet.
            </p>
          ) : (
            manageable.map((collab) => (
              <div key={collab.email} className="flex items-center gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback
                    className="text-[10px]"
                    style={{ backgroundColor: collab.color, color: "#fff" }}
                  >
                    {getInitials(collab.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm truncate" title={collab.email}>
                  {collab.email}
                </span>
                <Select
                  value={collab.role}
                  onValueChange={(val) => handleRoleChange(collab.email, val as InvitableRole)}
                  disabled={loading === collab.email}
                >
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="text-xs capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(collab.email)}
                  disabled={loading === collab.email}
                  aria-label={`Remove ${collab.email}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
