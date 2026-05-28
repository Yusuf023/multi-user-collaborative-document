"use client"

import type { Collaborator, DocumentDetails } from "@collab/shared"
import type { HocuspocusProvider } from "@hocuspocus/provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { ActiveUsers } from "./active-users"
import { ApproveButton } from "./approve-button"
import { ConnectionStatus } from "./connection-status"
import { DocumentTitle } from "./document-title"
import { FinalizeButton } from "./finalize-button"
import { InviteDialog } from "./invite-dialog"
import { RoleManager } from "./role-manager"
import { SendMenu } from "./send/send-menu"

interface DocumentHeaderProps {
  document: DocumentDetails
  currentUser: Collaborator
  connected: boolean
  activeEmails: string[]
  token: string
  provider: HocuspocusProvider | null
  onCollaboratorsUpdate: (collaborators: Collaborator[]) => void
  onFinalizedChange: (finalized: boolean) => void
  onApprovedChange: (approved: boolean) => void
}

export function DocumentHeader({
  document,
  currentUser,
  connected,
  activeEmails,
  token,
  provider,
  onCollaboratorsUpdate,
  onFinalizedChange,
  onApprovedChange
}: DocumentHeaderProps) {
  const isPrivileged = currentUser.role === "owner" || currentUser.role === "editor"
  // Title editing is blocked when the document is finalized
  const canEditTitle = isPrivileged && !document.finalized
  // The send dropdown is for owners/editors once the doc is locked; reviewers
  // get an Approve action instead.
  const canSend = isPrivileged && document.finalized
  const canApprove = currentUser.role === "reviewer" && document.finalized && !document.approved

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
        <ConnectionStatus
          connected={connected}
          finalized={document.finalized}
          approved={document.approved}
        />
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
        {isPrivileged && (
          <InviteDialog
            documentId={document.id}
            token={token}
            currentUser={currentUser}
            onInvited={onCollaboratorsUpdate}
          />
        )}
        {canSend && (
          <SendMenu
            documentId={document.id}
            token={token}
            currentUser={currentUser}
            onInvited={onCollaboratorsUpdate}
          />
        )}
        {canApprove && (
          <ApproveButton
            documentId={document.id}
            token={token}
            currentUserEmail={currentUser.email}
            onApproved={() => onApprovedChange(true)}
          />
        )}
        {isPrivileged && (
          <FinalizeButton
            documentId={document.id}
            token={token}
            currentUserEmail={currentUser.email}
            finalized={document.finalized}
            onFinalized={onFinalizedChange}
          />
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
