"use client"

import type { Collaborator, DocumentDetails } from "@collab/shared"
import { ThemeToggle } from "@/components/theme-toggle"
import { ActiveUsers } from "./active-users"
import { ConnectionStatus } from "./connection-status"
import { InviteDialog } from "./invite-dialog"
import { RoleManager } from "./role-manager"

interface DocumentHeaderProps {
  document: DocumentDetails
  currentUser: Collaborator
  connected: boolean
  activeEmails: string[]
  token: string
  onCollaboratorsUpdate: (collaborators: Collaborator[]) => void
}

export function DocumentHeader({
  document,
  currentUser,
  connected,
  activeEmails,
  token,
  onCollaboratorsUpdate
}: DocumentHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-medium text-muted-foreground">Document</h1>
        <ConnectionStatus connected={connected} />
      </div>

      <div className="flex items-center gap-3">
        <ActiveUsers
          collaborators={document.collaborators}
          currentUserEmail={currentUser.email}
          activeEmails={activeEmails}
        />
        {currentUser.role === "owner" && (
          <RoleManager
            documentId={document.id}
            token={token}
            currentUser={currentUser}
            collaborators={document.collaborators}
            onUpdated={onCollaboratorsUpdate}
          />
        )}
        {(currentUser.role === "owner" || currentUser.role === "editor") && (
          <InviteDialog
            documentId={document.id}
            token={token}
            currentUser={currentUser}
            onInvited={onCollaboratorsUpdate}
          />
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
