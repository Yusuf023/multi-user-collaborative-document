"use client"

import type { Collaborator, Role } from "@collab/shared"
import { ROLES } from "@collab/shared"
import { Settings2 } from "lucide-react"
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
import { apiPatch, authHeaders } from "@/lib/api-client"
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

  const handleRoleChange = async (email: string, newRole: Role) => {
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

  const otherCollaborators = collaborators.filter((c) => c.email !== currentUser.email)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <Settings2 className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage roles</DialogTitle>
          <DialogDescription>
            Change collaborator roles. Only the owner can do this.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {otherCollaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No other collaborators yet.
            </p>
          ) : (
            otherCollaborators.map((collab) => (
              <div key={collab.email} className="flex items-center gap-3">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback
                    className="text-[10px]"
                    style={{ backgroundColor: collab.color, color: "#fff" }}
                  >
                    {getInitials(collab.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm truncate">{collab.email}</span>
                <Select
                  value={collab.role}
                  onValueChange={(val) => handleRoleChange(collab.email, val as Role)}
                  disabled={loading === collab.email}
                >
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r) => r !== "owner").map((role) => (
                      <SelectItem key={role} value={role} className="text-xs capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
