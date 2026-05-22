"use client"

import type { Collaborator, DocumentDetails } from "@collab/shared"
import type { HocuspocusProvider } from "@hocuspocus/provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { ActiveUsers } from "./active-users"
import { ConnectionStatus } from "./connection-status"
import { DocumentTitle } from "./document-title"
import { InviteDialog } from "./invite-dialog"
import { RoleManager } from "./role-manager"

interface DocumentHeaderProps {
  document: DocumentDetails
  currentUser: Collaborator
  connected: boolean
  activeEmails: string[]
  token: string
  provider: HocuspocusProvider | null
  onCollaboratorsUpdate: (collaborators: Collaborator[]) => void
}

export function DocumentHeader({
  document,
  currentUser,
  connected,
  activeEmails,
  token,
  provider,
  onCollaboratorsUpdate
}: DocumentHeaderProps) {
  const canEditTitle = currentUser.role === "owner" || currentUser.role === "editor"

  return (
    <header className="flex items-center justify-between border-b px-4 py-3 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <DocumentTitle
          documentId={document.id}
          initialTitle={document.title}
          provider={provider}
          currentUserEmail={currentUser.email}
          token={token}
          canEdit={canEditTitle}
        />
        <ConnectionStatus connected={connected} />
      </div>

      <div className="flex items-center gap-3 shrink-0">
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
